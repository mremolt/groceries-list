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

interface Screen {
  page: Page;
  expectErrors: (pattern: RegExp) => void;
  sharingApi: { tokenOf: (listId: string) => string };
  /** Ends the test: the checks of the run (normal, or at 200 % text size). `tabStops` 0 skips the focus walk. */
  check: (label: string, tabStops?: number) => Promise<void>;
}

/** One screen, two runs: as it is, and with the reader's text size and spacing. */
function screen(title: string, body: (context: Screen) => Promise<void>): void {
  for (const scaled of [false, true]) {
    test(
      scaled ? `${title} at 200 % text size` : title,
      async ({ page, expectErrors, sharingApi, expectAccessible, expectReflowAndTextSpacing }) => {
        const { width = 0, height = 0 } = page.viewportSize() ?? {};
        // skipped on phone-sized windows: 200 % rem scaling there (narrow, or a landscape phone 390 px tall) is stricter than
        // NFR-A11Y-06, which names 320 px and 200 % text as separate conditions; 320 px is covered by stubbed-reflow
        test.skip(scaled && (width < 768 || height < 500), 'text size is checked from 768 x 500 px up');
        if (scaled) await scaleText(page);
        const check = scaled
          ? (): Promise<void> => expectReflowAndTextSpacing()
          : (label: string, tabStops?: number): Promise<void> => expectScreen(page, label, expectAccessible, tabStops);
        await body({ page, expectErrors, sharingApi, check });
      },
    );
  }
}

const openSection = (page: Page): Locator => page.getByRole('region', { name: 'Noch zu kaufen' });

test.describe('list screens @responsive @theme @shell @a11y-matrix', () => {
  test.use({ initialLists: { lists: [SHOP, BBQ] }, initialItems: SHOP_ITEMS });

  screen('list with items', async ({ page, check }) => {
    await page.goto(URL);
    await expect(openSection(page).getByRole('checkbox')).toHaveCount(3);
    await check('list with items');
  });

  screen('edit item dialog', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();
    await expect(page.getByRole('dialog', { name: 'Artikel bearbeiten' })).toBeVisible();
    await check('edit item dialog', 6);
  });

  screen('clear checked dialog', async ({ page, check }) => {
    await page.goto(URL);
    await expect(page.getByRole('region', { name: 'Noch zu kaufen' })).toBeVisible(); // the cards appear with the items
    const toggle = page.getByRole('button', { name: /^Im Wagen/ });
    if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
    await page.getByRole('button', { name: 'Erledigte entfernen' }).click();
    await expect(page.getByRole('dialog', { name: 'Erledigte entfernen?' })).toBeVisible();
    await check('clear checked dialog', 6);
  });

  screen('list menu', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await check('list menu', 0);
  });

  screen('rename dialog', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();
    await expect(page.getByRole('dialog', { name: 'Liste umbenennen' })).toBeVisible();
    await check('rename dialog', 6);
  });

  screen('delete list dialog', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste löschen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check('delete list dialog', 6);
  });

  screen('share dialog', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Liste teilen' }).click();
    await expect(page.getByRole('dialog', { name: `„${SHOP.name}“ teilen` })).toBeVisible();
    await check('share dialog', 6);
  });

  screen('renew link confirmation', async ({ page, check }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Teilen-Link erneuern' }).click();
    await expect(page.getByRole('dialog', { name: 'Teilen-Link erneuern?' })).toBeVisible();
    await check('renew confirmation', 6);
  });

  screen('modal or permanent drawer', async ({ page, check }) => {
    await page.goto(URL);
    if ((page.viewportSize()?.width ?? 1280) < 840)
      await page.getByRole('button', { name: 'Navigation öffnen' }).click();
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    await check('drawer', 8);
  });

  test('reduced motion: opening a dialog starts no running animation of noticeable length (NFR-A11Y-09)', async ({
    page,
  }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();
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
  screen('empty state and create list dialog', async ({ page, check }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
    await check('empty state');
  });

  screen('create list dialog', async ({ page, check }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
    await expect(page.getByRole('dialog', { name: 'Neue Liste' })).toBeVisible();
    await check('create list dialog', 6);
  });

  test.describe('with lists', () => {
    test.use({ initialLists: { lists: [WEEK] } });

    screen('list that does not exist', async ({ page, expectErrors, check }) => {
      expectErrors(/status of 404/); // the stubbed 404 of the list read
      await page.goto('/listen/00000000-0000-4000-8000-00000000dead');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await check('list not found');
    });
  });

  screen('start-up failure message', async ({ page, expectErrors, check }) => {
    expectErrors(/Bootstrap failed/);
    await page.route('**/config.json', (route) => route.fulfill({ json: { environment: '' } }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('konnte nicht gestartet werden');
    await check('start-up failure', 0);
  });
});

test.describe('settings and account @responsive @theme @shell @a11y-matrix', () => {
  screen('settings page', async ({ page, check }) => {
    await page.goto('/einstellungen');
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await check('settings page');
  });

  screen('delete account dialog', async ({ page, check }) => {
    await page.goto('/einstellungen');
    await page.getByRole('button', { name: 'Konto löschen' }).click();
    await expect(page.getByRole('dialog', { name: 'Konto löschen?' })).toBeVisible();
    await check('delete account dialog', 6);
  });
});

test.describe('join pages @responsive @theme @shell @a11y-matrix', () => {
  test.describe('signed out', () => {
    test.use({ session: { signedIn: false }, initialLists: { lists: [BBQ] } });

    screen('invitation page', async ({ page, sharingApi, expectErrors, check }) => {
      expectErrors(/status of 401/);
      await page.goto(`/j/${sharingApi.tokenOf(BBQ.id)}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Liste beitreten' })).toBeVisible();
      await check('invitation page', 6);
    });

    screen('invalid link page', async ({ page, expectErrors, check }) => {
      expectErrors(/status of 401|status of 404/);
      await page.goto('/j/' + 'x'.repeat(43));
      await expect(page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeVisible();
      await check('invalid link (signed out)', 6);
    });
  });
});
