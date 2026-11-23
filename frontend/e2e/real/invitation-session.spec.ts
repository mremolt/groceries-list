import { request as playwrightRequest } from '@playwright/test';

import { expect, test } from './fixtures';
import { APP, newUser, recordSecret, registerThroughUi } from './support';

// The one anonymous server session (ADR 0008, threat model T8): the cookie set by POST /api/v1/invitations. Tag: @real.
test.describe('@real invitation session', () => {
  test('the visitor session cookie from "remember invitation" is HttpOnly and SameSite=Lax', async ({
    page,
    shell,
    lists,
  }) => {
    await registerThroughUi(page, newUser('invite'));
    await lists.create('Einladung');
    await expect(shell.heading('Einladung')).toBeVisible();
    const listId = page.url().slice(page.url().lastIndexOf('/') + 1);
    const link = (await (await page.request.get(`${APP}/api/v1/lists/${listId}/share-link`)).json()) as { url: string };
    const token = link.url.slice(link.url.lastIndexOf('/') + 1);
    recordSecret(token);

    const visitor = await playwrightRequest.newContext({ baseURL: APP });
    await visitor.get('/'); // the anonymous visitor gets the XSRF cookie from the SPA document
    const state = await visitor.storageState();
    const xsrf = state.cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? '';
    expect(xsrf, 'XSRF cookie for the visitor').not.toBe('');

    const response = await visitor.post('/api/v1/invitations', { data: { token }, headers: { 'X-XSRF-TOKEN': xsrf } });
    expect(response.status()).toBe(204);

    const session = (await visitor.storageState()).cookies.find((cookie) => cookie.name === 'SESSION');
    expect(session, 'visitor session cookie').toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
    recordSecret(session?.value ?? 'missing-session');
    await visitor.dispose();
  });
});
