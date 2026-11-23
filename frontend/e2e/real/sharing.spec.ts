import { expect, test } from './fixtures';
import {
  APP,
  createListThroughUi,
  expectNoAxeViolations,
  logoutThroughMenu,
  newDevice,
  newUser,
  PASSWORD,
  readShareLinkThroughUi,
  recordSecret,
  registerThroughUi,
} from './support';

// Acceptance of FR-SHARE-01..04 and FR-AUTH-06 against the real BFF, database and identity provider (ADR 0003, 0008). Tag: @real.
// Share tokens are recorded as secrets: the run fails when one shows up in the application log (NFR-SEC-09, ADR 0008).

function tokenOf(link: string): string {
  return link.slice(link.lastIndexOf('/') + 1);
}

/** The link carries the public base URL; the browser of the test reaches the app at `APP`. */
function localLink(link: string): string {
  return `${APP}/j/${tokenOf(link)}`;
}

test.describe('@real sharing', () => {
  test('FR-AUTH-06 / FR-SHARE-03: a visitor signs up from the link, joins automatically and sees the list', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner'));
    await createListThroughUi(page, 'Grillabend');
    const link = await readShareLinkThroughUi(page, 'Grillabend');

    const guest = await newDevice(browser);
    await guest.page.goto(localLink(link));
    await expect(
      guest.page.getByText(
        'Du wurdest zur Liste „Grillabend“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.',
      ),
    ).toBeVisible();
    await expectNoAxeViolations(guest.page, 'invitation page (real stack)');
    await guest.join.createAccountAndJoinButton.click();
    await expect(guest.page).toHaveURL(/keycloak\.localhost/);
    const guestUser = newUser('guest');
    recordSecret(PASSWORD);
    await guest.auth.register(guestUser.displayName, guestUser.email, PASSWORD);

    await expect(guest.page).toHaveURL(new RegExp(`^${APP}/listen/`));
    await expect(guest.shell.heading('Grillabend')).toBeVisible();
    await expect(guest.shell.status).toContainText('Du bist der Liste „Grillabend“ beigetreten.');
    expect(guest.page.url()).not.toContain(tokenOf(link));
    await guest.context.close();
  });

  test('FR-AUTH-06 AC3: an existing account logs in from the link and joins (the token waited in the server session)', async ({
    page,
    browser,
  }) => {
    const member = newUser('member');
    await registerThroughUi(page, newUser('owner2'));
    await createListThroughUi(page, 'WG-Vorrat');
    const link = await readShareLinkThroughUi(page, 'WG-Vorrat');
    const other = await newDevice(browser);
    await registerThroughUi(other.page, member);
    await logoutThroughMenu(other.page);

    await other.page.goto(localLink(link));
    await other.auth.signInButton.click();
    await other.auth.signIn(member.email, PASSWORD);

    await expect(other.shell.heading('WG-Vorrat')).toBeVisible();
    await expect(other.shell.status).toContainText('Du bist der Liste „WG-Vorrat“ beigetreten.');
    await other.context.close();
  });

  test('FR-SHARE-03 AC1/AC2: a signed-in person joins at once; the same link again just opens the list', async ({
    page,
    browser,
  }) => {
    await registerThroughUi(page, newUser('owner3'));
    await createListThroughUi(page, 'Frühstück');
    const link = await readShareLinkThroughUi(page, 'Frühstück');
    const other = await newDevice(browser);
    await registerThroughUi(other.page, newUser('joiner'));

    await other.page.goto(localLink(link));
    await expect(other.shell.heading('Frühstück')).toBeVisible();
    await expect(other.shell.status).toContainText('beigetreten');
    await other.page.goto(localLink(link));

    await expect(other.shell.heading('Frühstück')).toBeVisible();
    await expect(other.shell.status).not.toContainText('beigetreten');
    const lists = await other.page.request.get(`${APP}/api/v1/lists`);
    expect(((await lists.json()) as { lists: unknown[] }).lists).toHaveLength(1); // no duplicate membership
    await other.context.close();
  });

  test('FR-SHARE-02 / BR-06: renewing makes the old link unknown, members stay, the new link works', async ({
    page,
    browser,
    shell,
    sharing,
  }) => {
    await registerThroughUi(page, newUser('owner4'));
    await createListThroughUi(page, 'Reise');
    const oldLink = await readShareLinkThroughUi(page, 'Reise');
    const first = await newDevice(browser);
    await registerThroughUi(first.page, newUser('early'));
    await first.page.goto(localLink(oldLink));
    await expect(first.shell.heading('Reise')).toBeVisible();

    await sharing.renewFromMenu();
    await expect(shell.status).toContainText('Neuer Teilen-Link erstellt');
    const newLink = await readShareLinkThroughUi(page, 'Reise');
    expect(newLink).not.toBe(oldLink);

    const late = await newDevice(browser);
    await registerThroughUi(late.page, newUser('late'));
    await late.page.goto(localLink(oldLink));
    await expect(late.join.invalidLinkHeading).toBeVisible();
    await late.page.goto(localLink(newLink));
    await expect(late.shell.heading('Reise')).toBeVisible();
    await first.page.reload();
    await expect(first.shell.heading('Reise')).toBeVisible(); // the member stayed
    await first.context.close();
    await late.context.close();
  });

  test('FR-SHARE-04: an unknown link looks the same with and without a session, and says nothing about lists', async ({
    page,
    browser,
    shell,
    join,
  }) => {
    const unknown = `${APP}/j/${'x'.repeat(43)}`;
    await page.goto(unknown);
    await expect(join.invalidLinkHeading).toBeVisible();
    const visitorText = await shell.main.innerText();
    await expectNoAxeViolations(page, 'invalid link page (real stack)');

    const member = await newDevice(browser);
    await registerThroughUi(member.page, newUser('probe'));
    await member.page.goto(unknown);
    await expect(member.join.invalidLinkHeading).toBeVisible();
    const memberText = await member.shell.main.innerText();

    expect(visitorText.replace('Anmelden', '')).toBe(memberText.replace('Zu meinen Listen', ''));
    await member.context.close();
  });

  test('NFR-SEC-05 / ADR 0008: the join page is served with Referrer-Policy no-referrer', async ({ page, request }) => {
    await registerThroughUi(page, newUser('owner5'));
    await createListThroughUi(page, 'Geheim');
    const link = await readShareLinkThroughUi(page, 'Geheim');

    const document = await request.get(localLink(link));

    expect(document.status()).toBe(200);
    expect(document.headers()['referrer-policy']).toBe('no-referrer');
  });
});
