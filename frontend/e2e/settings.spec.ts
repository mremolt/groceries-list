import { expect, test } from './fixtures';
import { stubLogin, stubUser } from './fixtures/session';

// Layout statement (NG-UI-23): one column of three cards (Profil, Darstellung, Konto) inside the shell's content width on
// every size class; the theme choice and the account rows fill the card; rows are at least 56 px high.

test.describe('settings page @responsive @shell @a11y-settings', () => {
  test('shows the name, the theme choice and the account card (FR-SET-01..03)', async ({
    page,
    expectAccessible,
    expectReflowAndTextSpacing,
    shell,
    settings,
  }) => {
    // WCAG 1.4.12 as a reader's own stylesheet: present from the start, so Material measures the field label with it
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent =
        '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }';
      document.addEventListener('DOMContentLoaded', () => {
        document.head.append(style);
      });
    });
    await page.goto('/einstellungen');

    await expect(shell.heading('Einstellungen')).toBeVisible();
    await expect(settings.displayNameField).toHaveValue(stubUser.displayName);
    await expect(page.getByText('So wirst du in der App angezeigt.')).toBeVisible();
    await expect(settings.themeGroup).toBeVisible();
    await expect(page.getByText(stubUser.email)).toBeVisible();
    await expect(settings.signOutButton).toBeVisible();
    await expect(settings.deleteAccountButton).toBeVisible();
    await expectAccessible('settings page');
    await expectReflowAndTextSpacing();
  });

  test('saves the trimmed name with the generated client body and says „Gespeichert“ (FR-SET-01 AC1)', async ({
    page,
    profileApi,
    shell,
    settings,
  }) => {
    await page.goto('/einstellungen');
    const field = settings.displayNameField;

    await settings.saveDisplayName('  Mara K ');

    await expect(shell.status).toContainText('Gespeichert');
    expect(profileApi.sent.patched).toEqual([{ displayName: 'Mara K' }]);
    await expect(field).toHaveValue('Mara K');
  });

  test('refuses an empty name and one over 50 characters before the request, with the field error (FR-FB-04)', async ({
    page,
    profileApi,
    expectAccessible,
    shell,
    settings,
  }) => {
    await page.goto('/einstellungen');
    const field = settings.displayNameField;

    await settings.saveDisplayName('   ');
    await expect(page.getByText('Fehler: Bitte gib einen Anzeigenamen ein.')).toBeVisible();
    await expect(field).toBeFocused();
    await expectAccessible('settings page with a field error');

    await settings.saveDisplayName('a'.repeat(51));
    await expect(page.getByText('Fehler: Der Anzeigename darf höchstens 50 Zeichen lang sein.')).toBeVisible();
    expect(profileApi.sent.patched).toEqual([]);

    await settings.saveDisplayName('a'.repeat(50));
    await expect(shell.status).toContainText('Gespeichert');
  });

  test('keeps the typed name and shows the error snackbar when saving fails (FR-FB-05)', async ({
    page,
    profileApi,
    expectErrors,
    shell,
    settings,
  }) => {
    expectErrors(/status of 500/); // the browser logs the failed request itself
    profileApi.failNext('patch');
    await page.goto('/einstellungen');
    const field = settings.displayNameField;

    await settings.saveDisplayName('Mara K');

    await expect(shell.status).toContainText('Das hat nicht geklappt');
    await expect(field).toHaveValue('Mara K');
  });
});

test.describe('theme @shell @a11y-settings', () => {
  test('applies the choice at once, remembers it on this device and goes back to the system (FR-SET-02)', async ({
    page,
    shell,
    settings,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
    await page.goto('/einstellungen');
    const group = settings.themeGroup;
    await expect(group.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(page.getByText('„System“ folgt der Einstellung deines Geräts.')).toBeVisible();

    await group.getByRole('radio', { name: 'Dunkel' }).click();

    await expect(shell.html).toHaveAttribute('data-color-scheme', 'dark');
    await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
    await page.reload();
    await expect(shell.html).toHaveAttribute('data-color-scheme', 'dark');
    await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();

    await group.getByRole('radio', { name: 'System' }).click();
    await expect(shell.html).not.toHaveAttribute('data-color-scheme', /.+/);
  });

  test('can be chosen with the keyboard alone', async ({ page, shell, settings }) => {
    await page.goto('/einstellungen');
    const dark = settings.themeOption('Dunkel');

    await dark.focus();
    await page.keyboard.press('Space');

    await expect(shell.html).toHaveAttribute('data-color-scheme', 'dark');
  });
});

test.describe('delete account @responsive @shell @a11y-settings', () => {
  test('asks, then sends the whole page to the identity provider for a new login (FR-SET-04 AC1, ADR 0003)', async ({
    page,
    profileApi,
    expectAccessible,
    settings,
  }) => {
    await stubLogin(page);
    await page.goto('/einstellungen');

    await settings.deleteAccountButton.click();

    const dialog = settings.deleteAccountDialog;
    await expect(
      dialog.root.getByText(
        /Dein Konto wird dauerhaft gelöscht und du verlässt alle Listen\. Listen, in denen du das letzte Mitglied bist, werden ebenfalls gelöscht\./,
      ),
    ).toBeVisible();
    await expect(dialog.cancelButton).toBeFocused();
    await expectAccessible('delete account dialog');
    await dialog.confirmButton.click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak\?reauth=1$/);
    expect(profileApi.sent.deleted).toBe(0);
  });

  test('„Abbrechen“ keeps the account and returns focus to the row', async ({ page, profileApi, shell, settings }) => {
    await page.goto('/einstellungen');
    await settings.deleteAccountButton.click();

    await settings.deleteAccountDialog.cancelButton.click();

    await expect(shell.anyDialog).toHaveCount(0);
    await expect(settings.deleteAccountButton).toBeFocused();
    expect(profileApi.sent.deleted).toBe(0);
  });

  test('back from the login: removes the marker, deletes on confirmation and goes to the login (FR-SET-04 AC2)', async ({
    page,
    profileApi,
    expectAccessible,
    settings,
  }) => {
    await stubLogin(page);
    await page.goto('/einstellungen?konto-loeschen');

    const dialog = settings.deleteAccountDialog;
    await expect(dialog.root).toBeVisible();
    await expect(page).toHaveURL(/\/einstellungen$/);
    await expectAccessible('final delete account dialog');
    await dialog.confirmButton.click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    expect(profileApi.sent.deleted).toBe(1);
  });

  test('starts the login again when it is too old for the identity provider', async ({
    page,
    profileApi,
    expectErrors,
    settings,
  }) => {
    expectErrors(/status of 403/); // the browser logs the refused request itself
    await stubLogin(page);
    profileApi.state.reauthRequired = true;
    await page.goto('/einstellungen?konto-loeschen');

    await settings.deleteAccountDialog.confirmButton.click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak\?reauth=1$/);
  });

  test('keeps the dialog and says so when deleting fails, and allows a second try (FR-FB-05)', async ({
    page,
    profileApi,
    expectErrors,
    settings,
  }) => {
    expectErrors(/status of 500/); // the browser logs the failed request itself
    await stubLogin(page);
    profileApi.failNext('delete');
    await page.goto('/einstellungen?konto-loeschen');
    const dialog = settings.deleteAccountDialog;

    await dialog.confirmButton.click();

    await expect(dialog.status).toContainText('Das hat nicht geklappt');
    await expect(dialog.root).toBeVisible();
    await dialog.confirmButton.click();
    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    expect(profileApi.sent.deleted).toBe(2);
  });

  test('a reload does not open the confirmation again', async ({ page, shell, settings }) => {
    await page.goto('/einstellungen?konto-loeschen');
    await expect(shell.anyDialog).toBeVisible();
    await settings.deleteAccountDialog.cancelButton.click();

    await page.reload();

    await expect(shell.heading('Einstellungen')).toBeVisible();
    await expect(shell.anyDialog).toHaveCount(0);
  });
});
