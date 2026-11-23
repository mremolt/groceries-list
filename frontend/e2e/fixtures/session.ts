import type { Page } from '@playwright/test';

/** The signed-in person of the stubbed tier; the shape follows `getCurrentUser` of the backend spec (API-CON-11). */
export const stubUser = {
  id: '8f0f5b1e-0000-4000-8000-000000000001',
  displayName: 'Anna Beispiel',
  email: 'anna@example.test',
};

/** The logout answer of the BFF: the IdP end-session address as JSON (SPRING-SEC-33, TS-SEC-10). */
export const END_SESSION_URL = 'http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout';

/** Stubs `GET /api/v1/me`: 200 with the user, or 401 problem+json without a session. Returns a call counter. */
export async function stubSession(page: Page, signedIn: boolean): Promise<{ calls: () => number }> {
  let calls = 0;
  await page.route('**/api/v1/me', (route) => {
    calls += 1;
    return signedIn
      ? route.fulfill({ json: stubUser })
      : route.fulfill({
          status: 401,
          contentType: 'application/problem+json',
          json: { type: 'about:blank', title: 'Nicht angemeldet', status: 401, code: 'UNAUTHENTICATED' },
        });
  });
  return { calls: () => calls };
}
