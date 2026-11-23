import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { ReportErrorUseCase } from '@platform';
import { REPORT_ERROR } from '@platform';
import { TechnicalError } from '@platform/domain';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { JoinLimitReachedError, ShareLinkInvalidError, ShareListNotFoundError } from '../../../domain/sharing-errors';
import {
  getGetShareLinkMockHandler,
  getLookupInvitationMockHandler,
  getRememberInvitationMockHandler,
  getRenewShareLinkMockHandler,
} from './generated/endpoints/sharing/sharing.msw';
import { SharingService } from './generated/endpoints/sharing/sharing.service';
import { HttpSharing } from './http-sharing';

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
      provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-LINK_CODE', headerName: 'X-XSRF-LINK_CODE' })),
      SharingService,
      HttpSharing,
      { provide: REPORT_ERROR, useValue: reportError },
    ],
  });
  return { adapter: TestBed.inject(HttpSharing), reportError };
}

const LIST_ID = '8f0f5b1e-0000-4000-8000-0000000000a1';
const LINK_CODE = 'Kq3-vZ_0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX';

function problem(status: number, body: Record<string, unknown>): Response {
  return HttpResponse.json(
    { title: 'x', status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

describe('HttpSharing share link', () => {
  it('loads and renews the link of a list', async () => {
    server.use(
      getGetShareLinkMockHandler({ url: `https://app.test/j/${LINK_CODE}` }),
      getRenewShareLinkMockHandler({ url: 'https://app.test/j/renewed' }),
    );
    const { adapter } = setup();

    expect(await adapter.loadShareLink(LIST_ID)).toEqual({ url: `https://app.test/j/${LINK_CODE}` });
    expect(await adapter.renewShareLink(LIST_ID)).toEqual({ url: 'https://app.test/j/renewed' });
  });

  it('answers ShareListNotFoundError for a list that is missing or not mine (BR-01)', async () => {
    server.use(http.get('/api/v1/lists/:id/share-link', () => problem(404, { code: 'LIST_NOT_FOUND' })));
    const { adapter } = setup();

    await expect(adapter.loadShareLink(LIST_ID)).rejects.toBeInstanceOf(ShareListNotFoundError);
  });

  it('reports a malformed answer as a technical error', async () => {
    server.use(http.get('/api/v1/lists/:id/share-link', () => HttpResponse.json({ nope: 1 })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadShareLink(LIST_ID)).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });
});

describe('HttpSharing invitation', () => {
  it('looks the list name up with the token in the body, never in the URL (ADR 0008)', async () => {
    let seenUrl = '';
    let seenBody: unknown;
    server.use(
      http.post('/api/v1/invitations/lookup', async ({ request }) => {
        seenUrl = request.url;
        seenBody = await request.json();
        return HttpResponse.json({ listName: 'Wocheneinkauf' });
      }),
    );
    const { adapter } = setup();

    expect(await adapter.lookupInvitation(LINK_CODE)).toEqual({ listName: 'Wocheneinkauf' });
    expect(seenBody).toEqual({ token: LINK_CODE });
    expect(seenUrl).not.toContain(LINK_CODE);
  });

  it('answers ShareLinkInvalidError for an unknown or renewed link', async () => {
    server.use(http.post('/api/v1/invitations/lookup', () => problem(404, { code: 'SHARE_LINK_INVALID' })));
    const { adapter } = setup();

    await expect(adapter.lookupInvitation(LINK_CODE)).rejects.toBeInstanceOf(ShareLinkInvalidError);
  });

  it('remembers the token in the server session', async () => {
    let seenBody: unknown;
    server.use(
      http.post('/api/v1/invitations', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { adapter } = setup();

    await adapter.rememberInvitation(LINK_CODE);

    expect(seenBody).toEqual({ token: LINK_CODE });
  });

  it('answers ShareLinkInvalidError when the token to remember is refused', async () => {
    server.use(http.post('/api/v1/invitations', () => problem(404, { code: 'SHARE_LINK_INVALID' })));
    const { adapter } = setup();

    await expect(adapter.rememberInvitation(LINK_CODE)).rejects.toBeInstanceOf(ShareLinkInvalidError);
  });

  it('keeps the generated handler for the happy path wired', async () => {
    server.use(getRememberInvitationMockHandler(), getLookupInvitationMockHandler({ listName: 'Grillen' }));
    const { adapter } = setup();

    await adapter.rememberInvitation(LINK_CODE);
    expect(await adapter.lookupInvitation(LINK_CODE)).toEqual({ listName: 'Grillen' });
  });
});

describe('HttpSharing join', () => {
  const JOINED = { listId: LIST_ID, listName: 'Wocheneinkauf', alreadyMember: false };

  it('joins with the token in the body', async () => {
    let seenBody: unknown;
    server.use(
      http.post('/api/v1/memberships/join', async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json(JOINED);
      }),
    );
    const { adapter } = setup();

    expect(await adapter.joinList(LINK_CODE)).toEqual(JOINED);
    expect(seenBody).toEqual({ token: LINK_CODE });
  });

  it('joins without a body for the token the server remembered (FR-AUTH-06 AC3)', async () => {
    let text = 'unset';
    server.use(
      http.post('/api/v1/memberships/join', async ({ request }) => {
        text = await request.text();
        return HttpResponse.json({ ...JOINED, alreadyMember: true });
      }),
    );
    const { adapter } = setup();

    expect(await adapter.joinList()).toEqual({ ...JOINED, alreadyMember: true });
    expect(text === '' || text === 'null').toBe(true);
  });

  it('maps the problems of a join to domain errors', async () => {
    const { adapter } = setup();
    server.use(http.post('/api/v1/memberships/join', () => problem(404, { code: 'SHARE_LINK_INVALID' })));
    await expect(adapter.joinList(LINK_CODE)).rejects.toBeInstanceOf(ShareLinkInvalidError);

    server.use(http.post('/api/v1/memberships/join', () => problem(409, { code: 'MEMBER_LIMIT_REACHED' })));
    await expect(adapter.joinList(LINK_CODE)).rejects.toEqual(new JoinLimitReachedError('members'));

    server.use(http.post('/api/v1/memberships/join', () => problem(409, { code: 'LIST_LIMIT_REACHED' })));
    await expect(adapter.joinList(LINK_CODE)).rejects.toEqual(new JoinLimitReachedError('lists'));
  });

  it('keeps a rate limit and a server failure technical', async () => {
    const { adapter } = setup();
    server.use(http.post('/api/v1/memberships/join', () => problem(429, { code: 'RATE_LIMITED' })));
    await expect(adapter.joinList(LINK_CODE)).rejects.toBeInstanceOf(TechnicalError);

    server.use(http.post('/api/v1/memberships/join', () => new HttpResponse(null, { status: 500 })));
    await expect(adapter.joinList(LINK_CODE)).rejects.toBeInstanceOf(TechnicalError);
  });
});
