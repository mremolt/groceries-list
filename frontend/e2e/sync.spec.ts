import type { Page, Route } from '@playwright/test';

import type { ListResponse } from '../src/features/lists/adapter/out/http/generated/model/listResponse';
import { expect, test } from './fixtures';
import { item } from './fixtures/items';

// FR-SYNC-01..05, FR-FB-06, NFR-PERF-03/04, NFR-A11Y-07. Time is the page's fake clock (`page.clock`), so nothing here
// waits for real seconds (TS-TEST-15); the "other member" changes the stubbed server state between two polls.

const SHOP: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000d1',
  name: 'Wocheneinkauf',
  openCount: 2,
  revision: 3,
};
const OTHER: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000d2',
  name: 'Grillabend Samstag',
  openCount: 4,
  revision: 2,
};
const MILK = item('1', '2× Milch, laktosefrei', false, 1);
const BREAD = item('2', 'Vollkornbrot', false, 2);

const URL = `/listen/${SHOP.id}`;

/** The tab is hidden or visible again, as the browser reports it (FR-SYNC-01 AC2/AC3). */
async function setVisibility(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.describe('changes of other members reach the open list @responsive @shell @a11y-sync', () => {
  test.use({
    initialLists: { lists: [SHOP, OTHER] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD] } },
  });

  test('a new item and a checked item appear within one poll and are announced once (FR-SYNC-01 AC4, FR-SYNC-04)', async ({
    page,
    itemsApi,
    shell,
    items,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);

    const created = itemsApi.addBehindTheBack(SHOP.id, 'Käse');
    itemsApi.setDoneBehindTheBack(SHOP.id, MILK.id, true);
    await page.clock.runFor(5000);

    await expect(items.openItem(created.text)).toBeVisible();
    await expect(items.cartSection.getByText(MILK.text)).toBeAttached();
    await expect(shell.announcement).toHaveText('Liste aktualisiert: 1 neuer Artikel, 1 erledigt.');
  });

  test('the poll is conditional: unchanged means 304, nothing is redrawn and nothing is announced (NFR-PERF-04)', async ({
    page,
    itemsApi,
    shell,
    items,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);
    const milkRow = await items.openItem(MILK.text).elementHandle();

    await page.clock.runFor(5000);
    await expect.poll(() => itemsApi.sent.ifNoneMatch.length).toBe(2);

    expect(itemsApi.sent.ifNoneMatch[0]).toBeNull();
    expect(itemsApi.sent.ifNoneMatch[1]).toMatch(/^"\d+"$/);
    expect(await milkRow.evaluate((element) => element.isConnected)).toBe(true);
    await expect(shell.announcement).toHaveText('');
  });

  test('a poll does not take the focus, the typed text or an open dialog away (FR-SYNC-01 AC5)', async ({
    page,
    itemsApi,
    shell,
    items,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    const field = items.addField;
    await expect(items.openItems).toHaveCount(2);
    await field.focus();
    await page.keyboard.type('Käs');

    itemsApi.addBehindTheBack(SHOP.id, 'Eier');
    await page.clock.runFor(5000);
    await expect(items.openItem('Eier')).toBeVisible();
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Käs');

    await items.editButton('Vollkornbrot').click();
    const dialog = items.editDialog;
    await expect(shell.anyDialog).toHaveCount(1);
    await page.keyboard.type(' mit Körnern');
    itemsApi.addBehindTheBack(SHOP.id, 'Butter');
    await page.clock.runFor(5000);
    await expect(shell.anyDialog).toHaveCount(1);
    const dialogField = dialog.textField;
    await expect(dialogField).toHaveValue('Vollkornbrot mit Körnern');
    await expect(dialogField).toBeFocused();
  });

  test('a rename by another member reaches the heading and the drawer (FR-SYNC-03 AC1)', async ({
    page,
    listsApi,
    shell,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    await expect(shell.heading('Wocheneinkauf')).toBeVisible();

    listsApi.lists[0] = { ...SHOP, name: 'Großeinkauf', revision: SHOP.revision + 1 };
    await page.clock.runFor(5000);

    await expect(shell.heading('Großeinkauf')).toBeVisible();
    await shell.openDrawer();
    await expect(shell.listLink(/^Großeinkauf, \d+ offen$/)).toBeVisible();
  });

  test('the counts of the other lists follow at least every 30 seconds (FR-SYNC-03 AC1)', async ({
    page,
    listsApi,
    shell,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    await shell.openDrawer();
    await expect(shell.listLink('Grillabend Samstag, 4 offen')).toBeVisible();

    listsApi.lists[1] = { ...OTHER, openCount: 9, revision: OTHER.revision + 1 };
    await page.clock.runFor(30_000);

    await expect(shell.listLink('Grillabend Samstag, 9 offen')).toBeVisible();
  });
});

test.describe('polling follows the page @shell', () => {
  test.use({
    initialLists: { lists: [SHOP, OTHER] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD] } },
  });

  test('pauses while the tab is hidden and asks at once when it is visible or focused again (AC2, AC3)', async ({
    page,
    itemsApi,
    items,
  }) => {
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);
    await setVisibility(page, true);
    const before = itemsApi.sent.ifNoneMatch.length;

    await page.clock.runFor(120_000);
    expect(itemsApi.sent.ifNoneMatch).toHaveLength(before);

    itemsApi.addBehindTheBack(SHOP.id, 'Käse');
    await setVisibility(page, false);
    await expect(items.openItem('Käse')).toBeVisible(); // no clock needed: at once

    itemsApi.addBehindTheBack(SHOP.id, 'Eier');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(items.openItem('Eier')).toBeVisible();
  });

  test('stops polling the list when the person leaves the page (no leak)', async ({ page, itemsApi, shell, items }) => {
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);
    await shell.chooseOption('Einstellungen');
    await expect(shell.heading('Einstellungen')).toBeVisible();
    const before = itemsApi.sent.ifNoneMatch.length;

    await page.clock.runFor(60_000);

    expect(itemsApi.sent.ifNoneMatch).toHaveLength(before);
  });
});

test.describe('a list that is gone (FR-SYNC-05) @shell', () => {
  test.use({
    initialLists: { lists: [SHOP, OTHER] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD] } },
  });

  test('shows the message and opens the next list', async ({ page, listsApi, expectErrors, shell, items }) => {
    expectErrors(/status of 404/); // the poll that learns the list is gone
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);

    listsApi.lists.splice(0, 1); // another member deleted it
    await page.clock.runFor(5000);

    await expect(shell.statusWith('Diese Liste wurde gelöscht.')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/listen/${OTHER.id}$`));
    await expect(shell.heading('Grillabend Samstag')).toBeVisible();
  });

  test('shows the empty state when it was the last list', async ({
    page,
    listsApi,
    expectErrors,
    shell,
    lists,
    items,
  }) => {
    expectErrors(/status of 404/); // the poll that learns the list is gone
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);

    listsApi.lists.splice(0, listsApi.lists.length);
    await page.clock.runFor(5000);

    await expect(lists.emptyStateHeading).toBeVisible();
    await expect(shell.statusWith('Diese Liste wurde gelöscht.')).toBeVisible();
  });
});

test.describe('no connection (FR-FB-06) @shell @a11y-sync', () => {
  test.use({
    initialLists: { lists: [SHOP, OTHER] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD] } },
  });

  test('shows the banner after more than 10 seconds, disables changes, and recovers at once', async ({
    page,
    expectErrors,
    expectAccessible,
    shell,
    items,
  }) => {
    expectErrors(/ERR_INTERNET_DISCONNECTED|Failed to load resource|items API|lists API|Http failure/);
    await page.clock.install();
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(2);

    // routed requests are answered even when the context is offline, so the stubbed server is made unreachable instead
    const unreachable = (route: Route) => route.abort('internetdisconnected');
    await page.route('**/api/v1/**', unreachable);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.clock.runFor(5000); // the first poll fails
    await expect(shell.offlineMessage).toHaveCount(0); // not yet: less than 10 s
    await page.clock.runFor(11_000);

    await expect(shell.offlineMessage).toBeVisible();
    await expect(shell.announcement).toHaveText('Keine Verbindung. Änderungen sind gerade nicht möglich.');
    await expect(items.addButton).toHaveAttribute('aria-disabled', 'true');
    await expect(items.openItem(MILK.text)).toBeDisabled();
    await expect(page.getByText('Das hat nicht geklappt')).toHaveCount(0); // no error snackbar from background polls
    await expect(items.openSection.getByText(MILK.text)).toBeVisible(); // reading stays possible
    await expectAccessible('offline banner');

    await page.unroute('**/api/v1/**', unreachable);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect(shell.offlineMessage).toHaveCount(0);
    await expect(items.addButton).not.toHaveAttribute('aria-disabled', 'true');
  });
});
