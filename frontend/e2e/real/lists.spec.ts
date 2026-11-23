import { expect, test } from '@playwright/test';

import { APP, expectNoAxeViolations, newDevice, newUser, registerThroughUi } from './support';

// Acceptance of FR-LIST-01..05, FR-NAV-06 and BR-01 against the real BFF, database and identity provider. Tag: @real.
test.describe('@real lists', () => {
  test('create, rename, reload by URL and delete one list (FR-LIST-01/02/03/05, FR-NAV-06)', async ({ page }) => {
    await registerThroughUi(page, newUser('lists'));

    await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
    await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill('Wocheneinkauf');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Wocheneinkauf' })).toBeVisible();
    await expectNoAxeViolations(page, 'list page (real stack)');

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();
    await page.getByRole('dialog', { name: 'Liste umbenennen' }).getByLabel('Name der Liste').fill('Großeinkauf');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Großeinkauf' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Großeinkauf' })).toBeVisible();

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
  });

  test('BR-01 / FR-NAV-06 AC2: another person gets the same "not found" as for a missing list', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner'));
    await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
    await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill('Privat');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Privat' })).toBeVisible();
    const listUrl = page.url();
    const listId = listUrl.slice(listUrl.lastIndexOf('/') + 1);

    const stranger = await newDevice(browser);
    await registerThroughUi(stranger.page, newUser('stranger'));

    const foreign = await stranger.page.request.get(`${APP}/api/v1/lists/${listId}`);
    const missing = await stranger.page.request.get(`${APP}/api/v1/lists/00000000-0000-4000-8000-000000000000`);
    expect(foreign.status()).toBe(404);
    expect(missing.status()).toBe(404);

    await stranger.page.goto(listUrl);
    await expect(stranger.page.getByRole('heading', { level: 1, name: 'Privat' })).toHaveCount(0);
    await expect(stranger.page.getByText('Privat')).toHaveCount(0);
    await stranger.context.close();
  });
});
