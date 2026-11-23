import { expect, request as playwrightRequest, test } from '@playwright/test';

import {
  APP,
  expectNoAxeViolations,
  expectSignedInShell,
  loginThroughUi,
  logoutThroughMenu,
  mailTextTo,
  meStatus,
  NEW_PASSWORD,
  newDevice,
  newUser,
  PASSWORD,
  recordSecret,
  registerThroughUi,
  resetLink,
} from './support';

// Acceptance of FR-AUTH-01..05 against the real identity provider and the real BFF (kickoff.md, REPO-CI-04). Tag: @real.
test.describe('@real accounts', () => {
  test('FR-AUTH-01 AC1: sign-up lands in the app shell as the new person', async ({ page }) => {
    const user = newUser('signup');

    await registerThroughUi(page, user);

    await expect(page.getByText('Noch keine Listen.')).toBeVisible();
    const me = await page.request.get(`${APP}/api/v1/me`);
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({ displayName: user.displayName, email: user.email });
    await expectNoAxeViolations(page, 'signed-in shell (real stack)');
  });

  test('FR-AUTH-01 AC3: an already registered e-mail address gets the specified message with a login link', async ({
    page,
    browser,
  }) => {
    const user = newUser('dup');
    await registerThroughUi(page, user);
    const other = await newDevice(browser);

    await other.page.goto('/');
    await other.page.getByRole('link', { name: 'Konto erstellen' }).click();
    await other.page.getByLabel('Anzeigename').fill('Zweites Konto');
    await other.page.getByLabel('E-Mail-Adresse').fill(user.email);
    await other.page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
    await other.page.getByRole('button', { name: 'Konto erstellen' }).click();

    await expect(
      other.page.getByText(
        'Mit dieser E-Mail-Adresse gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.',
      ),
    ).toBeVisible();
    await expect(other.page.getByRole('link', { name: /anmelden/i }).first()).toBeVisible();
    await other.context.close();
  });

  test('FR-AUTH-01 AC4: seven characters are rejected, eight are accepted', async ({ page }) => {
    const user = newUser('pw8');
    await page.goto('/');
    await page.getByRole('link', { name: 'Konto erstellen' }).click();
    await page.getByLabel('Anzeigename').fill(user.displayName);
    await page.getByLabel('E-Mail-Adresse').fill(user.email);
    await page.getByLabel('Passwort', { exact: true }).fill('Abcdef7');
    await page.getByRole('button', { name: 'Konto erstellen' }).click();
    await expect(page.getByText(/Fehler:/).first()).toBeVisible();
    await expect(page).toHaveURL(/keycloak\.localhost/);

    await page.getByLabel('Passwort', { exact: true }).fill('Abcdefg8');
    recordSecret('Abcdefg8');
    await page.getByRole('button', { name: 'Konto erstellen' }).click();

    await expectSignedInShell(page);
  });

  test('FR-AUTH-02 AC2/AC3: login works; a wrong password and an unknown e-mail give the same message', async ({
    page,
    browser,
  }) => {
    const user = newUser('login');
    await registerThroughUi(page, user);
    await logoutThroughMenu(page);
    const message = 'E-Mail-Adresse oder Passwort ist falsch.';

    await loginThroughUi(page, user, 'Falsches-Passwort-9');
    await expect(page.getByText(message)).toBeVisible();
    const stranger = await newDevice(browser);
    await loginThroughUi(stranger.page, newUser('nobody'), 'Falsches-Passwort-9');
    await expect(stranger.page.getByText(message)).toBeVisible();
    await stranger.context.close();

    await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expectSignedInShell(page);
  });

  test('FR-AUTH-02 AC4: repeated failures lock the account with the lockout text', async ({ page }) => {
    const user = newUser('lock');
    await registerThroughUi(page, user);
    await logoutThroughMenu(page);

    const generic = page.getByText('E-Mail-Adresse oder Passwort ist falsch.');
    const lockout = page.getByText('Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.');
    let lockedAfter = 0;
    for (let attempt = 1; attempt <= 6 && lockedAfter === 0; attempt += 1) {
      await loginThroughUi(page, user, `Falsch-Passwort-${String(attempt)}x`);
      await expect(generic.or(lockout)).toBeVisible();
      if (await lockout.isVisible()) lockedAfter = attempt;
      else await page.goto('/');
    }

    // Brute-force detection (5 failures / 15 min) and its quick-login check (failures less than a second apart lock after
    // two): an automated run is stopped at the latest by the 6th failure, never earlier than the 2nd (TS-TEST-35: the
    // test does not wait out the rule, it accepts the first lock).
    expect(lockedAfter, 'locked within six failed attempts').toBeGreaterThan(1);
    expect(lockedAfter).toBeLessThanOrEqual(6);
    await page.goto('/');
    await loginThroughUi(page, user, PASSWORD);
    await expect(lockout, 'the correct password is refused while the account is locked').toBeVisible();
  });

  test('FR-AUTH-02 AC5: the session survives a reload and its cookie is HttpOnly and SameSite=Lax', async ({
    page,
    context,
  }) => {
    await registerThroughUi(page, newUser('cookie'));

    await page.reload();

    await expectSignedInShell(page);
    const session = (await context.cookies(APP)).find((cookie) => cookie.name === 'SESSION');
    expect(session, 'session cookie').toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
    recordSecret(session?.value ?? 'missing-session');
    const days = ((session?.expires ?? 0) - Date.now() / 1000) / 86_400;
    expect(days, 'the cookie lives as long as the session (30 days, ADR 0002)').toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  test('FR-AUTH-03: logout ends the session here and at the identity provider', async ({ page, request }) => {
    await registerThroughUi(page, newUser('logout'));

    await logoutThroughMenu(page);

    expect(await meStatus(page.request)).toBe(401);
    await page.goto('/');
    await expect(page).toHaveURL(/keycloak\.localhost/);
    await expect(page.getByLabel('E-Mail-Adresse')).toBeVisible(); // no silent re-login: the Keycloak session ended too
    expect(await meStatus(request)).toBe(401);
  });

  test('FR-AUTH-04/05: reset request, mail, new password, old link expired', async ({ page, request }) => {
    const user = newUser('reset');
    await registerThroughUi(page, user);
    await logoutThroughMenu(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Passwort vergessen?' }).click();
    await page.getByLabel('E-Mail-Adresse').fill(user.email);
    await page.getByRole('button', { name: 'Link senden' }).click();
    await expect(page.getByRole('heading', { name: 'Prüfe dein Postfach' })).toBeVisible();
    const link = resetLink(await mailTextTo(request, user.email));

    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'Neues Passwort festlegen' })).toBeVisible();
    recordSecret(NEW_PASSWORD);
    await page.getByLabel('Neues Passwort').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Passwort speichern und anmelden' }).click();
    await expectSignedInShell(page);

    await logoutThroughMenu(page);
    await page.goto(link);
    await expect(page.getByText('Dieser Link ist abgelaufen oder wurde schon verwendet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Neuen Link anfordern' })).toBeVisible();
  });

  test('FR-AUTH-04 AC2: the reset answer is the same for an unknown account and no mail is sent', async ({
    page,
    request,
  }) => {
    const unknown = newUser('ghost');
    await page.goto('/');
    await page.getByRole('link', { name: 'Passwort vergessen?' }).click();
    await page.getByLabel('E-Mail-Adresse').fill(unknown.email);
    await page.getByRole('button', { name: 'Link senden' }).click();

    await expect(page.getByRole('heading', { name: 'Prüfe dein Postfach' })).toBeVisible();
    await expect(page.getByText(unknown.email)).toBeVisible();
    const search = await request.get('http://localhost:8025/api/v1/search', {
      params: { query: `to:${unknown.email}` },
    });
    expect(((await search.json()) as { messages?: unknown[] }).messages ?? []).toHaveLength(0);
  });

  test('FR-AUTH-05 AC2: setting a new password ends the other sessions of the person', async ({
    page,
    browser,
    request,
  }) => {
    const user = newUser('others');
    await registerThroughUi(page, user); // device A
    const deviceB = await newDevice(browser);
    await deviceB.page.goto('/');
    await deviceB.page.getByLabel('E-Mail-Adresse').fill(user.email);
    await deviceB.page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
    await deviceB.page.getByRole('button', { name: 'Anmelden' }).click();
    await expectSignedInShell(deviceB.page);
    expect(await meStatus(page.request)).toBe(200);

    const deviceC = await newDevice(browser); // the person resets the password on a third device
    await deviceC.page.goto('/');
    await deviceC.page.getByRole('link', { name: 'Passwort vergessen?' }).click();
    await deviceC.page.getByLabel('E-Mail-Adresse').fill(user.email);
    await deviceC.page.getByRole('button', { name: 'Link senden' }).click();
    const link = resetLink(await mailTextTo(request, user.email));
    await deviceC.page.goto(link);
    recordSecret(NEW_PASSWORD);
    await deviceC.page.getByLabel('Neues Passwort').fill(NEW_PASSWORD);
    await deviceC.page.getByRole('button', { name: 'Passwort speichern und anmelden' }).click();
    await expectSignedInShell(deviceC.page);

    await expect.poll(() => meStatus(page.request), { message: 'device A after back-channel logout' }).toBe(401);
    await expect.poll(() => meStatus(deviceB.page.request), { message: 'device B' }).toBe(401);
    expect(await meStatus(deviceC.page.request)).toBe(200);
    await deviceB.context.close();
    await deviceC.context.close();
  });
});

test.describe('@real security', () => {
  test('an anonymous API call answers 401 problem+json', async ({ request }) => {
    const response = await request.get(`${APP}/api/v1/me`);

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  test('POST /logout without the XSRF header is refused (SPRING-SEC-25)', async ({ page }) => {
    await registerThroughUi(page, newUser('csrf'));

    const response = await page.request.post(`${APP}/logout`, { headers: { Accept: 'application/json' } });

    expect(response.status()).toBe(403);
    expect(await meStatus(page.request)).toBe(200);
  });

  test('the session id from before the login is not valid after it (session fixation)', async ({ page, context }) => {
    const user = newUser('fix');
    await page.goto('/');
    await expect(page).toHaveURL(/keycloak\.localhost/);
    const before = (await context.cookies(APP)).find((cookie) => cookie.name === 'SESSION');
    expect(before, 'login start creates the pre-login session').toBeDefined();
    await page.getByRole('link', { name: 'Konto erstellen' }).click();
    await page.getByLabel('Anzeigename').fill(user.displayName);
    await page.getByLabel('E-Mail-Adresse').fill(user.email);
    await page.getByLabel('Passwort', { exact: true }).fill(PASSWORD);
    recordSecret(PASSWORD);
    await page.getByRole('button', { name: 'Konto erstellen' }).click();
    await expectSignedInShell(page);

    const after = (await context.cookies(APP)).find((cookie) => cookie.name === 'SESSION');
    expect(after?.value).not.toBe(before?.value);
    const attacker = await playwrightRequest.newContext({
      extraHTTPHeaders: { Cookie: `SESSION=${before?.value ?? ''}` },
    });
    expect(await meStatus(attacker)).toBe(401);
    await attacker.dispose();
  });

  test('the SPA document carries a nonce CSP whose nonce matches the scripts, and the other headers (NG-SEC-12)', async ({
    request,
  }) => {
    const response = await request.get(`${APP}/`, { headers: { Accept: 'text/html' } });

    const csp = response.headers()['content-security-policy'] ?? '';
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce, 'CSP nonce').toBeTruthy();
    const html = await response.text();
    expect(html).not.toContain('CSP_NONCE');
    const scriptNonces = [...html.matchAll(/<script[^>]*\snonce="([^"]+)"/g)].map((match) => match[1]);
    expect(scriptNonces.length).toBeGreaterThan(0);
    expect(new Set(scriptNonces)).toEqual(new Set([nonce]));
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(response.headers()['referrer-policy']).toBe('no-referrer');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['cache-control']).toContain('no-store');
    const second = await request.get(`${APP}/`, { headers: { Accept: 'text/html' } });
    expect(/'nonce-([^']+)'/.exec(second.headers()['content-security-policy'] ?? '')?.[1]).not.toBe(nonce);
  });

  test('an unknown asset is 404, never the SPA document (REL-FE-03)', async ({ request }) => {
    const response = await request.get(`${APP}/chunk-doesnotexist.js`);

    expect(response.status()).toBe(404);
  });
});

test.describe('@real themed identity provider pages @a11y-auth', () => {
  test('login, register, reset request and the check-your-mailbox page have no WCAG 2.2 AA violations', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
    await expectNoAxeViolations(page, 'Keycloak login');
    await page.getByRole('link', { name: 'Konto erstellen' }).click();
    await expect(page.getByRole('button', { name: 'Konto erstellen' })).toBeVisible();
    await expectNoAxeViolations(page, 'Keycloak register');
    await page.getByRole('button', { name: 'Konto erstellen' }).click(); // empty submit: error state (FR-FB-04)
    await expect(page.getByText(/Fehler:/).first()).toBeVisible();
    await expectNoAxeViolations(page, 'Keycloak register with errors');
    await page.goto('/');
    await page.getByRole('link', { name: 'Passwort vergessen?' }).click();
    await expectNoAxeViolations(page, 'Keycloak reset request');
    await page.getByLabel('E-Mail-Adresse').fill(newUser('axe').email);
    await page.getByRole('button', { name: 'Link senden' }).click();
    await expect(page.getByRole('heading', { name: 'Prüfe dein Postfach' })).toBeVisible();
    await expectNoAxeViolations(page, 'Keycloak check your mailbox');
  });
});
