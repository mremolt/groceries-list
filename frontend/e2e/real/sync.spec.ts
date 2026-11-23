import { expect, type Page, test } from '@playwright/test';

import { APP, newDevice, newUser, recordSecret, registerThroughUi } from './support';

// FR-SYNC-01..05 and FR-FB-06 against the real BFF and database, with two people in two browser profiles (kickoff.md,
// M5 "Done when"). Tag: @real. The polls run on the real clock: a change must show within 6 seconds (NFR-PERF-03).

const WITHIN_6_SECONDS = { timeout: 6000 };
const OFFLINE_TEXT = 'Keine Verbindung. Änderungen sind gerade nicht möglich.';

async function createList(page: Page, name: string): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
  await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function addItem(page: Page, text: string): Promise<void> {
  const field = page.getByLabel('Was fehlt?');
  await field.fill(text);
  await field.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Noch zu kaufen' }).getByRole('checkbox', { name: text }),
  ).toBeVisible();
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
  await createList(page, name);
  const link = await shareLinkOf(page);
  const other = await newDevice(browser);
  await registerThroughUi(other.page, newUser('syncB'));
  await other.page.goto(link);
  await expect(other.page.getByRole('heading', { level: 1, name })).toBeVisible();
  return other;
}

test.describe('@real synchronisation', () => {
  test('what A adds, checks, renames and deletes shows for B within 6 seconds (FR-SYNC-01, NFR-PERF-03)', async ({
    page,
    browser,
  }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Wocheneinkauf');
    const bOpen = b.page.getByRole('region', { name: 'Noch zu kaufen' });
    const bCart = b.page.getByRole('region', { name: 'Im Wagen' });

    await addItem(page, 'Milch');
    await expect(bOpen.getByRole('checkbox', { name: 'Milch' })).toBeVisible(WITHIN_6_SECONDS);
    await expect(b.page.locator('.cdk-live-announcer-element[aria-live="polite"]')).toHaveText(
      'Liste aktualisiert: 1 neuer Artikel.',
    );

    await page.getByRole('region', { name: 'Noch zu kaufen' }).getByRole('checkbox', { name: 'Milch' }).click();
    await expect(bCart.getByRole('checkbox', { name: 'Milch' })).toBeVisible(WITHIN_6_SECONDS);

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();
    await page.getByRole('dialog', { name: 'Liste umbenennen' }).getByLabel('Name der Liste').fill('Großeinkauf');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(b.page.getByRole('heading', { level: 1, name: 'Großeinkauf' })).toBeVisible(WITHIN_6_SECONDS);

    await addItem(page, 'Brot');
    await expect(bOpen.getByRole('checkbox', { name: 'Brot' })).toBeVisible(WITHIN_6_SECONDS);
    await page.getByRole('button', { name: '„Brot“ bearbeiten' }).click();
    await page.getByRole('dialog', { name: 'Artikel bearbeiten' }).getByRole('button', { name: 'Löschen' }).click();
    await expect(bOpen.getByRole('checkbox', { name: 'Brot' })).toHaveCount(0, WITHIN_6_SECONDS);

    await b.context.close();
  });

  test('B keeps the typed text and the focus while A changes the list (FR-SYNC-01 AC5)', async ({ page, browser }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Fokus');
    const field = b.page.getByLabel('Was fehlt?');
    await field.focus();
    await b.page.keyboard.type('Käs');

    await addItem(page, 'Eier');
    await expect(b.page.getByRole('checkbox', { name: 'Eier' })).toBeVisible(WITHIN_6_SECONDS);

    await expect(field).toBeFocused();
    await expect(field).toHaveValue('Käs');
    await b.context.close();
  });

  test('FR-SYNC-05: when A deletes the list B has open, B is told and lands on the empty state', async ({
    page,
    browser,
  }) => {
    const b = await twoPeopleOnOneList(page, browser, 'Geht weg');

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();

    await expect(b.page.getByRole('status').filter({ hasText: 'Diese Liste wurde gelöscht.' })).toBeVisible(
      WITHIN_6_SECONDS,
    );
    await expect(b.page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
    await b.context.close();
  });

  test('FR-FB-06: no connection shows the banner after 10 seconds and disables changes; it is gone when back', async ({
    page,
    context,
  }) => {
    await registerThroughUi(page, newUser('offline'));
    await createList(page, 'Unterwegs');
    await page.clock.install(); // the 10 seconds run on the page's clock, not on the wall clock
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Unterwegs' })).toBeVisible();

    await context.setOffline(true);
    await page.clock.runFor(5000); // the first poll fails
    await expect(page.getByRole('banner').getByText(OFFLINE_TEXT)).toHaveCount(0);
    await page.clock.runFor(11_000);

    await expect(page.getByRole('banner').getByText(OFFLINE_TEXT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hinzufügen' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('Das hat nicht geklappt')).toHaveCount(0);

    await context.setOffline(false);
    await page.clock.runFor(15_000);

    await expect(page.getByRole('banner').getByText(OFFLINE_TEXT)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hinzufügen' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});
