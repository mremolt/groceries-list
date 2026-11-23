// Unit tests of the pure parts of tools/seed-demo.mjs: node --test tools/seed-demo.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CookieJar, LISTS, PEOPLE, parseLoginForm, plan } from './seed-demo.mjs';

test('the seed data covers the three mockup lists, shared by two people, with open and checked items', () => {
  assert.equal(PEOPLE.length, 2);
  assert.deepEqual(
    LISTS.map((list) => list.name),
    ['Wocheneinkauf', 'Grillabend Samstag', 'WG-Vorrat'],
  );
  for (const list of LISTS) {
    assert.ok(list.owner === 0 || list.owner === 1);
    assert.ok(list.items.some((item) => item.done), `${list.name} has a checked item`);
    assert.ok(list.items.some((item) => !item.done), `${list.name} has an open item`);
    for (const item of list.items) assert.ok(item.text.length >= 1 && item.text.length <= 200);
  }
});

test('the cookie jar keeps cookies per host, overwrites and drops expired ones', () => {
  const jar = new CookieJar();
  jar.store('http://localhost:8080/a', ['SESSION=abc; Path=/; HttpOnly', 'XSRF-TOKEN=x1; Path=/']);
  jar.store('http://keycloak.localhost:8180/b', ['KC=1; Path=/']);
  jar.store('http://localhost:8080/c', ['XSRF-TOKEN=x2; Path=/']);

  assert.equal(jar.header('http://localhost:8080/'), 'SESSION=abc; XSRF-TOKEN=x2');
  assert.equal(jar.get('http://keycloak.localhost:8180/', 'KC'), '1');
  assert.equal(jar.get('http://localhost:8080/', 'KC'), undefined);

  jar.store('http://localhost:8080/d', ['SESSION=; Max-Age=0; Path=/']);
  assert.equal(jar.get('http://localhost:8080/', 'SESSION'), undefined);
});

test('the login form action is read and its entities are decoded', () => {
  const html =
    '<form id="kc-form-login" action="http://keycloak.localhost:8180/x?a=1&amp;b=2" method="post" novalidate></form>';
  assert.deepEqual(parseLoginForm(html), { action: 'http://keycloak.localhost:8180/x?a=1&b=2' });
  assert.equal(parseLoginForm('<form id="other"></form>'), undefined);
});

test('the plan finds existing lists by name and leaves missing ones to be created', () => {
  const result = plan([{ id: '1', name: 'WG-Vorrat' }], LISTS);
  assert.equal(result.find((l) => l.name === 'WG-Vorrat')?.existing?.id, '1');
  assert.equal(result.find((l) => l.name === 'Wocheneinkauf')?.existing, undefined);
});
