import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { stubUser } from './fixtures/session';

// Layout statement (NG-UI-23): one column of three cards (Profil, Darstellung, Konto) inside the shell's content width on
// every size class; the theme choice and the account rows fill the card; rows are at least 56 px high.

const LOGIN = /\/oauth2\/authorization\/keycloak/;

/** The BFF login is a whole-page navigation; the stubbed tier answers it with a plain page. */
async function stubLogin(page: Page): Promise<void> {
  await page.route(LOGIN, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Login</title><h1>Keycloak</h1>' }),
  );
}

test.describe('settings page @responsive @shell @a11y-settings', () => {
  test('shows the name, the theme choice and the account card (FR-SET-01..03)', async ({
    page,
    expectAccessible,
    expectReflowAndTextSpacing,
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

    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByLabel('Anzeigename')).toHaveValue(stubUser.displayName);
    await expect(page.getByText('So wirst du in der App angezeigt.')).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Design' })).toBeVisible();
    await expect(page.getByText(stubUser.email)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Konto löschen' })).toBeVisible();
    await expectAccessible('settings page');
    await expectReflowAndTextSpacing();
  });

  test('saves the trimmed name with the generated client body and says „Gespeichert“ (FR-SET-01 AC1)', async ({
    page,
    profileApi,
  }) => {
    await page.goto('/einstellungen');
    const field = page.getByLabel('Anzeigename');

    await field.fill('  Mara K ');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('status')).toContainText('Gespeichert');
    expect(profileApi.sent.patched).toEqual([{ displayName: 'Mara K' }]);
    await expect(field).toHaveValue('Mara K');
  });

  test('refuses an empty name and one over 50 characters before the request, with the field error (FR-FB-04)', async ({
    page,
    profileApi,
    expectAccessible,
  }) => {
    await page.goto('/einstellungen');
    const field = page.getByLabel('Anzeigename');

    await field.fill('   ');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Fehler: Bitte gib einen Anzeigenamen ein.')).toBeVisible();
    await expect(field).toBeFocused();
    await expectAccessible('settings page with a field error');

    await field.fill('a'.repeat(51));
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Fehler: Der Anzeigename darf höchstens 50 Zeichen lang sein.')).toBeVisible();
    expect(profileApi.sent.patched).toEqual([]);

    await field.fill('a'.repeat(50));
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('status')).toContainText('Gespeichert');
  });

  test('keeps the typed name and shows the error snackbar when saving fails (FR-FB-05)', async ({
    page,
    profileApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the browser logs the failed request itself
    profileApi.failNext('patch');
    await page.goto('/einstellungen');
    const field = page.getByLabel('Anzeigename');

    await field.fill('Mara K');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt');
    await expect(field).toHaveValue('Mara K');
  });
});

test.describe('theme @shell @a11y-settings', () => {
  test('applies the choice at once, remembers it on this device and goes back to the system (FR-SET-02)', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
    await page.goto('/einstellungen');
    const group = page.getByRole('radiogroup', { name: 'Design' });
    await expect(group.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(page.getByText('„System“ folgt der Einstellung deines Geräts.')).toBeVisible();

    await group.getByRole('radio', { name: 'Dunkel' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
    await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
    await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();

    await group.getByRole('radio', { name: 'System' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-color-scheme', /.+/);
  });

  test('can be chosen with the keyboard alone', async ({ page }) => {
    await page.goto('/einstellungen');
    const dark = page.getByRole('radio', { name: 'Dunkel' });

    await dark.focus();
    await page.keyboard.press('Space');

    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
  });
});

test.describe('delete account @responsive @shell @a11y-settings', () => {
  test('asks, then sends the whole page to the identity provider for a new login (FR-SET-04 AC1, ADR 0003)', async ({
    page,
    profileApi,
    expectAccessible,
  }) => {
    await stubLogin(page);
    await page.goto('/einstellungen');

    await page.getByRole('button', { name: 'Konto löschen' }).click();

    const dialog = page.getByRole('dialog', { name: 'Konto löschen?' });
    await expect(
      dialog.getByText(
        /Dein Konto wird dauerhaft gelöscht und du verlässt alle Listen\. Listen, in denen du das letzte Mitglied bist, werden ebenfalls gelöscht\./,
      ),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
    await expectAccessible('delete account dialog');
    await dialog.getByRole('button', { name: 'Konto löschen' }).click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak\?reauth=1$/);
    expect(profileApi.sent.deleted).toBe(0);
  });

  test('„Abbrechen“ keeps the account and returns focus to the row', async ({ page, profileApi }) => {
    await page.goto('/einstellungen');
    await page.getByRole('button', { name: 'Konto löschen' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Konto löschen' })).toBeFocused();
    expect(profileApi.sent.deleted).toBe(0);
  });

  test('back from the login: removes the marker, deletes on confirmation and goes to the login (FR-SET-04 AC2)', async ({
    page,
    profileApi,
    expectAccessible,
  }) => {
    await stubLogin(page);
    await page.goto('/einstellungen?konto-loeschen');

    const dialog = page.getByRole('dialog', { name: 'Konto löschen?' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/einstellungen$/);
    await expectAccessible('final delete account dialog');
    await dialog.getByRole('button', { name: 'Konto löschen' }).click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    expect(profileApi.sent.deleted).toBe(1);
  });

  test('starts the login again when it is too old for the identity provider', async ({
    page,
    profileApi,
    expectErrors,
  }) => {
    expectErrors(/status of 403/); // the browser logs the refused request itself
    await stubLogin(page);
    profileApi.state.reauthRequired = true;
    await page.goto('/einstellungen?konto-loeschen');

    await page.getByRole('dialog').getByRole('button', { name: 'Konto löschen' }).click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak\?reauth=1$/);
  });

  test('keeps the dialog and says so when deleting fails, and allows a second try (FR-FB-05)', async ({
    page,
    profileApi,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the browser logs the failed request itself
    await stubLogin(page);
    profileApi.failNext('delete');
    await page.goto('/einstellungen?konto-loeschen');
    const dialog = page.getByRole('dialog', { name: 'Konto löschen?' });

    await dialog.getByRole('button', { name: 'Konto löschen' }).click();

    await expect(dialog.getByRole('status')).toContainText('Das hat nicht geklappt');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Konto löschen' }).click();
    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    expect(profileApi.sent.deleted).toBe(2);
  });

  test('a reload does not open the confirmation again', async ({ page }) => {
    await page.goto('/einstellungen?konto-loeschen');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
