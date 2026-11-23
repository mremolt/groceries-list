import { expect, type Page, test } from '@playwright/test';

import { APP, expectNoAxeViolations, newDevice, newUser, registerThroughUi } from './support';

// Acceptance of FR-ITEM-01..06 and BR-01 for items against the real BFF, database and identity provider. Tag: @real.
async function createList(page: Page, name: string): Promise<string> {
  await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
  await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return page.url().slice(page.url().lastIndexOf('/') + 1);
}

async function openCart(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /^Im Wagen/ });
  if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

test.describe('@real items', () => {
  test('add, check, edit, delete and clear checked items; everything survives a reload (FR-ITEM-01..05)', async ({
    page,
  }) => {
    await registerThroughUi(page, newUser('items'));
    await createList(page, 'Wocheneinkauf');
    const open = page.getByRole('region', { name: 'Noch zu kaufen' });
    const field = page.getByLabel('Was fehlt?');

    await expect(open.getByText('Diese Liste ist noch leer')).toBeVisible();
    await field.fill('2× Milch, laktosefrei');
    await field.press('Enter');
    await expect(open.getByRole('checkbox', { name: '2× Milch, laktosefrei' })).toBeVisible();
    await expect(field).toBeFocused();
    await field.fill('Vollkornbrot');
    await field.press('Enter');
    await expect(open.getByRole('checkbox', { name: 'Vollkornbrot' })).toBeVisible(); // a second add waits for the first
    await field.fill('6 Eier');
    await field.press('Enter');
    await expect(open.getByRole('checkbox')).toHaveCount(3);
    await expectNoAxeViolations(page, 'list page with items (real stack)');

    await open.getByRole('checkbox', { name: 'Vollkornbrot' }).click();
    await expect(open.getByText('1 von 3 erledigt')).toBeVisible();

    await page.getByRole('button', { name: '„6 Eier“ bearbeiten' }).click();
    const dialog = page.getByRole('dialog', { name: 'Artikel bearbeiten' });
    await dialog.getByLabel('Artikel').fill('10 Eier');
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(open.getByRole('checkbox', { name: '10 Eier' })).toBeVisible();

    await page.reload();
    await expect(open.getByRole('checkbox')).toHaveCount(2);
    await openCart(page);
    await expect(
      page.getByRole('region', { name: 'Im Wagen' }).getByRole('checkbox', { name: 'Vollkornbrot' }),
    ).toBeChecked();
    await expect(page.getByRole('heading', { level: 2, name: /Noch zu kaufen/ })).toContainText('2');

    await page.getByRole('button', { name: '„10 Eier“ bearbeiten' }).click();
    await page.getByRole('dialog', { name: 'Artikel bearbeiten' }).getByRole('button', { name: 'Löschen' }).click();
    await expect(open.getByRole('checkbox', { name: '10 Eier' })).toHaveCount(0);

    await openCart(page);
    await page.getByRole('region', { name: 'Im Wagen' }).getByRole('button', { name: 'Erledigte entfernen' }).click();
    await page.getByRole('dialog', { name: 'Erledigte entfernen?' }).getByRole('button', { name: 'Entfernen' }).click();
    await expect(page.getByRole('status')).toContainText('Erledigte Artikel entfernt');
    await expect(page.getByRole('checkbox', { name: 'Vollkornbrot' })).toHaveCount(0);
    await expect(open.getByRole('checkbox')).toHaveCount(1);
  });

  test('a text of 200 characters is accepted, one of 201 is refused with the field error (FR-ITEM-01 AC2/AC4)', async ({
    page,
  }) => {
    await registerThroughUi(page, newUser('itemlen'));
    await createList(page, 'Lang');
    const field = page.getByLabel('Was fehlt?');

    await field.fill('x'.repeat(201));
    await field.press('Enter');
    await expect(page.getByText('Fehler: Höchstens 200 Zeichen.')).toBeVisible();
    await field.fill('x'.repeat(200));
    await field.press('Enter');

    await expect(page.getByRole('region', { name: 'Noch zu kaufen' }).getByRole('checkbox')).toHaveCount(1);
  });

  test('BR-01: another person cannot read or change the items of a list (404, same as a missing list)', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('itemowner'));
    const listId = await createList(page, 'Privat');
    await page.getByLabel('Was fehlt?').fill('Geheim');
    await page.getByLabel('Was fehlt?').press('Enter');
    await expect(page.getByRole('checkbox', { name: 'Geheim' })).toBeVisible();

    const stranger = await newDevice(browser);
    await registerThroughUi(stranger.page, newUser('itemstranger'));
    const request = stranger.page.request;
    const xsrf = (await stranger.context.cookies()).find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '';

    const read = await request.get(`${APP}/api/v1/lists/${listId}/items`);
    const write = await request.post(`${APP}/api/v1/lists/${listId}/items`, {
      data: { text: 'Fremd' },
      headers: { 'X-XSRF-TOKEN': xsrf },
    });

    expect(read.status()).toBe(404);
    expect(write.status()).toBe(404);
    await stranger.context.close();
  });
});
