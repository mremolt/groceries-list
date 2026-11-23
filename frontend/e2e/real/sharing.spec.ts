import { expect, type Page, test } from '@playwright/test';

import {
  APP,
  expectNoAxeViolations,
  logoutThroughMenu,
  newDevice,
  newUser,
  PASSWORD,
  recordSecret,
  registerThroughUi,
  type TestUser,
} from './support';

// Acceptance of FR-SHARE-01..04 and FR-AUTH-06 against the real BFF, database and identity provider (ADR 0003, 0008). Tag: @real.
// Share tokens are recorded as secrets: the run fails when one shows up in the application log (NFR-SEC-09, ADR 0008).

async function createList(page: Page, name: string): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Neue Liste' }).click();
  await page.getByRole('dialog', { name: 'Neue Liste' }).getByLabel('Name der Liste').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

/** Opens the share dialog of the open list, answers the link and closes it again. */
async function readShareLink(page: Page, name: string): Promise<string> {
  await page.getByRole('button', { name: 'Liste teilen' }).click();
  const dialog = page.getByRole('dialog', { name: `„${name}“ teilen` });
  const field = dialog.getByRole('textbox', { name: 'Teilen-Link' });
  await expect(field).toBeVisible();
  const link = await field.inputValue();
  recordSecret(tokenOf(link));
  await dialog.getByRole('button', { name: 'Fertig' }).click();
  await expect(dialog).toBeHidden();
  return link;
}

function tokenOf(link: string): string {
  return link.slice(link.lastIndexOf('/') + 1);
}

/** The link carries the public base URL; the browser of the test reaches the app at `APP`. */
function localLink(link: string): string {
  return `${APP}/j/${tokenOf(link)}`;
}

async function fillRegistration(page: Page, user: TestUser): Promise<void> {
  recordSecret(PASSWORD);
  await page.getByLabel('Anzeigename').fill(user.displayName);
  await page.getByLabel('E-Mail-Adresse').fill(user.email);
  await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
}

test.describe('@real sharing', () => {
  test('FR-AUTH-06 / FR-SHARE-03: a visitor signs up from the link, joins automatically and sees the list', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner'));
    await createList(page, 'Grillabend');
    const link = await readShareLink(page, 'Grillabend');

    const guest = await newDevice(browser);
    await guest.page.goto(localLink(link));
    await expect(
      guest.page.getByText(
        'Du wurdest zur Liste „Grillabend“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.',
      ),
    ).toBeVisible();
    await expectNoAxeViolations(guest.page, 'invitation page (real stack)');
    await guest.page.getByRole('button', { name: 'Konto erstellen und beitreten' }).click();
    await expect(guest.page).toHaveURL(/keycloak\.localhost/);
    await fillRegistration(guest.page, newUser('guest'));

    await expect(guest.page).toHaveURL(new RegExp(`^${APP}/listen/`));
    await expect(guest.page.getByRole('heading', { level: 1, name: 'Grillabend' })).toBeVisible();
    await expect(guest.page.getByRole('status')).toContainText('Du bist der Liste „Grillabend“ beigetreten.');
    expect(guest.page.url()).not.toContain(tokenOf(link));
    await guest.context.close();
  });

  test('FR-AUTH-06 AC3: an existing account logs in from the link and joins (the token waited in the server session)', async ({
    page,
    browser,
  }) => {
    const member = newUser('member');
    await registerThroughUi(page, newUser('owner2'));
    await createList(page, 'WG-Vorrat');
    const link = await readShareLink(page, 'WG-Vorrat');
    const other = await newDevice(browser);
    await registerThroughUi(other.page, member);
    await logoutThroughMenu(other.page);

    await other.page.goto(localLink(link));
    await other.page.getByRole('button', { name: 'Anmelden' }).click();
    await other.page.getByLabel('E-Mail-Adresse').fill(member.email);
    await other.page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
    await other.page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(other.page.getByRole('heading', { level: 1, name: 'WG-Vorrat' })).toBeVisible();
    await expect(other.page.getByRole('status')).toContainText('Du bist der Liste „WG-Vorrat“ beigetreten.');
    await other.context.close();
  });

  test('FR-SHARE-03 AC1/AC2: a signed-in person joins at once; the same link again just opens the list', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner3'));
    await createList(page, 'Frühstück');
    const link = await readShareLink(page, 'Frühstück');
    const other = await newDevice(browser);
    await registerThroughUi(other.page, newUser('joiner'));

    await other.page.goto(localLink(link));
    await expect(other.page.getByRole('heading', { level: 1, name: 'Frühstück' })).toBeVisible();
    await expect(other.page.getByRole('status')).toContainText('beigetreten');
    await other.page.goto(localLink(link));

    await expect(other.page.getByRole('heading', { level: 1, name: 'Frühstück' })).toBeVisible();
    await expect(other.page.getByRole('status')).not.toContainText('beigetreten');
    const lists = await other.page.request.get(`${APP}/api/v1/lists`);
    expect(((await lists.json()) as { lists: unknown[] }).lists).toHaveLength(1); // no duplicate membership
    await other.context.close();
  });

  test('FR-SHARE-02 / BR-06: renewing makes the old link unknown, members stay, the new link works', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner4'));
    await createList(page, 'Reise');
    const oldLink = await readShareLink(page, 'Reise');
    const first = await newDevice(browser);
    await registerThroughUi(first.page, newUser('early'));
    await first.page.goto(localLink(oldLink));
    await expect(first.page.getByRole('heading', { level: 1, name: 'Reise' })).toBeVisible();

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Teilen-Link erneuern' }).click();
    await page.getByRole('dialog', { name: 'Teilen-Link erneuern?' }).getByRole('button', { name: 'Erneuern' }).click();
    await expect(page.getByRole('status')).toContainText('Neuer Teilen-Link erstellt');
    const newLink = await readShareLink(page, 'Reise');
    expect(newLink).not.toBe(oldLink);

    const late = await newDevice(browser);
    await registerThroughUi(late.page, newUser('late'));
    await late.page.goto(localLink(oldLink));
    await expect(
      late.page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' }),
    ).toBeVisible();
    await late.page.goto(localLink(newLink));
    await expect(late.page.getByRole('heading', { level: 1, name: 'Reise' })).toBeVisible();
    await first.page.reload();
    await expect(first.page.getByRole('heading', { level: 1, name: 'Reise' })).toBeVisible(); // the member stayed
    await first.context.close();
    await late.context.close();
  });

  test('FR-SHARE-04: an unknown link looks the same with and without a session, and says nothing about lists', async ({
    page,
    browser,
  }) => {
    const unknown = `${APP}/j/${'x'.repeat(43)}`;
    await page.goto(unknown);
    await expect(page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeVisible();
    const visitorText = await page.getByRole('main').innerText();
    await expectNoAxeViolations(page, 'invalid link page (real stack)');

    const member = await newDevice(browser);
    await registerThroughUi(member.page, newUser('probe'));
    await member.page.goto(unknown);
    await expect(
      member.page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' }),
    ).toBeVisible();
    const memberText = await member.page.getByRole('main').innerText();

    expect(visitorText.replace('Anmelden', '')).toBe(memberText.replace('Zu meinen Listen', ''));
    await member.context.close();
  });

  test('NFR-SEC-05 / ADR 0008: the join page is served with Referrer-Policy no-referrer', async ({ page, request }) => {
    await registerThroughUi(page, newUser('owner5'));
    await createList(page, 'Geheim');
    const link = await readShareLink(page, 'Geheim');

    const document = await request.get(localLink(link));

    expect(document.status()).toBe(200);
    expect(document.headers()['referrer-policy']).toBe('no-referrer');
  });
});
