import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page, test as base } from '@playwright/test';

import type { ItemResponse } from '../src/features/items/adapter/out/http/generated/model/itemResponse';
import type { ListResponse } from '../src/features/lists/adapter/out/http/generated/model/listResponse';
import { stubConfig } from './fixtures/config';
import { type ItemsStub, stubItems } from './fixtures/items';
import { type ListsStub, stubLists } from './fixtures/lists';
import { stubSession } from './fixtures/session';
import { type SharingStub, stubSharing } from './fixtures/sharing';

const AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const AAA = ['wcag2aaa']; // axe has no wcag21aaa / wcag22aaa tag
const ADOPTED_AAA_RULES = ['color-contrast-enhanced']; // adopted AAA set (A11Y-02); an exception is listed in docs/accessibility.md and removes the rule here

interface Fixtures {
  /** Axe scan of the settled page (TS-TEST-12); also proves that `target-size` ran (TS-TEST-21). */
  expectAccessible: (label: string) => Promise<void>;
  /** No horizontal overflow (A11Y-13) and no clipped text under WCAG 1.4.12 spacing (A11Y-14, TS-TEST-19). */
  expectReflowAndTextSpacing: () => Promise<void>;
  /** Declares that a console or page error matching the pattern is expected in this test (TS-TEST-32). */
  expectErrors: (pattern: RegExp) => void;
  /** Paths of API calls the page made (TS-TEST-14). */
  apiCalls: string[];
  /** Who is signed in. Default: signed in; `null` answers 401 like the BFF without a session. */
  session: { signedIn: boolean };
  /** Number of `/api/v1/me` calls (request budget, TS-TEST-14). */
  meCalls: () => number;
  /** The lists the stubbed backend starts with (default: none); set per test with `test.use`. */
  initialLists: { readonly lists: readonly ListResponse[] };
  /** Items the stubbed backend starts with, per list id; lists without an entry start with `openCount` open items. */
  initialItems: { readonly items: Readonly<Record<string, readonly ItemResponse[]>> };
  /** Stateful stub of the lists API (`/api/v1/lists`). */
  listsApi: ListsStub;
  /** Stateful stub of the items API (`/api/v1/lists/:id/items`), consistent with `listsApi`. */
  itemsApi: ItemsStub;
  /** Stateful stub of the sharing API (share link, invitations, join), consistent with `listsApi`. */
  sharingApi: SharingStub;
}

const recordedApiCalls = new WeakMap<Page, string[]>();
const expectedErrors = new WeakMap<Page, RegExp[]>();

async function stubRuntimeConfig(page: Page): Promise<void> {
  await page.route('**/config.json', (route) => route.fulfill({ json: stubConfig }));
}

export const test = base.extend<Fixtures>({
  session: [{ signedIn: true }, { option: true }],
  initialLists: [{ lists: [] }, { option: true }],
  initialItems: [{ items: {} }, { option: true }],
  listsApi: [
    async ({ page, initialLists }, use) => {
      await use(await stubLists(page, initialLists.lists));
    },
    { auto: true },
  ],
  itemsApi: [
    async ({ page, listsApi, initialItems }, use) => {
      await use(await stubItems(page, listsApi.lists, initialItems.items));
    },
    { auto: true },
  ],
  sharingApi: [
    async ({ page, listsApi }, use) => {
      await use(await stubSharing(page, listsApi.lists));
    },
    { auto: true },
  ],
  meCalls: [
    async ({ page, session }, use) => {
      const stub = await stubSession(page, session.signedIn);
      await use(() => stub.calls());
    },
    { auto: true },
  ],
  expectErrors: async ({ page }, use) => {
    await use((pattern) => {
      expectedErrors.set(page, [...(expectedErrors.get(page) ?? []), pattern]);
    });
  },
  apiCalls: async ({ page }, use) => {
    const calls = recordedApiCalls.get(page) ?? [];
    await use(calls);
    expect(calls, 'API calls that no stub answered (TS-TEST-32)').toEqual([]);
  },
  page: async ({ page }, use) => {
    const calls: string[] = [];
    recordedApiCalls.set(page, calls);
    // TS-TEST-32: catch-all for the API prefix, registered before the test's own stubs; answers 501 and records
    await page.route('**/api/**', (route) => {
      calls.push(new URL(route.request().url()).pathname);
      return route.fulfill({ status: 501, json: { title: 'No stub for this API call' } });
    });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
      if (message.type() === 'warning' && /missing/i.test(message.text())) problems.push(`i18n: ${message.text()}`);
    });
    await stubRuntimeConfig(page);
    await use(page);
    const expected = expectedErrors.get(page) ?? [];
    const unexpected = problems.filter((problem) => !expected.some((pattern) => pattern.test(problem)));
    expect(unexpected, 'unhandled errors, console errors or missing translations (TS-TEST-32)').toEqual([]);
  },
  expectAccessible: async ({ page }, use, testInfo) => {
    await use(async (label) => {
      // Scan only a settled page: transitions and opening dialogs report false contrast findings
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
      const results = await new AxeBuilder({ page })
        .withTags([...AA, ...AAA])
        .options({ rules: { 'target-size': { enabled: true } } })
        .analyze();
      await testInfo.attach(`axe-${label}`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });
      const ran = [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].some(
        (rule) => rule.id === 'target-size',
      );
      expect(ran, 'axe rule target-size must have run (TS-TEST-21)').toBe(true);
      const failing = results.violations.filter(
        (v) => v.tags.some((t) => AA.includes(t)) || ADOPTED_AAA_RULES.includes(v.id),
      );
      expect(failing, `axe violations in state "${label}"`).toEqual([]);
    });
  },
  expectReflowAndTextSpacing: async ({ page }, use) => {
    await use(async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal overflow of the document (A11Y-13)').toBeLessThanOrEqual(0);
      await page.addStyleTag({
        content:
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }',
      });
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('body *')]
          .filter((el) => {
            const style = getComputedStyle(el);
            // a vertical scroll container (`auto`, `scroll`) does not clip: the person scrolls to the rest (the page body
            // scrolls inside the app shell's content area); only `hidden` and `clip` cut text off
            const clipsX = style.overflowX !== 'visible';
            const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
            const tiny = el.offsetWidth <= 1 && el.offsetHeight <= 1;
            return (
              !tiny &&
              ((clipsX && el.scrollWidth > el.clientWidth + 1) || (clipsY && el.scrollHeight > el.clientHeight + 1))
            );
          })
          .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : '')),
      );
      expect(clipped, 'clipped text under WCAG 1.4.12 spacing (A11Y-14)').toEqual([]);
    });
  },
});

export { expect } from '@playwright/test';
