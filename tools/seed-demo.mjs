#!/usr/bin/env node
// Demo data for the local installation (requirements/05 §2 "Demo data", M7). Idempotent: run it as often as you like.
//   cd backend && docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml up -d --wait
//   node tools/seed-demo.mjs
// Creates two fictitious people (Anna, Ben) who share the lists „Wocheneinkauf“, „Grillabend Samstag“ and „WG-Vorrat“
// with a few items (some checked). It uses only the real interfaces: the Keycloak admin API (service account
// `groceries-admin`, manage-users only) for a missing account, the real BFF login (OIDC code flow with a cookie jar)
// and the product REST API with that session (XSRF header). No SQL, no real credentials (DP-ENV-01, SEC-INC-01).
// Passwords are the fictitious development values of backend/dev/keycloak/README.md and are never printed.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = process.env.SEED_APP_URL ?? 'http://localhost:8080';
const KEYCLOAK = process.env.SEED_KEYCLOAK_URL ?? 'http://keycloak.localhost:8180';
const REALM = 'groceries';
const TIMEOUT_MS = 10_000;

export const PEOPLE = [
  { email: 'anna@example.test', displayName: 'Anna', password: 'Demo-Passwort-1' },
  { email: 'ben@example.test', displayName: 'Ben', password: 'Demo-Passwort-2' },
];

/** Owner index into PEOPLE; the other person joins through the share link. */
export const LISTS = [
  {
    name: 'Wocheneinkauf',
    owner: 0,
    items: [
      { text: '2× Milch, laktosefrei', done: false },
      { text: 'Vollkornbrot', done: false },
      { text: '6 Eier', done: true },
      { text: 'Tomaten', done: false },
      { text: 'Haferflocken', done: true },
    ],
  },
  {
    name: 'Grillabend Samstag',
    owner: 0,
    items: [
      { text: 'Bratwürste', done: false },
      { text: 'Halloumi', done: false },
      { text: 'Holzkohle', done: true },
      { text: 'Baguette', done: false },
    ],
  },
  {
    name: 'WG-Vorrat',
    owner: 1,
    items: [
      { text: 'Spülmittel', done: false },
      { text: 'Klopapier, 16 Rollen', done: false },
      { text: 'Kaffee', done: true },
    ],
  },
];

/** A minimal cookie jar: name/value per host, enough for the BFF session and Keycloak's login cookies. */
export class CookieJar {
  #cookies = new Map();

  store(url, setCookies) {
    const host = new URL(url).host;
    const jar = this.#cookies.get(host) ?? new Map();
    for (const line of setCookies) {
      const [pair, ...attributes] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = attributes.some((a) => /^\s*max-age\s*=\s*0\s*$/i.test(a));
      if (expired || value === '') jar.delete(name);
      else jar.set(name, value);
    }
    this.#cookies.set(host, jar);
  }

  header(url) {
    const jar = this.#cookies.get(new URL(url).host);
    return jar ? [...jar].map(([name, value]) => `${name}=${value}`).join('; ') : '';
  }

  get(url, name) {
    return this.#cookies.get(new URL(url).host)?.get(name);
  }
}

/** The action URL and the hidden/visible inputs of Keycloak's login form (the theme uses `#kc-form-login`). */
export function parseLoginForm(html) {
  const form = /<form[^>]*id="kc-form-login"[^>]*>/i.exec(html);
  if (!form) return undefined;
  const action = /action="([^"]*)"/i.exec(form[0])?.[1];
  if (!action) return undefined;
  return { action: action.replaceAll('&amp;', '&') };
}

/** Which of the wanted lists a person still has to create, and where items are still missing. */
export function plan(existingLists, wanted) {
  return wanted.map((list) => {
    const found = existingLists.find((e) => e.name === list.name);
    return { ...list, existing: found };
  });
}

async function request(jar, url, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  const cookie = jar?.header(url);
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    ...init,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  jar?.store(url, response.headers.getSetCookie());
  return response;
}

async function follow(jar, startUrl, init) {
  let url = startUrl;
  let response = await request(jar, url, init);
  for (let hops = 0; response.status >= 300 && response.status < 400 && hops < 15; hops += 1) {
    url = new URL(response.headers.get('location') ?? '', url).toString();
    response = await request(jar, url);
  }
  return { response, url };
}

async function adminToken() {
  const secret = readFileSync(join(root, 'backend/dev/secrets/keycloak-admin-client-secret'), 'utf8').trim();
  const response = await fetch(`${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'groceries-admin', client_secret: secret }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Keycloak admin token: HTTP ${String(response.status)}`);
  return (await response.json()).access_token;
}

/** Creates the account at Keycloak when it is missing (the dev realm normally imports Anna and Ben). */
async function ensureAccount(person) {
  const token = await adminToken();
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const users = `${KEYCLOAK}/admin/realms/${REALM}/users`;
  const found = await fetch(`${users}?email=${encodeURIComponent(person.email)}&exact=true`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!found.ok) throw new Error(`Keycloak user search: HTTP ${String(found.status)}`);
  if ((await found.json()).length > 0) return 'exists';
  const created = await fetch(users, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      username: person.email,
      email: person.email,
      emailVerified: true,
      enabled: true,
      attributes: { displayName: [person.displayName] },
      credentials: [{ type: 'password', value: person.password, temporary: false }],
    }),
  });
  if (created.status !== 201) throw new Error(`Keycloak user create: HTTP ${String(created.status)}`);
  return 'created';
}

/** Real BFF login: code flow with a cookie jar; returns a session that can call the REST API. */
export async function login(person) {
  const jar = new CookieJar();
  const { response, url } = await follow(jar, `${APP}/oauth2/authorization/keycloak`);
  const html = await response.text();
  const form = parseLoginForm(html);
  if (!form) throw new Error(`no Keycloak login form for ${person.displayName} (HTTP ${String(response.status)})`);
  const posted = await request(jar, new URL(form.action, url).toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: person.email, password: person.password, credentialId: '' }),
  });
  if (posted.status < 300 || posted.status >= 400) {
    throw new Error(`login of ${person.displayName} failed (wrong password for the existing account?)`);
  }
  await follow(jar, new URL(posted.headers.get('location') ?? '', url).toString());
  if (!jar.get(APP, 'SESSION')) throw new Error(`login of ${person.displayName} gave no session`);
  await request(jar, `${APP}/api/v1/me`); // refreshes the XSRF cookie
  return jar;
}

export async function api(jar, method, path, body) {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const xsrf = jar.get(APP, 'XSRF-TOKEN');
  if (method !== 'GET' && xsrf) headers['x-xsrf-token'] = decodeURIComponent(xsrf);
  const response = await request(jar, `${APP}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status >= 400) throw new Error(`${method} ${path}: HTTP ${String(response.status)}`);
  return response.status === 204 ? undefined : response.json();
}

async function seedList(sessions, spec) {
  const owner = sessions[spec.owner];
  const lists = (await api(owner, 'GET', '/api/v1/lists')).lists ?? [];
  const mine = plan(lists, [spec])[0];
  let list = mine.existing;
  if (!list) list = await api(owner, 'POST', '/api/v1/lists', { name: spec.name });
  const snapshot = await api(owner, 'GET', `/api/v1/lists/${list.id}/items`);
  if ((snapshot.items ?? []).length === 0) {
    for (const item of spec.items) {
      const created = await api(owner, 'POST', `/api/v1/lists/${list.id}/items`, { text: item.text });
      if (item.done) await api(owner, 'PATCH', `/api/v1/lists/${list.id}/items/${created.id}`, { done: true });
    }
  }
  const { url } = await api(owner, 'GET', `/api/v1/lists/${list.id}/share-link`);
  const token = url.slice(url.lastIndexOf('/') + 1);
  const other = sessions[1 - spec.owner];
  await api(other, 'POST', '/api/v1/memberships/join', { token }); // already a member: 200, no duplicate
  return list.name;
}

export async function main() {
  const ready = await fetch(`${APP}/livez`, { signal: AbortSignal.timeout(3000) }).catch(() => undefined);
  if (!ready?.ok) {
    throw new Error(
      `The application is not reachable at ${APP}. Start it: cd backend && docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml up -d --wait`,
    );
  }
  for (const person of PEOPLE) console.log(`${person.email}: account ${await ensureAccount(person)}`);
  const sessions = [];
  for (const person of PEOPLE) sessions.push(await login(person));
  for (const spec of LISTS) console.log(`list „${await seedList(sessions, spec)}“ ready, shared by both`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'seed failed');
    process.exit(1);
  });
}
