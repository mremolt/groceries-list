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

test.describe('the sections @responsive @shell @a11y-items', () => {
  test.use({
    initialLists: { lists: [SHOP] },
    initialItems: { items: { [SHOP.id]: [MILK, BREAD, EGGS, BUTTER, YOGHURT] } },
  });

  test('shows open items oldest first, the checked ones in „Im Wagen“, badge and progress (FR-ITEM-02 AC4, BR-09)', async ({
    page,
    itemsApi,
    expectAccessible,
    items,
  }) => {
    await page.goto(URL);

    await expect(items.openItems).toHaveCount(3);
    await expect(items.openItems.first()).toHaveAccessibleName('2× Milch, laktosefrei');
    await expect(items.openHeading).toContainText('3');
    await expect(items.openSection.getByText('2 von 5 erledigt')).toBeVisible();
    await items.openCart();
    await expect(items.cartItem('Butter')).toBeChecked();
    await expect(items.clearCheckedButton).toBeVisible();
    expect(itemsApi.loadCalls(), 'request budget: one call for all items (API-N1-01)').toBe(1);
    await expectAccessible('list page with items');
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing, items }) => {
    await page.goto(URL);
    await expect(items.openItems).toHaveCount(3);

    await expectReflowAndTextSpacing();
  });

  test('the drawer count follows the items without another list request (FR-LIST-05, API-N1-01)', async ({
    page,
    listsApi,
    items,
  }) => {
    await page.goto(URL);
    await items.openItem('Vollkornbrot').click(); // not `check()`: the item moves away

    await expect(items.openSection.getByText('3 von 5 erledigt')).toBeVisible();
    await expect(items.openHeading).toContainText('2');
    expect(listsApi.listCalls()).toBe(1);
  });
});

test.describe('add an item @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [SHOP] }, initialItems: { items: { [SHOP.id]: [MILK] } } });

  test('adds several items in a row; the field is cleared and keeps the focus (FR-ITEM-01 AC2/AC3)', async ({
    page,
    itemsApi,
    items,
  }) => {
    await page.goto(URL);
    const field = items.addField;
    await field.focus();

    await page.keyboard.type('Käse');
    await page.keyboard.press('Enter');
    await expect(items.openItem('Käse')).toBeVisible();
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('');
    await page.keyboard.type('Äpfel');
    await page.keyboard.press('Enter');

    await expect(items.openItem('Äpfel')).toBeVisible();
    await expect(items.openItems).toHaveCount(3);
    expect(itemsApi.sent.added).toEqual([{ text: 'Käse' }, { text: 'Äpfel' }]);
  });

  test('the button adds too and puts the focus back into the field; duplicates are allowed (AC6)', async ({
    page,
    items,
  }) => {
    await page.goto(URL);
    const field = items.addField;

    await field.fill('2× Milch, laktosefrei');
    await items.addButton.click();

    await expect(items.openItem('2× Milch, laktosefrei')).toHaveCount(2);
    await expect(field).toBeFocused();
  });

  test('refuses an empty input and one over 200 characters with the field error (AC4)', async ({
    page,
    expectAccessible,
    items,
  }) => {
    await page.goto(URL);
    const field = items.addField;

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
    shell,
    items,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    const field = items.addField;
    itemsApi.failNextWrite(500);

    await field.fill('Käse');
    await field.press('Enter');

    await expect(shell.status).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(field).toHaveValue('Käse');
    await expect(items.openItem('Käse')).toHaveCount(0);
  });

  test('the add button has the accessible name „Hinzufügen“ (AC1)', async ({ page, items }) => {
    await page.goto(URL);

    await expect(items.addButton).toBeVisible();
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
    items,
  }) => {
    await page.goto(URL);
    await items.openItem('2× Milch, laktosefrei').focus();

    await page.keyboard.press('Space');

    await expect(items.openItem('Vollkornbrot')).toBeFocused();
    await expect(items.openItems).toHaveCount(2);
    await items.openCart();
    await expect(items.cartItem('2× Milch, laktosefrei')).toBeChecked();
    expect(itemsApi.sent.patched).toEqual([{ id: MILK.id, body: { done: true } }]);
  });

  test('checking the last item moves the focus to the previous one', async ({ page, items }) => {
    await page.goto(URL);
    await items.openItem('6 Eier').focus();

    await page.keyboard.press('Space');

    await expect(items.openItem('Vollkornbrot')).toBeFocused();
  });

  test('an unchecked item returns to its position per BR-09 (AC1)', async ({ page, items }) => {
    await page.goto(URL);
    await items.openCart();

    await items.cartItem('Butter').click(); // not `uncheck()`: the item moves away

    await expect(items.openItems).toHaveCount(4);
    await expect(items.openItems.last()).toHaveAccessibleName('Butter');
  });

  test('undoes the change and shows the error snackbar when saving fails (AC2, FR-FB-05 AC1)', async ({
    page,
    itemsApi,
    expectErrors,
    shell,
    items,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    itemsApi.failNextWrite(500);

    // `click()`, not `check()`: `check()` clicks again when the rollback undoes the first click, which would use up
    // the stubbed failure only once and then succeed
    await items.openItem('Vollkornbrot').click();

    await expect(shell.status).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(items.openItem('Vollkornbrot')).not.toBeChecked();
    await expect(items.openItems).toHaveCount(3);
  });

  test('says so when somebody deleted the item in the meantime (FR-FB-02 AC5)', async ({
    page,
    itemsApi,
    expectErrors,
    shell,
    items,
  }) => {
    expectErrors(/status of 404/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    await expect(items.openItem('Vollkornbrot')).toBeVisible();
    itemsApi.deleteBehindTheBack(SHOP.id, BREAD.id);

    await items.openItem('Vollkornbrot').click();

    await expect(shell.status).toContainText('Dieser Artikel wurde inzwischen gelöscht.');
    await expect(items.item('Vollkornbrot')).toHaveCount(0);
  });
});

test.describe('edit and delete @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [SHOP] }, initialItems: { items: { [SHOP.id]: [MILK, BREAD, BUTTER] } } });

  test('edits the text in the dialog and says „Gespeichert“ (FR-ITEM-03)', async ({
    page,
    itemsApi,
    expectAccessible,
    shell,
    items,
  }) => {
    await page.goto(URL);
    const opener = items.editButton('Vollkornbrot');
    await opener.click();

    const dialog = items.editDialog;
    await expect(dialog.root.getByText('Änderungen sind sofort für alle Mitglieder sichtbar.')).toBeVisible();
    await expect(dialog.textField).toHaveValue('Vollkornbrot');
    await expect(dialog.textField).toBeFocused();
    await expectAccessible('edit item dialog');
    await dialog.textField.fill('Roggenbrot');
    await dialog.saveButton.click();

    await expect(shell.status).toContainText('Gespeichert');
    await expect(items.openItem('Roggenbrot')).toBeVisible();
    await expect(items.editButton('Roggenbrot')).toBeFocused();
    expect(itemsApi.sent.patched).toEqual([{ id: BREAD.id, body: { text: 'Roggenbrot' } }]);
  });

  test('„Abbrechen“ discards; checked items have no edit button (AC2/AC3)', async ({ page, itemsApi, items }) => {
    await page.goto(URL);
    await items.openCart();
    await expect(items.cartSection.getByRole('button', { name: /bearbeiten/ })).toHaveCount(0);
    await items.editButton('Vollkornbrot').click();
    const dialog = items.editDialog;
    await dialog.textField.fill('Anderes');

    await dialog.cancelButton.click();

    await expect(dialog.root).toBeHidden();
    await expect(items.openItem('Vollkornbrot')).toBeVisible();
    expect(itemsApi.sent.patched).toEqual([]);
  });

  test('refuses an empty text in the dialog and keeps it open (AC2)', async ({ page, items }) => {
    await page.goto(URL);
    await items.editButton('Vollkornbrot').click();
    const dialog = items.editDialog;

    await dialog.textField.fill('');
    await dialog.saveButton.click();

    await expect(dialog.root.getByText('Fehler: Bitte gib einen Artikel ein.')).toBeVisible();
  });

  test('deletes at once without a further question (FR-ITEM-04, BR-11)', async ({ page, itemsApi, shell, items }) => {
    await page.goto(URL);
    await items.remove('Vollkornbrot');

    await expect(shell.anyDialog).toHaveCount(0);
    await expect(items.item('Vollkornbrot')).toHaveCount(0);
    await expect(items.addField).toBeFocused();
    expect(itemsApi.sent.deleted).toEqual([BREAD.id]);
  });

  test('keeps the typed text and the dialog when saving fails (FR-FB-05 AC2)', async ({
    page,
    itemsApi,
    expectErrors,
    items,
  }) => {
    expectErrors(/status of 500/); // the stub answers like a failing server (TS-TEST-32)
    await page.goto(URL);
    await items.editButton('Vollkornbrot').click();
    const dialog = items.editDialog;
    itemsApi.failNextWrite(500);

    await dialog.textField.fill('Roggenbrot');
    await dialog.saveButton.click();

    await expect(dialog.root.getByText('Das hat nicht geklappt. Bitte versuche es noch einmal.')).toBeVisible();
    await expect(dialog.textField).toHaveValue('Roggenbrot');
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
    shell,
    items,
  }) => {
    await page.goto(URL);
    await items.openCart();
    await items.clearCheckedButton.click();

    const dialog = items.clearCheckedDialog;
    await expect(dialog.root.getByText('2 erledigte Artikel werden für alle Mitglieder entfernt.')).toBeVisible();
    await expect(dialog.cancelButton).toBeFocused();
    await expectAccessible('clear checked dialog');
    expect(itemsApi.sent.cleared).toEqual([]);
    await dialog.confirmButton.click();

    await expect(shell.status).toContainText('Erledigte Artikel entfernt');
    await expect(items.item('Butter')).toHaveCount(0);
    expect(itemsApi.sent.cleared).toEqual([{ itemIds: [BUTTER.id, YOGHURT.id] }]);
  });

  test('„Abbrechen“ keeps everything and returns focus to the button', async ({ page, itemsApi, items }) => {
    await page.goto(URL);
    await items.openCart();
    const button = items.clearCheckedButton;
    await button.click();

    await items.clearCheckedDialog.cancelButton.click();

    await expect(button).toBeFocused();
    expect(itemsApi.sent.cleared).toEqual([]);
  });
});

test.describe('empty states and „Im Wagen“ @responsive @shell @a11y-items', () => {
  test.use({ initialLists: { lists: [{ ...SHOP, openCount: 0 }] }, initialItems: { items: { [SHOP.id]: [] } } });

  test('an empty list says so and offers nothing to clear (FR-FB-01 AC2)', async ({
    page,
    expectAccessible,
    items,
  }) => {
    await page.goto(URL);

    await expect(items.openSection.getByText('Diese Liste ist noch leer')).toBeVisible();
    await expect(
      items.openSection.getByText('Füge oben den ersten Artikel hinzu. Alle Mitglieder sehen ihn sofort.'),
    ).toBeVisible();
    await expect(page.getByText(/erledigt$/)).toHaveCount(0);
    await items.openCart();
    await expect(items.cartSection.getByText('Noch nichts abgehakt.')).toBeVisible();
    await expect(items.clearCheckedButton).toHaveCount(0);
    await expectAccessible('empty list');
  });

  test.describe('„Im Wagen“ (FR-ITEM-06 AC1)', () => {
    test.describe('on a compact window', () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test('is a folded card that opens with its toggle', async ({ page, items }) => {
        await page.goto(URL);
        const toggle = items.cartToggle;

        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByText('Noch nichts abgehakt.')).toBeHidden();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByText('Noch nichts abgehakt.')).toBeVisible();
      });
    });

    test.describe('on a medium or expanded window', () => {
      test.use({ viewport: { width: 1280, height: 800 } });

      test('is a column without a toggle', async ({ page, items }) => {
        await page.goto(URL);

        await expect(items.cartToggle).toHaveCount(0);
        await expect(page.getByText('Noch nichts abgehakt.')).toBeVisible();
      });
    });
  });
});

test.describe('everything checked @shell', () => {
  test.use({ initialLists: { lists: [{ ...SHOP, openCount: 0 }] }, initialItems: { items: { [SHOP.id]: [BUTTER] } } });

  test('says „Alles im Wagen.“ (FR-FB-01 AC3)', async ({ page, items }) => {
    await page.goto(URL);

    await expect(items.openSection.getByText('Alles im Wagen.')).toBeVisible();
  });
});
