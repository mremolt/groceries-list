import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';

import { AxeBuilder } from '@axe-core/playwright';
import { type APIRequestContext, type Browser, type BrowserContext, expect, type Page } from '@playwright/test';

import { type Pages, pagesOf } from '../pages';

/** Real-backend tier: every helper arranges its own data through the real stack (TS-TEST-34, TS-TEST-35). */
export const APP = 'http://localhost:8080';
export const MAILPIT = 'http://localhost:8025/api/v1';
export const KEYCLOAK_HOST = 'keycloak.localhost:8180';
export const PASSWORD = 'E2e-Passwort-1';
export const NEW_PASSWORD = 'E2e-Neues-Passwort-2';

const AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SECRETS_FILE = 'test-results/real-secrets.txt';

export interface TestUser {
  email: string;
  displayName: string;
}

let counter = 0;
export function newUser(label: string): TestUser {
  counter += 1;
  const unique = `${Date.now().toString(36)}${String(counter)}${randomBytes(3).toString('hex')}`;
  return { email: `e2e-${label}-${unique}@example.test`, displayName: `E2E ${label} ${String(counter)}` };
}

/** Remembers a value that must never appear in the application log (NFR-SEC-09, SPRING-DP-07). */
export function recordSecret(value: string): void {
  mkdirSync('test-results', { recursive: true });
  appendFileSync(SECRETS_FILE, `${value}\n`);
}

export async function registerThroughUi(page: Page, user: TestUser, password = PASSWORD): Promise<void> {
  const { auth } = pagesOf(page);
  recordSecret(password);
  await page.goto('/');
  await auth.createAccountLink.click();
  await auth.register(user.displayName, user.email, password);
  await expectSignedInShell(page);
}

export async function expectSignedInShell(page: Page): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`^${APP}/`));
  await expect(pagesOf(page).shell.heading('Einkaufsliste')).toBeVisible();
}

export async function loginThroughUi(page: Page, user: TestUser, password = PASSWORD): Promise<void> {
  recordSecret(password);
  await page.goto('/');
  await pagesOf(page).auth.signIn(user.email, password);
}

export async function logoutThroughMenu(page: Page): Promise<void> {
  await pagesOf(page).shell.signOut();
  await expect(page).toHaveURL(new RegExp(KEYCLOAK_HOST.replace('.', '\\.')));
}

/** Creates a list from the empty state or the drawer and waits until its page is open; answers the list id. */
export async function createListThroughUi(page: Page, name: string): Promise<string> {
  const { lists, shell } = pagesOf(page);
  await lists.create(name);
  await expect(shell.heading(name)).toBeVisible();
  return page.url().slice(page.url().lastIndexOf('/') + 1);
}

/** Opens the share dialog of the open list, answers the link and closes it again; the token is a secret (ADR 0008). */
export async function readShareLinkThroughUi(page: Page, listName: string): Promise<string> {
  const link = await pagesOf(page).sharing.readShareLink(listName);
  recordSecret(link.slice(link.lastIndexOf('/') + 1));
  return link;
}

/** A new browser context is a new browser profile: its own cookies, as a second device. */
export type Device = Pages & { context: BrowserContext; page: Page };
export async function newDevice(browser: Browser): Promise<Device> {
  const context = await browser.newContext({ baseURL: APP, reducedMotion: 'reduce' });
  const page = await context.newPage();
  return { context, page, ...pagesOf(page) };
}

export async function meStatus(request: APIRequestContext): Promise<number> {
  return (await request.get(`${APP}/api/v1/me`)).status();
}

interface MailSummary {
  ID: string;
  To: { Address: string }[];
}

/** Waits for the mail to `email` in Mailpit and returns its text body (no fixed sleeps, TS-TEST-15). */
export async function mailTextTo(request: APIRequestContext, email: string): Promise<string> {
  let id = '';
  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT}/search`, { params: { query: `to:${email}` } });
        const body = (await response.json()) as { messages?: MailSummary[] };
        id = body.messages?.[0]?.ID ?? '';
        return id;
      },
      { message: `mail to ${email}`, timeout: 20_000 },
    )
    .not.toBe('');
  const message = (await (await request.get(`${MAILPIT}/message/${id}`)).json()) as { Text: string };
  return message.Text;
}

export function resetLink(mailText: string): string {
  const match = /https?:\/\/\S+/.exec(mailText);
  if (!match) throw new Error('no link in the mail');
  return match[0];
}

/** WCAG 2.2 AA scan of the settled page, proving that `target-size` ran (TS-TEST-21). */
export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(AA)
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze();
  const ran = [...results.passes, ...results.incomplete, ...results.inapplicable].some((r) => r.id === 'target-size');
  expect(ran, `${label}: axe rule target-size must have run`).toBe(true);
  expect(results.violations, label).toEqual([]);
}

/**
 * Logs in with a wrong password until the identity provider shows the lockout text, at most `maxAttempts` times.
 * Returns the attempt that was answered with the lockout, or 0 when none was (FR-AUTH-02 AC4).
 */
export async function failLoginUntilLockout(page: Page, user: TestUser, maxAttempts = 6): Promise<number> {
  const { wrongCredentialsMessage: generic, lockoutMessage: lockout } = pagesOf(page).auth;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await loginThroughUi(page, user, `Falsch-Passwort-${String(attempt)}x`);
    await expect(generic.or(lockout)).toBeVisible();
    if (await lockout.isVisible()) return attempt;
    await page.goto('/');
  }
  return 0;
}
