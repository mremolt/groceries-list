import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { ReportErrorUseCase } from '@platform';
import { REPORT_ERROR } from '@platform';
import { TechnicalError } from '@platform/domain';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { NotAuthenticatedError } from '../../../domain/session-errors';
import { getGetCurrentUserMockHandler } from './generated/endpoints/me-controller/me-controller.msw';
import { MeControllerService } from './generated/endpoints/me-controller/me-controller.service';
import { HttpSession } from './http-session';

const server = setupServer();
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

function setup() {
  const reportError = mock<ReportErrorUseCase>();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })),
      MeControllerService,
      HttpSession,
      { provide: REPORT_ERROR, useValue: reportError },
    ],
  });
  return { adapter: TestBed.inject(HttpSession), reportError };
}

const USER = { id: '8f0f5b1e-0000-4000-8000-000000000001', displayName: 'Anna Beispiel', email: 'anna@example.test' };

describe('HttpSession.loadCurrentUser', () => {
  it('maps the profile the generated mock handler answers to the domain user', async () => {
    server.use(getGetCurrentUserMockHandler(USER));
    const { adapter } = setup();

    expect(await adapter.loadCurrentUser()).toEqual(USER);
  });

  it('answers NotAuthenticatedError for a 401 problem', async () => {
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json(
          { title: 'Nicht angemeldet', status: 401, code: 'UNAUTHENTICATED' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { adapter, reportError } = setup();

    await expect(adapter.loadCurrentUser()).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(reportError.report.mock.calls).toHaveLength(0);
  });

  it('answers a reported TechnicalError for a server error', async () => {
    server.use(http.get('*/api/v1/me', () => HttpResponse.json({ status: 500 }, { status: 500 })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadCurrentUser()).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });

  it('answers a reported TechnicalError, not a half-filled user, for a malformed body', async () => {
    server.use(http.get('*/api/v1/me', () => HttpResponse.json({ id: 'not-a-uuid', displayName: 'Anna' })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadCurrentUser()).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });

  it('stops waiting when the caller aborts', async () => {
    server.use(
      http.get('*/api/v1/me', async () => {
        await delay(200);
        return HttpResponse.json(USER);
      }),
    );
    const { adapter } = setup();
    const controller = new AbortController();

    const pending = adapter.loadCurrentUser(controller.signal);
    controller.abort(new Error('superseded'));

    await expect(pending).rejects.toThrow('superseded');
  });
});

describe('HttpSession.logout', () => {
  const END_SESSION = 'https://idp.example/realms/groceries/protocol/openid-connect/logout';

  it('posts the sign-out with the XSRF header and answers the end-session address', async () => {
    document.cookie = 'XSRF-TOKEN=xsrf-1; path=/';
    let xsrf: string | null = null;
    let accept: string | null = null;
    server.use(
      http.post('*/logout', ({ request }) => {
        xsrf = request.headers.get('x-xsrf-token');
        accept = request.headers.get('accept');
        return HttpResponse.json({ redirectUri: END_SESSION });
      }),
    );
    const { adapter } = setup();

    expect(await adapter.logout()).toBe(END_SESSION);
    expect(xsrf).toBe('xsrf-1');
    expect(accept).toBe('application/json');
  });

  it('accepts http only for a local IdP', async () => {
    server.use(
      http.post('*/logout', () =>
        HttpResponse.json({
          redirectUri: 'http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout',
        }),
      ),
    );
    const { adapter } = setup();

    await expect(adapter.logout()).resolves.toContain('keycloak.localhost');
  });

  it.each(['http://idp.example/logout', 'javascript:alert(1)', 'not a url'])(
    'refuses %s as end-session address',
    async (value) => {
      server.use(http.post('*/logout', () => HttpResponse.json({ redirectUri: value })));
      const { adapter, reportError } = setup();

      await expect(adapter.logout()).rejects.toBeInstanceOf(TechnicalError);
      expect(reportError.report.mock.calls).toHaveLength(1);
    },
  );

  it('answers a TechnicalError when the BFF fails', async () => {
    server.use(http.post('*/logout', () => HttpResponse.json({ status: 500 }, { status: 500 })));
    const { adapter } = setup();

    await expect(adapter.logout()).rejects.toBeInstanceOf(TechnicalError);
  });
});
