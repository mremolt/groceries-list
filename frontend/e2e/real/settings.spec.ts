import { type Page } from '@playwright/test';

import { pagesOf } from '../pages';
import { expect, test } from './fixtures';
import {
  APP,
  createListThroughUi,
  expectNoAxeViolations,
  loginThroughUi,
  meStatus,
  newDevice,
  newUser,
  PASSWORD,
  readShareLinkThroughUi,
  recordSecret,
  registerThroughUi,
  type TestUser,
} from './support';

// Acceptance of FR-SET-01..04 against the real BFF, database and identity provider (ADR 0003). Tag: @real.
// Deleting the account needs a new login at the identity provider (`?reauth=1`, `prompt=login`); the BFF returns to
// `/einstellungen?konto-loeschen`, where the final confirmation deletes (backend: DELETE /api/v1/me, 403 REAUTH_REQUIRED).

/** The new login the identity provider asks for before the account is deleted (ADR 0003). */
async function enterCredentialsAgain(page: Page, user: TestUser): Promise<void> {
  recordSecret(PASSWORD);
  await expect(page).toHaveURL(/keycloak\.localhost/);
  await pagesOf(page).auth.signIn(user.email, PASSWORD);
}

test.describe('@real settings and account', () => {
  test('FR-SET-01 / FR-SET-03: the name is saved and kept, the e-mail address is shown read-only', async ({
    page,
    shell,
    settings,
  }) => {
    const user = newUser('profile');
    await registerThroughUi(page, user);
    await page.getByRole('link', { name: 'Einstellungen' }).first().click();
    await expect(shell.heading('Einstellungen')).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expectNoAxeViolations(page, 'settings page (real stack)');

    await settings.saveDisplayName('Mara Neu');
    await expect(shell.status).toContainText('Gespeichert');

    await page.reload();
    await expect(settings.displayNameField).toHaveValue('Mara Neu');
    const me = await page.request.get(`${APP}/api/v1/me`);
    expect(await me.json()).toMatchObject({ displayName: 'Mara Neu', email: user.email });
  });

  test('FR-SET-01 AC1: an empty and a too long name are refused', async ({ page, settings }) => {
    await registerThroughUi(page, newUser('badname'));
    await page.goto('/einstellungen');

    await settings.saveDisplayName('   ');
    await expect(page.getByText('Fehler: Bitte gib einen Anzeigenamen ein.')).toBeVisible();
    await settings.saveDisplayName('a'.repeat(51));
    await expect(page.getByText('Fehler: Der Anzeigename darf höchstens 50 Zeichen lang sein.')).toBeVisible();
  });

  test('FR-SET-02: the theme choice is applied at once and stays on this device', async ({ page, shell, settings }) => {
    await registerThroughUi(page, newUser('theme'));
    await page.goto('/einstellungen');

    await settings.themeOption('Dunkel').click();
    await expect(shell.html).toHaveAttribute('data-color-scheme', 'dark');

    await page.reload();
    await expect(shell.html).toHaveAttribute('data-color-scheme', 'dark');
    await expect(settings.themeOption('Dunkel')).toBeChecked();
  });

  test('FR-SET-04 AC2: the account is deleted after a new login; all sessions end; shared lists stay for the others', async ({
    page,
    browser,
    settings,
  }) => {
    const owner = newUser('delete-owner');
    await registerThroughUi(page, owner);
    await createListThroughUi(page, 'Gemeinsam');
    const link = await readShareLinkThroughUi(page, 'Gemeinsam');
    const token = link.slice(link.lastIndexOf('/') + 1);
    await createListThroughUi(page, 'Nur ich');

    const guest = await newDevice(browser);
    await registerThroughUi(guest.page, newUser('delete-guest'));
    await guest.page.goto(`${APP}/j/${token}`);
    await expect(guest.shell.heading('Gemeinsam')).toBeVisible();

    const second = await newDevice(browser);
    await loginThroughUi(second.page, owner);
    await expect(second.shell.heading('Gemeinsam')).toBeVisible(); // signed in, first list opens

    await page.goto('/einstellungen');
    await settings.deleteAccount();
    await enterCredentialsAgain(page, owner);

    const dialog = settings.deleteAccountDialog;
    await expect(dialog.root).toBeVisible();
    await expect(page).toHaveURL(`${APP}/einstellungen`);
    await dialog.confirmButton.click();
    await expect(page).toHaveURL(/keycloak\.localhost/);

    expect(await meStatus(second.page.request), 'the other session of the person ended').toBe(401);
    await guest.page.reload();
    await expect(guest.shell.heading('Gemeinsam')).toBeVisible();
    await loginThroughUi(page, owner);
    await expect(page.getByText('E-Mail-Adresse oder Passwort ist falsch.')).toBeVisible();
    await second.context.close();
    await guest.context.close();
  });
});
