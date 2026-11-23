import type { Locator, Page } from '@playwright/test';

import type { ListResponse } from '../src/features/lists/adapter/out/http/generated/model/listResponse';
import { expect, test } from './fixtures';
import { item } from './fixtures/items';
import { BBQ, WEEK } from './fixtures/lists';

// M7 accessibility matrix (docs/accessibility.md, A11Y-27): every screen and state under the same five checks, in every
// Chromium project of the matrix (expanded, compact, medium, 320 px, dark, high contrast, forced colors):
//   1. axe WCAG 2.2 AA + adopted AAA contrast (`expectAccessible`)
//   2. touch targets of at least 48 x 48 px (NFR-A11Y-05)
//   3. a second run of the same screen with 200 % text size and WCAG 1.4.12 text spacing set from the start, as a
//      reader's own settings are, without overflow or clipped text (NFR-A11Y-06)
//   4. focus is never hidden behind another element while tabbing through the screen (2.4.11, NFR-A11Y-02)
// Reduced motion is the default of every project (`reducedMotion: 'reduce'`); one test proves that it takes effect.
// The tag set puts the file into all projects (`@responsive`, `@theme`, `@shell`).

const SHOP: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000e1',
  name: 'Wocheneinkauf',
  openCount: 3,
  revision: 3,
};
const MILK = item('1', '2× Milch, laktosefrei', false, 1);
const BREAD = item('2', 'Vollkornbrot', false, 2);
const EGGS = item('3', '6 Eier', false, 3);
const BUTTER = item('4', 'Butter', true, 4);
const SHOP_ITEMS = { items: { [SHOP.id]: [MILK, BREAD, EGGS, BUTTER] } };
const URL = `/listen/${SHOP.id}`;

const INTERACTIVE =
  'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="link"]';

/** Interactive elements that are visible and smaller than 48 x 48 px (NFR-A11Y-05). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => visible(el) && !el.closest('.cdk-visually-hidden, [aria-hidden="true"]'))
      .filter((el) => {
        // the hit area: Material's invisible 48 px touch target of a button, the whole form field around an input, or the
        // labelled row around a native checkbox or radio
        const target =
          el.querySelector('.mat-mdc-button-touch-target') ??
          el.closest('.mat-mdc-form-field-flex, .mat-mdc-text-field-wrapper') ??
          (el.matches('input[type="checkbox"], input[type="radio"]')
            ? (el.closest('label, .mdc-form-field, .mat-mdc-checkbox, .mat-mdc-radio-button, .mat-mdc-list-item') ?? el)
            : el);
        const rect = target.getBoundingClientRect();
        return rect.width < 47.5 || rect.height < 47.5;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const name = el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 30);
        return `${el.tagName.toLowerCase()} "${name}" ${String(Math.round(rect.width))}x${String(Math.round(rect.height))}`;
      });
  }, INTERACTIVE);
}

/** Tabs through the screen: each focused element is inside the viewport and not covered by another element (2.4.11). */
async function expectFocusNeverObscured(page: Page, stops = 40): Promise<void> {
  const obscured: string[] = [];
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press('Tab');
    const problem = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused || focused === document.body) return null;
      focused.scrollIntoView({ block: 'nearest' });
      const rect = focused.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      // Material's own floating label lies on the empty field it belongs to: the same control, nothing foreign on top
      const sameField =
        !!top &&
        top.closest('mat-form-field') !== null &&
        top.closest('mat-form-field') === focused.closest('mat-form-field');
      const covered = !top || !(focused.contains(top) || top.contains(focused) || sameField);
      return covered
        ? `${focused.tagName.toLowerCase()} "${(focused.getAttribute('aria-label') ?? focused.textContent).trim().slice(0, 30)}" is covered by ${top?.tagName.toLowerCase() ?? 'nothing'}`
        : null;
    });
    if (problem) obscured.push(problem);
  }
  expect(obscured, 'focused elements hidden behind other content (WCAG 2.4.11)').toEqual([]);
}

/** The state under test is open: the checks of the normal run. */
async function expectScreen(
  page: Page,
  label: string,
  expectAccessible: (label: string) => Promise<void>,
  tabStops?: number,
): Promise<void> {
  await expectAccessible(label);
  expect(await smallTargets(page), `touch targets under 48 px in "${label}" (NFR-A11Y-05)`).toEqual([]);
  if (tabStops !== 0) await expectFocusNeverObscured(page, tabStops);
}

/** A reader's settings (WCAG 1.4.4, 1.4.12): present before the app starts, so Material measures its labels with them. */
async function scaleText(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent =
      'html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }';
    document.addEventListener('DOMContentLoaded', () => {
      document.head.append(style);
    });
  });
}

async function expandCartCardIfFolded(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /^Im Wagen/ });
  const folded = (await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false';
  if (folded) await toggle.click();
}

async function openModalDrawerIfNeeded(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1280) < 840) await page.getByRole('button', { name: 'Navigation öffnen' }).click();
}

interface Context {
  page: Page;
  sharingApi: { tokenOf: (listId: string) => string };
}

interface Screen {
  title: string;
  /** Opens the screen: navigation and clicks only; the assertions live in the test of `screen`. */
  open: (context: Context) => Promise<void>;
  /** The element that proves the screen is up, and how many of it there are. */
  ready: (page: Page) => Locator;
  count?: number;
  /** Label of the axe run, and the Tab stops of the focus walk (0 skips it). */
  label: string;
  tabStops?: number;
  /** Console errors the stubbed server provokes on purpose (404/401 reads, start-up failure). */
  errors?: RegExp;
}

/** Phone-sized windows skip the 200 % run: 200 % rem scaling there (narrow, or a landscape phone 390 px tall) is stricter than
 * NFR-A11Y-06, which names 320 px and 200 % text as separate conditions; 320 px is covered by stubbed-reflow. */
function skipsScaledRun(page: Page): boolean {
  const { width = 0, height = 0 } = page.viewportSize() ?? {};
  return width < 768 || height < 500;
}

/** Matches no console message: a screen without expected errors. */
const NO_EXPECTED_ERRORS = /^never expected$/u;

async function nothing(): Promise<void> {
  // the normal run changes nothing before the app starts
}

/** One screen, two runs: as it is, and with the reader's text size and spacing. */
function screen(definition: Screen): void {
  const { title, open, ready, label, tabStops, errors, count = 1 } = definition;
  const runs = [
    {
      name: title,
      scaled: false,
      prepare: nothing,
      check: (page: Page, expectAccessible: (label: string) => Promise<void>): Promise<void> =>
        expectScreen(page, label, expectAccessible, tabStops),
    },
    {
      name: `${title} at 200 % text size`,
      scaled: true,
      prepare: scaleText,
      check: (_page: Page, _expectAccessible: unknown, reflow: () => Promise<void>): Promise<void> => reflow(),
    },
  ];
  for (const run of runs) {
    test(run.name, async ({ page, expectErrors, sharingApi, expectAccessible, expectReflowAndTextSpacing }) => {
      // eslint-disable-next-line playwright/no-skipped-test -- by design: the 200 % run starts at 768 x 500 px (see skipsScaledRun)
      test.skip(run.scaled && skipsScaledRun(page), 'text size is checked from 768 x 500 px up');
      expectErrors(errors ?? NO_EXPECTED_ERRORS);
      await run.prepare(page);
      await open({ page, sharingApi });
      await expect(ready(page).first()).toBeVisible();
      await expect(ready(page)).toHaveCount(count);
      await run.check(page, expectAccessible, () => expectReflowAndTextSpacing());
    });
  }
}

const openSection = (page: Page): Locator => page.getByRole('region', { name: 'Noch zu kaufen' });
const dialogNamed =
  (name: string) =>
  (page: Page): Locator =>
    page.getByRole('dialog', { name });
const menu = async (page: Page, item?: string): Promise<void> => {
  await page.getByRole('button', { name: 'Weitere Optionen' }).click();
  if (item !== undefined) await page.getByRole('menuitem', { name: item }).click();
};

test.describe('list screens @responsive @theme @shell @a11y-matrix', () => {
  test.use({ initialLists: { lists: [SHOP, BBQ] }, initialItems: SHOP_ITEMS });

  screen({
    title: 'list with items',
    open: ({ page }) => page.goto(URL).then(nothing),
    ready: (page) => openSection(page).getByRole('checkbox'),
    count: 3,
    label: 'list with items',
  });

  screen({
    title: 'edit item dialog',
    open: async ({ page }) => {
      await page.goto(URL);
      await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();
    },
    ready: dialogNamed('Artikel bearbeiten'),
    label: 'edit item dialog',
    tabStops: 6,
  });

  screen({
    title: 'clear checked dialog',
    open: async ({ page }) => {
      await page.goto(URL);
      await openSection(page).waitFor(); // the cards appear with the items
      await expandCartCardIfFolded(page);
      await page.getByRole('button', { name: 'Erledigte entfernen' }).click();
    },
    ready: dialogNamed('Erledigte entfernen?'),
    label: 'clear checked dialog',
    tabStops: 6,
  });

  screen({
    title: 'list menu',
    open: async ({ page }) => {
      await page.goto(URL);
      await menu(page);
    },
    ready: (page) => page.getByRole('menu'),
    label: 'list menu',
    tabStops: 0,
  });

  screen({
    title: 'rename dialog',
    open: async ({ page }) => {
      await page.goto(URL);
      await menu(page, 'Liste umbenennen');
    },
    ready: dialogNamed('Liste umbenennen'),
    label: 'rename dialog',
    tabStops: 6,
  });

  screen({
    title: 'delete list dialog',
    open: async ({ page }) => {
      await page.goto(URL);
      await menu(page, 'Liste löschen');
    },
    ready: (page) => page.getByRole('dialog'),
    label: 'delete list dialog',
    tabStops: 6,
  });

  screen({
    title: 'share dialog',
    open: async ({ page }) => {
      await page.goto(URL);
      await page.getByRole('button', { name: 'Liste teilen' }).click();
    },
    ready: dialogNamed(`„${SHOP.name}“ teilen`),
    label: 'share dialog',
    tabStops: 6,
  });

  screen({
    title: 'renew link confirmation',
    open: async ({ page }) => {
      await page.goto(URL);
      await menu(page, 'Teilen-Link erneuern');
    },
    ready: dialogNamed('Teilen-Link erneuern?'),
    label: 'renew confirmation',
    tabStops: 6,
  });

  screen({
    title: 'modal or permanent drawer',
    open: async ({ page }) => {
      await page.goto(URL);
      await openModalDrawerIfNeeded(page);
    },
    ready: (page) => page.getByRole('navigation', { name: 'Hauptnavigation' }),
    label: 'drawer',
    tabStops: 8,
  });

  test('reduced motion: opening a dialog starts no running animation of noticeable length (NFR-A11Y-09)', async ({
    page,
  }) => {
    await page.goto(URL);
    await menu(page, 'Liste umbenennen');
    await expect(page.getByRole('dialog', { name: 'Liste umbenennen' })).toBeVisible();

    const longAnimations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => {
          const timing = animation.effect?.getComputedTiming();
          return animation.playState === 'running' && Number(timing?.duration ?? 0) > 50;
        })
        .map((animation) => animation.constructor.name),
    );
    expect(longAnimations, 'running animations over 50 ms with prefers-reduced-motion: reduce').toEqual([]);
  });
});

test.describe('empty and not-found screens @responsive @theme @shell @a11y-matrix', () => {
  screen({
    title: 'empty state',
    open: ({ page }) => page.goto('/').then(nothing),
    ready: (page) => page.getByRole('heading', { level: 2, name: 'Noch keine Listen' }),
    label: 'empty state',
  });

  screen({
    title: 'create list dialog',
    open: async ({ page }) => {
      await page.goto('/');
      await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
    },
    ready: dialogNamed('Neue Liste'),
    label: 'create list dialog',
    tabStops: 6,
  });

  test.describe('with lists', () => {
    test.use({ initialLists: { lists: [WEEK] } });

    screen({
      title: 'list that does not exist',
      open: ({ page }) => page.goto('/listen/00000000-0000-4000-8000-00000000dead').then(nothing),
      ready: (page) => page.getByRole('heading', { level: 1 }),
      label: 'list not found',
      errors: /status of 404/, // the stubbed 404 of the list read
    });
  });

  screen({
    title: 'start-up failure message',
    open: async ({ page }) => {
      await page.route('**/config.json', (route) => route.fulfill({ json: { environment: '' } }));
      await page.goto('/');
    },
    ready: (page) => page.getByRole('alert').filter({ hasText: 'konnte nicht gestartet werden' }),
    label: 'start-up failure',
    tabStops: 0,
    errors: /Bootstrap failed/,
  });
});

test.describe('settings and account @responsive @theme @shell @a11y-matrix', () => {
  screen({
    title: 'settings page',
    open: ({ page }) => page.goto('/einstellungen').then(nothing),
    ready: (page) => page.getByRole('heading', { level: 1, name: 'Einstellungen' }),
    label: 'settings page',
  });

  screen({
    title: 'delete account dialog',
    open: async ({ page }) => {
      await page.goto('/einstellungen');
      await page.getByRole('button', { name: 'Konto löschen' }).click();
    },
    ready: dialogNamed('Konto löschen?'),
    label: 'delete account dialog',
    tabStops: 6,
  });
});

test.describe('join pages @responsive @theme @shell @a11y-matrix', () => {
  test.describe('signed out', () => {
    test.use({ session: { signedIn: false }, initialLists: { lists: [BBQ] } });

    screen({
      title: 'invitation page',
      open: ({ page, sharingApi }) => page.goto(`/j/${sharingApi.tokenOf(BBQ.id)}`).then(nothing),
      ready: (page) => page.getByRole('heading', { level: 1, name: 'Liste beitreten' }),
      label: 'invitation page',
      tabStops: 6,
      errors: /status of 401/,
    });

    screen({
      title: 'invalid link page',
      open: ({ page }) => page.goto('/j/' + 'x'.repeat(43)).then(nothing),
      ready: (page) => page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' }),
      label: 'invalid link (signed out)',
      tabStops: 6,
      errors: /status of 401|status of 404/,
    });
  });
});
