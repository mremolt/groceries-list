import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BBQ, WEEK, WG } from './fixtures/lists';

// Layout statement (NG-UI-23): lists live in the drawer (modal on compact/medium, permanent 360 px on expanded); the
// list page is one column under the app bar whose h1 is the list name; the ⋮ menu and all dialogs are the same on every
// size class. Compact and medium open the drawer first; the helpers below do that, so the scenarios run unchanged in
// every viewport project.

async function openDrawer(page: Page): Promise<void> {
  const modal = (page.viewportSize()?.width ?? 1280) < 840; // below the expanded breakpoint the drawer is modal
  if (modal) await page.getByRole('button', { name: 'Navigation öffnen' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
}

async function startCreateList(page: Page): Promise<void> {
  await openDrawer(page);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Neue Liste' }).click();
  await expect(page.getByRole('dialog', { name: 'Neue Liste' })).toBeVisible();
}

test.describe('start screen and deep links @responsive @shell @a11y-lists', () => {
  test.use({ initialLists: { lists: [WEEK, BBQ, WG] } });

  test('opens the first list when nothing was opened before (FR-NAV-03 AC1)', async ({ page, listsApi }) => {
    await page.goto('/');

    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: WEEK.name })).toBeVisible();
    await expect(page).toHaveTitle(`${WEEK.name} | Einkaufsliste`);
    expect(listsApi.listCalls(), 'request budget: one call for all drawer counts (API-N1-01)').toBe(1);
  });

  test('opens the list opened last on this device', async ({ page }) => {
    await page.goto(`/listen/${BBQ.id}`);
    await expect(page.getByRole('heading', { level: 1, name: BBQ.name })).toBeVisible();

    await page.goto('/');

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
  });

  test('a list URL survives a reload and shows the drawer entries with counts (FR-NAV-06 AC1, FR-LIST-05)', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WG.id}`);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: WG.name })).toBeVisible();
    await openDrawer(page);
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav.getByRole('link', { name: 'Wocheneinkauf, 7 offen' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Grillabend Samstag, 0 offen' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'WG-Vorrat, 12 offen' })).toHaveAttribute('aria-current', 'page');
    await expectAccessible('list page with drawer');
  });

  test('a list that does not exist shows the same text as one without access (FR-NAV-06 AC2)', async ({
    page,
    expectAccessible,
    expectErrors,
  }) => {
    expectErrors(/status of 404/); // the browser logs the stubbed 404 of the unknown list
    await page.goto('/listen/00000000-0000-4000-8000-00000000ffff');

    await expect(page.getByText('Diese Liste gibt es nicht oder du hast keinen Zugriff.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeVisible();
    await expectAccessible('list not found');
    await page.getByRole('link', { name: 'Zu meinen Listen' }).click();
    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await expect(page.getByRole('heading', { level: 1, name: WEEK.name })).toBeVisible();

    await expectReflowAndTextSpacing();
  });

  test('choosing a list in the drawer opens it, moves focus to its heading and sets the title', async ({ page }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await openDrawer(page);

    await page.getByRole('link', { name: 'Grillabend Samstag, 0 offen' }).click();

    await expect(page.getByRole('heading', { level: 1, name: BBQ.name })).toBeFocused();
    await expect(page).toHaveTitle(`${BBQ.name} | Einkaufsliste`);
  });
});

test.describe('empty state and create list @responsive @shell @a11y-lists', () => {
  test('the empty state creates the first list (FR-FB-01 AC1, FR-LIST-01)', async ({
    page,
    listsApi,
    expectAccessible,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();

    await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
    const dialog = page.getByRole('dialog', { name: 'Neue Liste' });
    await expect(dialog.getByLabel('Name der Liste')).toBeFocused();
    await expectAccessible('create list dialog');
    await page.keyboard.type('Wocheneinkauf');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 1, name: 'Wocheneinkauf' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Liste erstellt');
    expect(listsApi.sent.created).toEqual([{ name: 'Wocheneinkauf' }]);
    await openDrawer(page);
    await expect(page.getByRole('link', { name: 'Wocheneinkauf, 0 offen' })).toHaveAttribute('aria-current', 'page');
  });

  test('refuses an empty name with the field error and keeps the dialog (FR-LIST-01 AC3, FR-FB-04)', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto('/');
    await startCreateList(page);
    const dialog = page.getByRole('dialog', { name: 'Neue Liste' });

    await dialog.getByRole('button', { name: 'Erstellen' }).click();

    await expect(dialog.getByText('Fehler: Bitte gib einen Namen ein.')).toBeVisible();
    await expect(dialog.getByLabel('Name der Liste')).toBeFocused();
    await expect(dialog.getByLabel('Name der Liste')).toHaveAttribute('aria-invalid', 'true');
    await expectAccessible('create list dialog with error');
  });

  test('refuses a name over 80 characters', async ({ page }) => {
    await page.goto('/');
    await startCreateList(page);
    const dialog = page.getByRole('dialog', { name: 'Neue Liste' });

    await dialog.getByLabel('Name der Liste').fill('x'.repeat(81));
    await page.keyboard.press('Enter');

    await expect(dialog.getByText('Fehler: Der Name darf höchstens 80 Zeichen lang sein.')).toBeVisible();
  });

  test('Esc closes the empty dialog, but keeps typed text and says so; „Abbrechen“ discards (UI-21)', async ({
    page,
  }) => {
    await page.goto('/');
    await startCreateList(page);
    const dialog = page.getByRole('dialog', { name: 'Neue Liste' });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await startCreateList(page);
    await page.keyboard.type('Par');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Du hast eine Eingabe gemacht/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(dialog).toBeHidden();
  });

  test('a server error keeps the typed name and shows the error snackbar (FR-FB-05)', async ({
    page,
    listsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/);
    await page.goto('/');
    await startCreateList(page);
    const dialog = page.getByRole('dialog', { name: 'Neue Liste' });
    listsApi.failNextWrite(500);

    await dialog.getByLabel('Name der Liste').fill('Party');
    await page.keyboard.press('Enter');

    await expect(dialog.getByRole('status')).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(dialog.getByLabel('Name der Liste')).toHaveValue('Party');
  });

  test('the whole create journey works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
    const emptyStateButton = page.getByRole('main').getByRole('button', { name: 'Neue Liste' });

    await emptyStateButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste')).toBeFocused();
    await page.keyboard.type('Grillabend');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 1, name: 'Grillabend' })).toBeFocused();
  });
});

test.describe('list commands in the ⋮ menu @responsive @shell @a11y-lists', () => {
  test.use({ initialLists: { lists: [WEEK, BBQ] } });

  test('lists the commands and works with Down, Up, Home, End and Esc (FR-NAV-05, NFR-A11Y-04)', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await expect(page.getByRole('heading', { level: 1, name: WEEK.name })).toBeVisible();
    const button = page.getByRole('button', { name: 'Weitere Optionen' });
    await button.focus();

    await page.keyboard.press('Enter');

    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = page.getByRole('menuitem');
    await expect(items).toHaveText([
      /Liste umbenennen/,
      /Liste verlassen/,
      /Liste löschen/,
      /Einstellungen/,
      /Abmelden/,
    ]);
    await expect(items.nth(0)).toBeFocused();
    await expectAccessible('list menu open');
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.nth(4)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(4)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('renames the list, shows the new name for everyone and says so (FR-LIST-02)', async ({
    page,
    listsApi,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();

    const dialog = page.getByRole('dialog', { name: 'Liste umbenennen' });
    await expect(dialog.getByText('Der neue Name ist für alle Mitglieder sichtbar.')).toBeVisible();
    await expect(dialog.getByLabel('Name der Liste')).toHaveValue('Wocheneinkauf');
    await expect(dialog.getByLabel('Name der Liste')).toBeFocused();
    await expectAccessible('rename dialog');
    await dialog.getByLabel('Name der Liste').fill('Großeinkauf');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Großeinkauf' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Gespeichert');
    await expect(page.getByRole('button', { name: 'Weitere Optionen' })).toBeFocused();
    expect(listsApi.sent.renamed).toEqual([{ name: 'Großeinkauf' }]);
    await openDrawer(page);
    await expect(page.getByRole('link', { name: 'Großeinkauf, 7 offen' })).toBeVisible();
  });

  test('cancelling a dialog returns focus to the ⋮ button because the menu item is gone (NG-UI-33)', async ({
    page,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste umbenennen' }).click();

    await page.getByRole('dialog', { name: 'Liste umbenennen' }).getByRole('button', { name: 'Abbrechen' }).click();

    await expect(page.getByRole('button', { name: 'Weitere Optionen' })).toBeFocused();
  });

  test('asks before deleting, then deletes for everyone and opens the next list (FR-LIST-03, BR-11)', async ({
    page,
    listsApi,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste löschen' }).click();

    const dialog = page.getByRole('dialog', { name: '„Wocheneinkauf“ löschen?' });
    await expect(
      dialog.getByText('Die Liste wird für alle Mitglieder gelöscht. Das kann nicht rückgängig gemacht werden.'),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
    await expectAccessible('delete dialog');
    expect(listsApi.sent.deleted).toEqual([]);
    await dialog.getByRole('button', { name: 'Löschen' }).click();

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: BBQ.name })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Liste gelöscht');
    expect(listsApi.sent.deleted).toEqual([WEEK.id]);
  });

  test('leaves the list after asking and shows the next one (FR-LIST-04)', async ({ page, listsApi }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste verlassen' }).click();

    const dialog = page.getByRole('dialog', { name: '„Wocheneinkauf“ verlassen?' });
    await expect(dialog.getByText(/Wenn du das letzte Mitglied bist, wird sie gelöscht/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Verlassen' }).click();

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(page.getByRole('status')).toContainText('Du hast die Liste verlassen');
    expect(listsApi.sent.left).toEqual([WEEK.id]);
  });

  test('leaving the last list shows the empty state', async ({ page, listsApi }) => {
    listsApi.lists.splice(1, 1); // only WEEK remains on the stubbed server
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste verlassen' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Verlassen' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeFocused();
  });

  test('a failed delete keeps the list and shows the error snackbar (FR-FB-05)', async ({
    page,
    listsApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/);
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Liste löschen' }).click();
    listsApi.failNextWrite(500);

    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();

    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt');
    await expect(page.getByRole('heading', { level: 1, name: WEEK.name })).toBeVisible();
  });
});
