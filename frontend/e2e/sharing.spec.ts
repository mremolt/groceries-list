import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BBQ, WEEK } from './fixtures/lists';
import { LINK_BASE } from './fixtures/sharing';

// Layout statement (NG-UI-23): the share button sits in the app bar next to ⋮ on every size class; the share dialog is
// the same Material dialog everywhere; the join page is one centred column of at most 28 rem outside the shell.

const LOGIN = /\/oauth2\/authorization\/keycloak/;

/** The BFF login is a whole-page navigation; the stubbed tier answers it with a plain page. */
async function stubLogin(page: Page): Promise<void> {
  await page.route(LOGIN, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Login</title><h1>Keycloak</h1>' }),
  );
}

async function openShareDialog(page: Page) {
  await page.getByRole('button', { name: 'Liste teilen' }).click();
  const dialog = page.getByRole('dialog', { name: `„${WEEK.name}“ teilen` });
  await expect(dialog.getByRole('textbox', { name: 'Teilen-Link' })).toBeVisible();
  return dialog;
}

test.describe('share dialog @responsive @shell @a11y-sharing', () => {
  test.use({ initialLists: { lists: [WEEK] } });

  test('shows the link, the texts and the buttons (FR-SHARE-01 AC1, AC4)', async ({
    page,
    sharingApi,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);

    const dialog = await openShareDialog(page);

    await expect(dialog.getByRole('textbox', { name: 'Teilen-Link' })).toHaveValue(
      `${LINK_BASE}${sharingApi.tokenOf(WEEK.id)}`,
    );
    await expect(
      dialog.getByText('Jede Person mit diesem Link und einem Konto kann der Liste beitreten und sie bearbeiten.'),
    ).toBeVisible();
    await expect(dialog.getByText(/Link an die falsche Person geschickt\?/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Link kopieren' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Link erneuern' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fertig' })).toBeVisible();
    await expectAccessible('share dialog');
  });

  test('copies the link and says so (FR-SHARE-01 AC2)', async ({ page, context, sharingApi }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/listen/${WEEK.id}`);
    const dialog = await openShareDialog(page);

    await dialog.getByRole('button', { name: 'Link kopieren' }).click();

    await expect(page.locator('app-snackbar-host')).toContainText('Link kopiert');
    await expect(dialog.getByRole('status')).toHaveText('Link kopiert'); // audible: the modal hides the snackbar
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${LINK_BASE}${sharingApi.tokenOf(WEEK.id)}`,
    );
  });

  test('closes with „Fertig“ and Esc, returning focus to the share button', async ({ page }) => {
    await page.goto(`/listen/${WEEK.id}`);
    const dialog = await openShareDialog(page);

    await dialog.getByRole('button', { name: 'Fertig' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Liste teilen' })).toBeFocused();

    await openShareDialog(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Liste teilen' })).toBeFocused();
  });

  test('works with the keyboard alone: open, reach the buttons with Tab, activate with Enter', async ({ page }) => {
    await page.goto(`/listen/${WEEK.id}`);
    await page.getByRole('button', { name: 'Liste teilen' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: `„${WEEK.name}“ teilen` });
    await expect(dialog.getByRole('textbox', { name: 'Teilen-Link' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Link kopieren' }).focus();
    await page.keyboard.press('Enter');

    await expect(dialog.getByRole('status')).toHaveText('Link kopiert');
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Link erneuern' })).toBeFocused();
  });
});

test.describe('renew the share link @responsive @shell @a11y-sharing', () => {
  test.use({ initialLists: { lists: [WEEK] } });

  test('asks first, then shows the new link in the open dialog; the old link stops working (FR-SHARE-02, BR-06)', async ({
    page,
    sharingApi,
    expectAccessible,
  }) => {
    await page.goto(`/listen/${WEEK.id}`);
    const dialog = await openShareDialog(page);
    const oldLink = await dialog.getByRole('textbox', { name: 'Teilen-Link' }).inputValue();

    await dialog.getByRole('button', { name: 'Link erneuern' }).click();
    const confirm = page.getByRole('dialog', { name: 'Teilen-Link erneuern?' });
    await expect(
      confirm.getByText('Der bisherige Link funktioniert danach nicht mehr. Wer schon Mitglied ist, bleibt Mitglied.'),
    ).toBeVisible();
    await expect(confirm.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
    await expectAccessible('renew confirmation');
    await confirm.getByRole('button', { name: 'Erneuern' }).click();

    await expect(dialog.getByRole('textbox', { name: 'Teilen-Link' })).not.toHaveValue(oldLink);
    await expect(page.locator('app-snackbar-host')).toContainText(
      'Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.',
    );
    await expect(dialog.getByRole('status')).toHaveText(
      'Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.',
    );
    expect(oldLink.endsWith(sharingApi.tokenOf(WEEK.id))).toBe(false);
    await expect(dialog.getByRole('textbox', { name: 'Teilen-Link' })).toHaveValue(
      `${LINK_BASE}${sharingApi.tokenOf(WEEK.id)}`,
    );
  });

  test('renews from the ⋮ menu and returns focus to it (FR-SHARE-02 AC1)', async ({ page, sharingApi }) => {
    await page.goto(`/listen/${WEEK.id}`);
    const before = sharingApi.tokenOf(WEEK.id);

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Teilen-Link erneuern' }).click();
    await page.getByRole('dialog', { name: 'Teilen-Link erneuern?' }).getByRole('button', { name: 'Erneuern' }).click();

    await expect(page.getByRole('status')).toContainText('Neuer Teilen-Link erstellt');
    expect(sharingApi.tokenOf(WEEK.id)).not.toBe(before);
    await expect(page.getByRole('button', { name: 'Weitere Optionen' })).toBeFocused();
  });

  test('keeps the link when the confirmation is cancelled', async ({ page, sharingApi }) => {
    await page.goto(`/listen/${WEEK.id}`);
    const before = sharingApi.tokenOf(WEEK.id);
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Teilen-Link erneuern' }).click();

    await page
      .getByRole('dialog', { name: 'Teilen-Link erneuern?' })
      .getByRole('button', { name: 'Abbrechen' })
      .click();

    expect(sharingApi.tokenOf(WEEK.id)).toBe(before);
    await expect(page.getByRole('button', { name: 'Weitere Optionen' })).toBeFocused();
  });
});

test.describe('join with a session @responsive @shell @a11y-sharing', () => {
  test.use({ initialLists: { lists: [WEEK] } });

  test('joins, opens the list, takes the token off the address and says so (FR-SHARE-03 AC1)', async ({
    page,
    sharingApi,
  }) => {
    const token = sharingApi.offerForeignList(BBQ);

    await page.goto(`/j/${token}`);

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: BBQ.name })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(`Du bist der Liste „${BBQ.name}“ beigetreten.`);
    expect(page.url()).not.toContain(token);
    expect(sharingApi.sent.joins).toEqual([{ token }]);
    expect(sharingApi.sent.lookups, 'no extra lookup for a signed-in person').toEqual([]);
  });

  test('opens the list without a message when already a member (FR-SHARE-03 AC2)', async ({ page, sharingApi }) => {
    await page.goto(`/j/${sharingApi.tokenOf(WEEK.id)}`);

    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: WEEK.name })).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(1);
    await expect(page.getByRole('status')).toBeEmpty();
  });

  test('joins with the token remembered before the login on /j/consume (FR-AUTH-06 AC3)', async ({
    page,
    sharingApi,
  }) => {
    sharingApi.remembered.token = sharingApi.offerForeignList(BBQ);

    await page.goto('/j/consume');

    await expect(page).toHaveURL(new RegExp(`/listen/${BBQ.id}$`));
    await expect(page.getByRole('status')).toContainText(`Du bist der Liste „${BBQ.name}“ beigetreten.`);
    expect(sharingApi.sent.joins).toEqual([null]);
  });

  test('refuses a full list with the specified text (FR-SHARE-03 AC4)', async ({
    page,
    sharingApi,
    expectErrors,
    expectAccessible,
  }) => {
    expectErrors(/status of 409/);
    sharingApi.refuseNextJoin('MEMBER_LIMIT_REACHED');

    await page.goto(`/j/${sharingApi.offerForeignList(BBQ)}`);

    await expect(page.getByText('Diese Liste hat die maximale Anzahl an Mitgliedern erreicht.')).toBeVisible();
    await expect(page).toHaveURL(/\/$/); // the secret is off the address bar
    await expectAccessible('member limit');
  });

  test('shows the invalid-link page for an unknown link with a way back (FR-SHARE-04 AC1)', async ({
    page,
    expectErrors,
    expectAccessible,
    expectReflowAndTextSpacing,
  }) => {
    expectErrors(/status of 404/);

    await page.goto('/j/does-not-exist');

    await expect(page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeVisible();
    await expect(page.getByText('Bitte die Person, die dir den Link geschickt hat, um einen neuen.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zu meinen Listen' })).toBeVisible();
    await expectAccessible('invalid link (signed in)');
    await expectReflowAndTextSpacing();
    await page.getByRole('link', { name: 'Zu meinen Listen' }).click();
    await expect(page).toHaveURL(new RegExp(`/listen/${WEEK.id}$`));
  });
});

test.describe('join without a session @responsive @shell @a11y-sharing', () => {
  test.use({ session: { signedIn: false }, initialLists: { lists: [BBQ] } });

  test('shows the invitation with the list name only, no content of the list (FR-AUTH-06 AC1, AC4)', async ({
    page,
    sharingApi,
    expectErrors,
    expectAccessible,
    expectReflowAndTextSpacing,
  }) => {
    expectErrors(/status of 401/); // the browser logs the stubbed 401 of the session probe

    await page.goto(`/j/${sharingApi.tokenOf(BBQ.id)}`);

    await expect(
      page.getByText(
        `Du wurdest zur Liste „${BBQ.name}“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.`,
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Liste beitreten' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Konto erstellen und beitreten' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0); // no app shell, no lists for a visitor
    expect(sharingApi.sent.joins).toEqual([]);
    await expectAccessible('invitation page');
    await expectReflowAndTextSpacing();
  });

  test('remembers the token on the server, then goes to the sign-up of the identity provider (FR-AUTH-06 AC2, ADR 0008)', async ({
    page,
    sharingApi,
    expectErrors,
  }) => {
    expectErrors(/status of 401/);
    await stubLogin(page);
    const token = sharingApi.tokenOf(BBQ.id);
    await page.goto(`/j/${token}`);

    await page.getByRole('button', { name: 'Konto erstellen und beitreten' }).click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak\?prompt=create$/);
    expect(sharingApi.sent.remembered).toEqual([{ token }]);
    expect(sharingApi.remembered.token).toBe(token);
    // TS-SEC-01: the token never enters browser storage
    await page.goBack();
    const stored = await page.evaluate(() =>
      JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]),
    );
    expect(stored).not.toContain(token);
  });

  test('„Anmelden“ remembers the token too and starts the plain login', async ({ page, sharingApi, expectErrors }) => {
    expectErrors(/status of 401/);
    await stubLogin(page);
    const token = sharingApi.tokenOf(BBQ.id);
    await page.goto(`/j/${token}`);

    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    expect(sharingApi.sent.remembered).toEqual([{ token }]);
  });

  test('shows the same invalid-link page for an unknown and for a renewed link, with „Anmelden“ (FR-SHARE-04)', async ({
    page,
    sharingApi,
    expectErrors,
    expectAccessible,
  }) => {
    expectErrors(/status of (401|404)/);
    await stubLogin(page);
    const renewed = sharingApi.tokenOf(BBQ.id);
    sharingApi.renewToken(BBQ.id); // another member renews: `renewed` is old now

    const invalid = page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' });
    await page.goto(`/j/${renewed}`);
    await expect(invalid).toBeVisible();
    const renewedText = await page.getByRole('main').innerText();
    await page.goto('/j/unknown-token-0123456789');
    await expect(invalid).toBeVisible();
    const unknownText = await page.getByRole('main').innerText();

    expect(renewedText).toBe(unknownText);
    expect(unknownText).not.toContain(BBQ.name);
    await expectAccessible('invalid link (signed out)');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
  });
});
