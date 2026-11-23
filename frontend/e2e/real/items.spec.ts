import { expect, test } from './fixtures';
import { APP, createListThroughUi, expectNoAxeViolations, newDevice, newUser, registerThroughUi } from './support';

// Acceptance of FR-ITEM-01..06 and BR-01 for items against the real BFF, database and identity provider. Tag: @real.
test.describe('@real items', () => {
  test('add, check, edit, delete and clear checked items; everything survives a reload (FR-ITEM-01..05)', async ({
    page,
    shell,
    items,
  }) => {
    await registerThroughUi(page, newUser('items'));
    await createListThroughUi(page, 'Wocheneinkauf');
    const open = items.openSection;
    const field = items.addField;

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

    await items.edit('6 Eier', '10 Eier');
    await expect(open.getByRole('checkbox', { name: '10 Eier' })).toBeVisible();

    await page.reload();
    await expect(open.getByRole('checkbox')).toHaveCount(2);
    await items.openCart();
    await expect(items.cartItem('Vollkornbrot')).toBeChecked();
    await expect(items.openHeading).toContainText('2');

    await items.remove('10 Eier');
    await expect(open.getByRole('checkbox', { name: '10 Eier' })).toHaveCount(0);

    await items.clearChecked();
    await expect(shell.status).toContainText('Erledigte Artikel entfernt');
    await expect(items.item('Vollkornbrot')).toHaveCount(0);
    await expect(open.getByRole('checkbox')).toHaveCount(1);
  });

  test('a text of 200 characters is accepted, one of 201 is refused with the field error (FR-ITEM-01 AC2/AC4)', async ({
    page,
    items,
  }) => {
    await registerThroughUi(page, newUser('itemlen'));
    await createListThroughUi(page, 'Lang');
    const field = items.addField;

    await field.fill('x'.repeat(201));
    await field.press('Enter');
    await expect(page.getByText('Fehler: Höchstens 200 Zeichen.')).toBeVisible();
    await field.fill('x'.repeat(200));
    await field.press('Enter');

    await expect(items.openItems).toHaveCount(1);
  });

  test('BR-01: another person cannot read or change the items of a list (404, same as a missing list)', async ({
    page,
    browser,
    items,
  }) => {
    await registerThroughUi(page, newUser('itemowner'));
    const listId = await createListThroughUi(page, 'Privat');
    await items.addField.fill('Geheim');
    await items.addField.press('Enter');
    await expect(items.item('Geheim')).toBeVisible();

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
