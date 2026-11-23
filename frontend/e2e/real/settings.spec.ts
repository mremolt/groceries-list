import { expect, type Page, test } from '@playwright/test';

import {
  APP,
  expectNoAxeViolations,
  loginThroughUi,
  meStatus,
  newDevice,
  newUser,
  PASSWORD,
  recordSecret,
  registerThroughUi,
  type TestUser,
} from './support';

// Acceptance of FR-SET-01..04 against the real BFF, database and identity provider (ADR 0003). Tag: @real.
// Deleting the account needs a new login at the identity provider (`?reauth=1`, `prompt=login`); the BFF returns to
// `/einstellungen?konto-loeschen`, where the final confirmation deletes (backend: DELETE /api/v1/me, 403 REAUTH_REQUIRED).

async function createList(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Neue Liste' }).first().click(); // drawer once a list exists, main when empty
  await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function readShareToken(page: Page, name: string): Promise<string> {
  await page.getByRole('button', { name: 'Liste teilen' }).click();
  const dialog = page.getByRole('dialog', { name: `„${name}“ teilen` });
  const link = await dialog.getByRole('textbox', { name: 'Teilen-Link' }).inputValue();
  const token = link.slice(link.lastIndexOf('/') + 1);
  recordSecret(token);
  await dialog.getByRole('button', { name: 'Fertig' }).click();
  return token;
}

/** The new login the identity provider asks for before the account is deleted (ADR 0003). */
async function enterCredentialsAgain(page: Page, user: TestUser): Promise<void> {
  recordSecret(PASSWORD);
  await expect(page).toHaveURL(/keycloak\.localhost/);
  await page.getByLabel('E-Mail-Adresse').fill(user.email);
  await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

test.describe('@real settings and account', () => {
  test('FR-SET-01 / FR-SET-03: the name is saved and kept, the e-mail address is shown read-only', async ({ page }) => {
    const user = newUser('profile');
    await registerThroughUi(page, user);
    await page.getByRole('link', { name: 'Einstellungen' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expectNoAxeViolations(page, 'settings page (real stack)');

    await page.getByLabel('Anzeigename').fill('Mara Neu');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('status')).toContainText('Gespeichert');

    await page.reload();
    await expect(page.getByLabel('Anzeigename')).toHaveValue('Mara Neu');
    const me = await page.request.get(`${APP}/api/v1/me`);
    expect(await me.json()).toMatchObject({ displayName: 'Mara Neu', email: user.email });
  });

  test('FR-SET-01 AC1: an empty and a too long name are refused', async ({ page }) => {
    await registerThroughUi(page, newUser('badname'));
    await page.goto('/einstellungen');

    await page.getByLabel('Anzeigename').fill('   ');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Fehler: Bitte gib einen Anzeigenamen ein.')).toBeVisible();
    await page.getByLabel('Anzeigename').fill('a'.repeat(51));
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Fehler: Der Anzeigename darf höchstens 50 Zeichen lang sein.')).toBeVisible();
  });

  test('FR-SET-02: the theme choice is applied at once and stays on this device', async ({ page }) => {
    await registerThroughUi(page, newUser('theme'));
    await page.goto('/einstellungen');

    await page.getByRole('radio', { name: 'Dunkel' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
    await expect(page.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
  });

  test('FR-SET-04 AC2: the account is deleted after a new login; all sessions end; shared lists stay for the others', async ({
    page,
    browser,
  }) => {
    const owner = newUser('delete-owner');
    await registerThroughUi(page, owner);
    await createList(page, 'Gemeinsam');
    const token = await readShareToken(page, 'Gemeinsam');
    await createList(page, 'Nur ich');

    const guest = await newDevice(browser);
    await registerThroughUi(guest.page, newUser('delete-guest'));
    await guest.page.goto(`${APP}/j/${token}`);
    await expect(guest.page.getByRole('heading', { level: 1, name: 'Gemeinsam' })).toBeVisible();

    const second = await newDevice(browser);
    await loginThroughUi(second.page, owner);
    await expect(second.page.getByRole('heading', { level: 1, name: 'Gemeinsam' })).toBeVisible(); // signed in, first list opens

    await page.goto('/einstellungen');
    await page.getByRole('button', { name: 'Konto löschen' }).click();
    await page.getByRole('dialog', { name: 'Konto löschen?' }).getByRole('button', { name: 'Konto löschen' }).click();
    await enterCredentialsAgain(page, owner);

    const dialog = page.getByRole('dialog', { name: 'Konto löschen?' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(`${APP}/einstellungen`);
    await dialog.getByRole('button', { name: 'Konto löschen' }).click();
    await expect(page).toHaveURL(/keycloak\.localhost/);

    expect(await meStatus(second.page.request), 'the other session of the person ended').toBe(401);
    await guest.page.reload();
    await expect(guest.page.getByRole('heading', { level: 1, name: 'Gemeinsam' })).toBeVisible();
    await loginThroughUi(page, owner);
    await expect(page.getByText('E-Mail-Adresse oder Passwort ist falsch.')).toBeVisible();
    await second.context.close();
    await guest.context.close();
  });
});
