import { expect, test } from './fixtures';
import { BBQ, WEEK, WG } from './fixtures/lists';

// Layout statement (NG-UI-23): lists live in the drawer (modal on compact/medium, permanent 360 px on expanded); the
// list page is one column under the app bar whose h1 is the list name; the ⋮ menu and all dialogs are the same on every
// size class. Compact and medium open the drawer first; the helpers below do that, so the scenarios run unchanged in
// every viewport project.

test.describe('start screen and deep links @responsive @shell @a11y-lists', () => {
  test.use({ initialLists: { lists: [WEEK, BBQ, WG] } });

  test('opens the first list when nothing was opened before (FR-NAV-03 AC1)', async ({ page, listsApi, shell }) => {
    await page.goto('/');

    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
    await expect(shell.heading(WEEK.name)).toBeVisible();
    await expect(page).toHaveTitle(`${WEEK.name} | Einkaufsliste`);
    expect(listsApi.listCalls(), 'request budget: one call for all drawer counts (API-N1-01)').toBe(1);
  });

  test('opens the list opened last on this device', async ({ page, shell }) => {
    await page.goto(`/listen/${BBQ.id}`);
    await expect(shell.heading(BBQ.name)).toBeVisible();

    await page.goto('/');

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
  });

  test('a list URL survives a reload and shows the drawer entries with counts (FR-NAV-06 AC1, FR-LIST-05)', async ({
    page,
    expectAccessible,
    shell,
  }) => {
    await page.goto(`/listen/${WG.id}`);
    await page.reload();

    await expect(shell.heading(WG.name)).toBeVisible();
    await shell.openDrawer();
    await expect(shell.listLink('Wocheneinkauf, 7 offen')).toBeVisible();
    await expect(shell.listLink('Grillabend Samstag, 0 offen')).toBeVisible();
    await expect(shell.listLink('WG-Vorrat, 12 offen')).toHaveAttribute('aria-current', 'page');
    await expectAccessible('list page with drawer');
  });

  test('a list that does not exist shows the same text as one without access (FR-NAV-06 AC2)', async ({
    page,
    expectAccessible,
    expectErrors,
    shell,
    lists,
  }) => {
    expectErrors(/status of 404/); // the browser logs the stubbed 404 of the unknown list
    await page.goto('/listen/00000000-0000-4000-8000-00000000ffff');

    await expect(page.getByText('Diese Liste gibt es nicht oder du hast keinen Zugriff.')).toBeVisible();
    await expect(shell.heading('Einkaufsliste')).toBeVisible();
    await expectAccessible('list not found');
    await lists.notFoundLink.click();
    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing, shell }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await expect(shell.heading(WEEK.name)).toBeVisible();

    await expectReflowAndTextSpacing();
  });

  test('choosing a list in the drawer opens it, moves focus to its heading and sets the title', async ({
    page,
    shell,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await shell.openDrawer();

    await shell.listLink('Grillabend Samstag, 0 offen').click();

    await expect(shell.heading(BBQ.name)).toBeFocused();
    await expect(page).toHaveTitle(`${BBQ.name} | Einkaufsliste`);
  });
});

test.describe('empty state and create list @responsive @shell @a11y-lists', () => {
  test('the empty state creates the first list (FR-FB-01 AC1, FR-LIST-01)', async ({
    page,
    listsApi,
    expectAccessible,
    shell,
    lists,
  }) => {
    await page.goto('/');
    await expect(lists.emptyStateHeading).toBeVisible();

    await lists.emptyStateCreateButton.click();
    const dialog = lists.createDialog;
    await expect(dialog.nameField).toBeFocused();
    await expectAccessible('create list dialog');
    await page.keyboard.type('Wocheneinkauf');
    await page.keyboard.press('Enter');

    await expect(shell.heading('Wocheneinkauf')).toBeVisible();
    await expect(shell.status).toContainText('Liste erstellt');
    expect(listsApi.sent.created).toEqual([{ name: 'Wocheneinkauf' }]);
    await shell.openDrawer();
    await expect(shell.listLink('Wocheneinkauf, 0 offen')).toHaveAttribute('aria-current', 'page');
  });

  test('refuses an empty name with the field error and keeps the dialog (FR-LIST-01 AC3, FR-FB-04)', async ({
    page,
    expectAccessible,
    lists,
  }) => {
    await page.goto('/');
    await lists.startCreate();
    const dialog = lists.createDialog;

    await dialog.createButton.click();

    await expect(dialog.root.getByText('Fehler: Bitte gib einen Namen ein.')).toBeVisible();
    await expect(dialog.nameField).toBeFocused();
    await expect(dialog.nameField).toHaveAttribute('aria-invalid', 'true');
    await expectAccessible('create list dialog with error');
  });

  test('refuses a name over 80 characters', async ({ page, lists }) => {
    await page.goto('/');
    await lists.startCreate();
    const dialog = lists.createDialog;

    await dialog.nameField.fill('x'.repeat(81));
    await page.keyboard.press('Enter');

    await expect(dialog.root.getByText('Fehler: Der Name darf höchstens 80 Zeichen lang sein.')).toBeVisible();
  });

  test('Esc closes the empty dialog, but keeps typed text and says so; „Abbrechen“ discards (UI-21)', async ({
    page,
    lists,
  }) => {
    await page.goto('/');
    await lists.startCreate();
    const dialog = lists.createDialog;
    await page.keyboard.press('Escape');
    await expect(dialog.root).toBeHidden();

    await lists.startCreate();
    await page.keyboard.type('Par');
    await page.keyboard.press('Escape');

    await expect(dialog.root).toBeVisible();
    await expect(dialog.root.getByText(/Du hast eine Eingabe gemacht/)).toBeVisible();
    await dialog.cancelButton.click();
    await expect(dialog.root).toBeHidden();
  });

  test('a server error keeps the typed name and shows the error snackbar (FR-FB-05)', async ({
    page,
    listsApi,
    expectErrors,
    lists,
  }) => {
    expectErrors(/status of 500/);
    await page.goto('/');
    await lists.startCreate();
    const dialog = lists.createDialog;
    listsApi.failNextWrite(500);

    await dialog.nameField.fill('Party');
    await page.keyboard.press('Enter');

    await expect(dialog.status).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(dialog.nameField).toHaveValue('Party');
  });

  test('the whole create journey works with the keyboard alone', async ({ page, shell, lists }) => {
    await page.goto('/');
    await expect(lists.emptyStateHeading).toBeVisible();
    const emptyStateButton = lists.emptyStateCreateButton;

    await emptyStateButton.focus();
    await page.keyboard.press('Enter');
    await expect(lists.createDialog.nameField).toBeFocused();
    await page.keyboard.type('Grillabend');
    await page.keyboard.press('Enter');

    await expect(shell.heading('Grillabend')).toBeFocused();
  });
});

test.describe('list commands in the ⋮ menu @responsive @shell @a11y-lists', () => {
  test.use({ initialLists: { lists: [WEEK, BBQ] } });

  test('lists the commands and works with Down, Up, Home, End and Esc (FR-NAV-05, NFR-A11Y-04)', async ({
    page,
    expectAccessible,
    shell,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await expect(shell.heading(WEEK.name)).toBeVisible();
    const button = shell.optionsButton;
    await button.focus();

    await page.keyboard.press('Enter');

    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menuItems = shell.menuItems;
    await expect(menuItems).toHaveText([
      /Liste umbenennen/,
      /Teilen-Link erneuern/,
      /Liste verlassen/,
      /Liste löschen/,
      /Einstellungen/,
      /Abmelden/,
    ]);
    await expect(menuItems.nth(0)).toBeFocused();
    await expectAccessible('list menu open');
    await page.keyboard.press('ArrowDown');
    await expect(menuItems.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(menuItems.nth(5)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(menuItems.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(menuItems.nth(5)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(shell.optionsMenu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('renames the list, shows the new name for everyone and says so (FR-LIST-02)', async ({
    page,
    listsApi,
    expectAccessible,
    shell,
    lists,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste umbenennen');

    const dialog = lists.renameDialog;
    await expect(dialog.root.getByText('Der neue Name ist für alle Mitglieder sichtbar.')).toBeVisible();
    await expect(dialog.nameField).toHaveValue('Wocheneinkauf');
    await expect(dialog.nameField).toBeFocused();
    await expectAccessible('rename dialog');
    await dialog.nameField.fill('Großeinkauf');
    await dialog.saveButton.click();

    await expect(shell.heading('Großeinkauf')).toBeVisible();
    await expect(shell.status).toContainText('Gespeichert');
    await expect(shell.optionsButton).toBeFocused();
    expect(listsApi.sent.renamed).toEqual([{ name: 'Großeinkauf' }]);
    await shell.openDrawer();
    await expect(shell.listLink('Großeinkauf, 7 offen')).toBeVisible();
  });

  test('cancelling a dialog returns focus to the ⋮ button because the menu item is gone (NG-UI-33)', async ({
    page,
    shell,
    lists,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste umbenennen');

    await lists.renameDialog.cancelButton.click();

    await expect(shell.optionsButton).toBeFocused();
  });

  test('asks before deleting, then deletes for everyone and opens the next list (FR-LIST-03, BR-11)', async ({
    page,
    listsApi,
    expectAccessible,
    shell,
    lists,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste löschen');

    const dialog = lists.deleteDialog('Wocheneinkauf');
    await expect(
      dialog.root.getByText('Die Liste wird für alle Mitglieder gelöscht. Das kann nicht rückgängig gemacht werden.'),
    ).toBeVisible();
    await expect(dialog.cancelButton).toBeFocused();
    await expectAccessible('delete dialog');
    expect(listsApi.sent.deleted).toEqual([]);
    await dialog.confirmButton.click();

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(shell.heading(BBQ.name)).toBeVisible();
    await expect(shell.status).toContainText('Liste gelöscht');
    expect(listsApi.sent.deleted).toEqual([WEEK.id]);
  });

  test('leaves the list after asking and shows the next one (FR-LIST-04)', async ({ page, listsApi, shell, lists }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste verlassen');

    const dialog = lists.leaveDialog('Wocheneinkauf');
    await expect(dialog.root.getByText(/Wenn du das letzte Mitglied bist, wird sie gelöscht/)).toBeVisible();
    await dialog.confirmButton.click();

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(shell.status).toContainText('Du hast die Liste verlassen');
    expect(listsApi.sent.left).toEqual([WEEK.id]);
  });

  test('leaving the last list shows the empty state', async ({ page, listsApi, shell, lists }) => {
    listsApi.lists.splice(1, 1); // only WEEK remains on the stubbed server
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste verlassen');

    await lists.leaveDialog().confirmButton.click();

    await expect(lists.emptyStateHeading).toBeVisible();
    await expect(shell.heading('Einkaufsliste')).toBeFocused();
  });

  test('a failed delete keeps the list and shows the error snackbar (FR-FB-05)', async ({
    page,
    listsApi,
    expectErrors,
    shell,
    lists,
  }) => {
    expectErrors(/status of 500/);
    await page.goto(`/listen/${WEEK.id}`);
    await shell.chooseOption('Liste löschen');
    listsApi.failNextWrite(500);

    await lists.deleteDialog().confirmButton.click();

    await expect(shell.status).toContainText('Das hat nicht geklappt');
    await expect(shell.heading(WEEK.name)).toBeVisible();
  });
});
