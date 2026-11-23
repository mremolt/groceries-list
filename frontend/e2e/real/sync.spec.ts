import { type Page } from '@playwright/test';

import type { Pages } from '../pages';
import { expect, test } from './fixtures';
import { APP, createListThroughUi, newDevice, newUser, recordSecret, registerThroughUi } from './support';

// FR-SYNC-01..05 and FR-FB-06 against the real BFF and database, with two people in two browser profiles (kickoff.md,
// M5 "Done when"). Tag: @real. The polls run on the real clock: a change must show within 6 seconds (NFR-PERF-03).

const WITHIN_6_SECONDS = { timeout: 6000 };
const OFFLINE_TEXT = 'Keine Verbindung. Änderungen sind gerade nicht möglich.';

async function addItem({ items }: Pick<Pages, 'items'>, text: string): Promise<void> {
  await items.add(text);
  await expect(items.openItem(text)).toBeVisible();
}

async function shareLinkOf(page: Page): Promise<string> {
  const listId = page.url().slice(page.url().lastIndexOf('/') + 1);
  const answer = (await (await page.request.get(`${APP}/api/v1/lists/${listId}/share-link`)).json()) as { url: string };
  const token = answer.url.slice(answer.url.lastIndexOf('/') + 1);
  recordSecret(token);
  return `${APP}/j/${token}`;
}

/** Person A creates a list; person B signs up on another device and joins it by the link. Both have it open. */
async function twoPeopleOnOneList(page: Page, browser: Parameters<typeof newDevice>[0], name: string) {
  await registerThroughUi(page, newUser('syncA'));
  await createListThroughUi(page, name);
  const link = await shareLinkOf(page);
  const other = await newDevice(browser);
  await registerThroughUi(other.page, newUser('syncB'));
  await other.page.goto(link);
  await expect(other.shell.heading(name)).toBeVisible();
  return other;
}

test.describe('@real synchronisation', () => {
  test('what A adds, checks, renames and deletes shows for B within 6 seconds (FR-SYNC-01, NFR-PERF-03)', async ({
    page,
    browser,
    items,
    lists,
  }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Wocheneinkauf');
    const bOpen = b.items.openSection;
    const bCart = b.items.cartSection;

    await addItem({ items }, 'Milch');
    await expect(bOpen.getByRole('checkbox', { name: 'Milch' })).toBeVisible(WITHIN_6_SECONDS);
    await expect(b.shell.announcement).toHaveText('Liste aktualisiert: 1 neuer Artikel.');

    await items.openItem('Milch').click();
    await expect(bCart.getByRole('checkbox', { name: 'Milch' })).toBeVisible(WITHIN_6_SECONDS);

    await lists.rename('Großeinkauf');
    await expect(b.shell.heading('Großeinkauf')).toBeVisible(WITHIN_6_SECONDS);

    await addItem({ items }, 'Brot');
    await expect(bOpen.getByRole('checkbox', { name: 'Brot' })).toBeVisible(WITHIN_6_SECONDS);
    await items.remove('Brot');
    await expect(bOpen.getByRole('checkbox', { name: 'Brot' })).toHaveCount(0, WITHIN_6_SECONDS);

    await b.context.close();
  });

  test('B keeps the typed text and the focus while A changes the list (FR-SYNC-01 AC5)', async ({
    page,
    browser,
    items,
  }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Fokus');
    const field = b.items.addField;
    await field.focus();
    await b.page.keyboard.type('Käs');

    await addItem({ items }, 'Eier');
    await expect(b.items.item('Eier')).toBeVisible(WITHIN_6_SECONDS);

    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Käs');
    await b.context.close();
  });

  test('FR-SYNC-05: when A deletes the list B has open, B is told and lands on the empty state', async ({
    page,
    browser,
    lists,
  }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Geht weg');

    await lists.delete();

    await expect(b.shell.statusWith('Diese Liste wurde gelöscht.')).toBeVisible(WITHIN_6_SECONDS);
    await expect(b.lists.emptyStateHeading).toBeVisible();
    await b.context.close();
  });

  test('FR-FB-06: no connection shows the banner after 10 seconds and disables changes; it is gone when back', async ({
    page,
    context,
    shell,
    items,
  }) => {
    await registerThroughUi(page, newUser('offline'));
    await createListThroughUi(page, 'Unterwegs');
    await page.clock.install(); // the 10 seconds run on the page's clock, not on the wall clock
    await page.reload();
    await expect(shell.heading('Unterwegs')).toBeVisible();

    await context.setOffline(true);
    await page.clock.runFor(5000); // the first poll fails
    await expect(shell.banner.getByText(OFFLINE_TEXT)).toHaveCount(0);
    await page.clock.runFor(11_000);

    await expect(shell.banner.getByText(OFFLINE_TEXT)).toBeVisible();
    await expect(items.addButton).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('Das hat nicht geklappt')).toHaveCount(0);

    await context.setOffline(false);
    await page.clock.runFor(15_000);

    await expect(shell.banner.getByText(OFFLINE_TEXT)).toHaveCount(0);
    await expect(items.addButton).not.toHaveAttribute('aria-disabled', 'true');
  });
});
