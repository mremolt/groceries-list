import type { Page } from '@playwright/test';

import type { ListResponse } from '../src/features/lists/adapter/out/http/generated/model/listResponse';
import { expect, test } from './fixtures';
import { item } from './fixtures/items';

// Layout statement (NG-UI-23): the list page is the add card on top and under it „Noch zu kaufen“ and „Im Wagen“. On
// compact the cards are stacked and „Im Wagen“ is collapsed until opened; on medium and expanded the two sections stand
// side by side. The scenarios run unchanged in every viewport project; the helper opens „Im Wagen“ where it is folded.

const SHOP: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000c1',
  name: 'Wocheneinkauf',
  openCount: 3,
  revision: 3,
};
const MILK = item('1', '2× Milch, laktosefrei', false, 1);
const BREAD = item('2', 'Vollkornbrot', false, 2);
const EGGS = item('3', '6 Eier', false, 3);
const BUTTER = item('4', 'Butter', true, 4);
const YOGHURT = item('5', 'Naturjoghurt', true, 5);

const URL = `/listen/${SHOP.id}`;

async function openCart(page: Page): Promise<void> {
  await expect(page.getByRole('region', { name: 'Noch zu kaufen' })).toBeVisible(); // the cards appear with the items
  const toggle = page.getByRole('button', { name: /^Im Wagen/ });
  if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

const openSection = (page: Page) => page.getByRole('region', { name: 'Noch zu kaufen' });
const cartSection = (page: Page) => page.getByRole('region', { name: 'Im Wagen' });

test.describe('the sections @responsive @shell @a11y-items', () => {
  test.use({
    initialLists: { lists: [SHOP] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD, EGGS, BUTTER, YOGHURT] } },
  });

  test('shows open items oldest first, the checked ones in „Im Wagen“, badge and progress (FR-ITEM-02 AC4, BR-09)', async ({
    page,
    itemsApi,
    expectAccessible,
  }) => {
    await page.goto(URL);

    await expect(openSection(page).getByRole('checkbox')).toHaveCount(3);
    await expect(openSection(page).getByRole('checkbox').first()).toHaveAccessibleName('2× Milch, laktosefrei');
    await expect(page.getByRole('heading', { level: 2, name: /Noch zu kaufen/ })).toContainText('3');
    await expect(openSection(page).getByText('2 von 5 erledigt')).toBeVisible();
    await openCart(page);
    await expect(cartSection(page).getByRole('checkbox', { name: 'Butter' })).toBeChecked();
    await expect(cartSection(page).getByRole('button', { name: 'Erledigte entfernen' })).toBeVisible();
    expect(itemsApi.loadCalls(), 'request budget: one call for all items (API-N1-01)').toBe(1);
    await expectAccessible('list page with items');
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing }) => {
    await page.goto(URL);
    await expect(openSection(page).getByRole('checkbox')).toHaveCount(3);

    await expectReflowAndTextSpacing();
  });

  test('the drawer count follows the items without another list request (FR-LIST-05, API-N1-01)', async ({
    page,
    listsApi,
  }) => {
    await page.goto(URL);
    await openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' }).check();

    await expect(openSection(page).getByText('3 von 5 erledigt')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Noch zu kaufen/ })).toContainText('2');
    expect(listsApi.listCalls()).toBe(1);
  });
});

test.describe('add an item @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [SHOP] }, initialItems: { items: { [SHOP.id]: [MILK] } } });

  test('adds several items in a row; the field is cleared and keeps the focus (FR-ITEM-01 AC2/AC3)', async ({
    page,
    itemsApi,
  }) => {
    await page.goto(URL);
    const field = page.getByLabel('Was fehlt?');
    await field.focus();

    await page.keyboard.type('Käse');
    await page.keyboard.press('Enter');
    await expect(openSection(page).getByRole('checkbox', { name: 'Käse' })).toBeVisible();
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('');
    await page.keyboard.type('Äpfel');
    await page.keyboard.press('Enter');

    await expect(openSection(page).getByRole('checkbox', { name: 'Äpfel' })).toBeVisible();
    await expect(openSection(page).getByRole('checkbox')).toHaveCount(3);
    expect(itemsApi.sent.added).toEqual([{ text: 'Käse' }, { text: 'Äpfel' }]);
  });

  test('the button adds too and puts the focus back into the field; duplicates are allowed (AC6)', async ({ page }) => {
    await page.goto(URL);
    const field = page.getByLabel('Was fehlt?');

    await field.fill('2× Milch, laktosefrei');
    await page.getByRole('button', { name: 'Hinzufügen' }).click();

    await expect(openSection(page).getByRole('checkbox', { name: '2× Milch, laktosefrei' })).toHaveCount(2);
    await expect(field).toBeFocused();
  });

  test('refuses an empty input and one over 200 characters with the field error (AC4)', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto(URL);
    const field = page.getByLabel('Was fehlt?');

    await field.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Fehler: Bitte gib einen Artikel ein.')).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toBeFocused();
    await expectAccessible('add field with error');

    await field.fill('x'.repeat(201));
    await page.keyboard.press('Enter');
    await expect(page.getByText('Fehler: Höchstens 200 Zeichen.')).toBeVisible();
  });

  test('keeps the typed text and shows the error snackbar when saving fails (FR-FB-05 AC2)', async ({
    page,
    itemsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    const field = page.getByLabel('Was fehlt?');
    itemsApi.failNextWrite(500);

    await field.fill('Käse');
    await field.press('Enter');

    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(field).toHaveValue('Käse');
    await expect(openSection(page).getByRole('checkbox', { name: 'Käse' })).toHaveCount(0);
  });

  test('the add button has the accessible name „Hinzufügen“ (AC1)', async ({ page }) => {
    await page.goto(URL);

    await expect(page.getByRole('button', { name: 'Hinzufügen' })).toBeVisible();
  });
});

test.describe('check and uncheck @responsive @shell @a11y-items', () => {
  test.use({
    initialLists: { lists: [SHOP] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD, EGGS, BUTTER] } },
  });

  test('checking with the keyboard moves the item and the focus to the next open item (FR-ITEM-02 AC1/AC3)', async ({
    page,
    itemsApi,
  }) => {
    await page.goto(URL);
    await openSection(page).getByRole('checkbox', { name: '2× Milch, laktosefrei' }).focus();

    await page.keyboard.press('Space');

    await expect(openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' })).toBeFocused();
    await expect(openSection(page).getByRole('checkbox')).toHaveCount(2);
    await openCart(page);
    await expect(cartSection(page).getByRole('checkbox', { name: '2× Milch, laktosefrei' })).toBeChecked();
    expect(itemsApi.sent.patched).toEqual([{ id: MILK.id, body: { done: true } }]);
  });

  test('checking the last item moves the focus to the previous one', async ({ page }) => {
    await page.goto(URL);
    await openSection(page).getByRole('checkbox', { name: '6 Eier' }).focus();

    await page.keyboard.press('Space');

    await expect(openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' })).toBeFocused();
  });

  test('an unchecked item returns to its position per BR-09 (AC1)', async ({ page }) => {
    await page.goto(URL);
    await openCart(page);

    await cartSection(page).getByRole('checkbox', { name: 'Butter' }).uncheck();

    await expect(openSection(page).getByRole('checkbox')).toHaveCount(4);
    await expect(openSection(page).getByRole('checkbox').last()).toHaveAccessibleName('Butter');
  });

  test('undoes the change and shows the error snackbar when saving fails (AC2, FR-FB-05 AC1)', async ({
    page,
    itemsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    itemsApi.failNextWrite(500);

    await openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' }).check();

    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' })).not.toBeChecked();
    await expect(openSection(page).getByRole('checkbox')).toHaveCount(3);
  });

  test('says so when somebody deleted the item in the meantime (FR-FB-02 AC5)', async ({
    page,
    itemsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 404/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    await expect(openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' })).toBeVisible();
    itemsApi.deleteBehindTheBack(SHOP.id, BREAD.id);

    await openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' }).click();

    await expect(page.getByRole('status')).toContainText('Dieser Artikel wurde inzwischen gelöscht.');
    await expect(page.getByRole('checkbox', { name: 'Vollkornbrot' })).toHaveCount(0);
  });
});

test.describe('edit and delete @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [SHOP] }, initialItems: { items: { [SHOP.id]: [MILK, BREAD, BUTTER] } } });

  test('edits the text in the dialog and says „Gespeichert“ (FR-ITEM-03)', async ({
    page,
    itemsApi,
    expectAccessible,
  }) => {
    await page.goto(URL);
    const opener = page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' });
    await opener.click();

    const dialog = page.getByRole('dialog', { name: 'Artikel bearbeiten' });
    await expect(dialog.getByText('Änderungen sind sofort für alle Mitglieder sichtbar.')).toBeVisible();
    await expect(dialog.getByLabel('Artikel')).toHaveValue('Vollkornbrot');
    await expect(dialog.getByLabel('Artikel')).toBeFocused();
    await expectAccessible('edit item dialog');
    await dialog.getByLabel('Artikel').fill('Roggenbrot');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('status')).toContainText('Gespeichert');
    await expect(openSection(page).getByRole('checkbox', { name: 'Roggenbrot' })).toBeVisible();
    await expect(page.getByRole('button', { name: '„Roggenbrot“ bearbeiten' })).toBeFocused();
    expect(itemsApi.sent.patched).toEqual([{ id: BREAD.id, body: { text: 'Roggenbrot' } }]);
  });

  test('„Abbrechen“ discards; checked items have no edit button (AC2/AC3)', async ({ page, itemsApi }) => {
    await page.goto(URL);
    await openCart(page);
    await expect(cartSection(page).getByRole('button', { name: /bearbeiten/ })).toHaveCount(0);
    await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();
    const dialog = page.getByRole('dialog', { name: 'Artikel bearbeiten' });
    await dialog.getByLabel('Artikel').fill('Anderes');

    await dialog.getByRole('button', { name: 'Abbrechen' }).click();

    await expect(dialog).toBeHidden();
    await expect(openSection(page).getByRole('checkbox', { name: 'Vollkornbrot' })).toBeVisible();
    expect(itemsApi.sent.patched).toEqual([]);
  });

  test('refuses an empty text in the dialog and keeps it open (AC2)', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();
    const dialog = page.getByRole('dialog', { name: 'Artikel bearbeiten' });

    await dialog.getByLabel('Artikel').fill('');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(dialog.getByText('Fehler: Bitte gib einen Artikel ein.')).toBeVisible();
  });

  test('deletes at once without a further question (FR-ITEM-04, BR-11)', async ({ page, itemsApi }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();

    await page.getByRole('dialog', { name: 'Artikel bearbeiten' }).getByRole('button', { name: 'Löschen' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Vollkornbrot' })).toHaveCount(0);
    await expect(page.getByLabel('Was fehlt?')).toBeFocused();
    expect(itemsApi.sent.deleted).toEqual([BREAD.id]);
  });

  test('keeps the typed text and the dialog when saving fails (FR-FB-05 AC2)', async ({
    page,
    itemsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    await page.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }).click();
    const dialog = page.getByRole('dialog', { name: 'Artikel bearbeiten' });
    itemsApi.failNextWrite(500);

    await dialog.getByLabel('Artikel').fill('Roggenbrot');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(dialog.getByText('Das hat nicht geklappt. Bitte versuche es noch einmal.')).toBeVisible();
    await expect(dialog.getByLabel('Artikel')).toHaveValue('Roggenbrot');
  });
});

test.describe('clear checked items @responsive @shell @a11y-items', () => {
  test.use({
    initialLists: { lists: [SHOP] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD, BUTTER, YOGHURT] } },
  });

  test('asks first, then removes exactly the checked items and says so (FR-ITEM-05, BR-11)', async ({
    page,
    itemsApi,
    expectAccessible,
  }) => {
    await page.goto(URL);
    await openCart(page);
    await cartSection(page).getByRole('button', { name: 'Erledigte entfernen' }).click();

    const dialog = page.getByRole('dialog', { name: 'Erledigte entfernen?' });
    await expect(dialog.getByText('2 erledigte Artikel werden für alle Mitglieder entfernt.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
    await expectAccessible('clear checked dialog');
    expect(itemsApi.sent.cleared).toEqual([]);
    await dialog.getByRole('button', { name: 'Entfernen' }).click();

    await expect(page.getByRole('status')).toContainText('Erledigte Artikel entfernt');
    await expect(page.getByRole('checkbox', { name: 'Butter' })).toHaveCount(0);
    expect(itemsApi.sent.cleared).toEqual([{ itemIds: [BUTTER.id, YOGHURT.id] }]);
  });

  test('„Abbrechen“ keeps everything and returns focus to the button', async ({ page, itemsApi }) => {
    await page.goto(URL);
    await openCart(page);
    const button = cartSection(page).getByRole('button', { name: 'Erledigte entfernen' });
    await button.click();

    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

    await expect(button).toBeFocused();
    expect(itemsApi.sent.cleared).toEqual([]);
  });
});

test.describe('empty states and „Im Wagen“ @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [{ ...SHOP, openCount: 0 }] }, initialItems: { items: { [SHOP.id]: [] } } });

  test('an empty list says so and offers nothing to clear (FR-FB-01 AC2)', async ({ page, expectAccessible }) => {
    await page.goto(URL);

    await expect(openSection(page).getByText('Diese Liste ist noch leer')).toBeVisible();
    await expect(
      openSection(page).getByText('Füge oben den ersten Artikel hinzu. Alle Mitglieder sehen ihn sofort.'),
    ).toBeVisible();
    await expect(page.getByText(/erledigt$/)).toHaveCount(0);
    await openCart(page);
    await expect(cartSection(page).getByText('Noch nichts abgehakt.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Erledigte entfernen' })).toHaveCount(0);
    await expectAccessible('empty list');
  });

  test('„Im Wagen“ is folded on compact and a column on medium and expanded (FR-ITEM-06 AC1)', async ({ page }) => {
    await page.goto(URL);
    const compact = (page.viewportSize()?.width ?? 1280) < 600;
    const toggle = page.getByRole('button', { name: /^Im Wagen/ });

    if (compact) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByText('Noch nichts abgehakt.')).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('Noch nichts abgehakt.')).toBeVisible();
    } else {
      await expect(toggle).toHaveCount(0);
      await expect(page.getByText('Noch nichts abgehakt.')).toBeVisible();
    }
  });
});

test.describe('everything checked @shell', () => {
  test.use({ initialLists: { lists: [{ ...SHOP, openCount: 0 }] }, initialItems: { items: { [SHOP.id]: [BUTTER] } } });

  test('says „Alles im Wagen.“ (FR-FB-01 AC3)', async ({ page }) => {
    await page.goto(URL);

    await expect(openSection(page).getByText('Alles im Wagen.')).toBeVisible();
  });
});
