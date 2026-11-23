import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { ReportErrorUseCase } from '@platform';
import { REPORT_ERROR } from '@platform';
import { TechnicalError } from '@platform/domain';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ListLimitReachedError, ListNameInvalidError, ListNotFoundError } from '../../../domain/list-errors';
import {
  getCreateListMockHandler,
  getDeleteListMockHandler,
  getGetListMockHandler,
  getLeaveListMockHandler,
  getListMyListsMockHandler,
  getRenameListMockHandler,
} from './generated/endpoints/lists/lists.msw';
import { ListsService } from './generated/endpoints/lists/lists.service';
import { HttpLists } from './http-lists';

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
      ListsService,
      HttpLists,
      { provide: REPORT_ERROR, useValue: reportError },
    ],
  });
  return { adapter: TestBed.inject(HttpLists), reportError };
}

const ID = '8f0f5b1e-0000-4000-8000-0000000000a1';
const WEEK = { id: ID, name: 'Wocheneinkauf', openCount: 7, revision: 3 };

function problem(status: number, body: Record<string, unknown>): Response {
  return HttpResponse.json(
    { title: 'x', status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

describe('HttpLists', () => {
  it('loads my lists with one call and maps them to domain lists', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/v1/lists', () => {
        calls += 1;
        return HttpResponse.json({ lists: [WEEK] });
      }),
    );

    expect(await setup().adapter.loadMyLists()).toEqual([WEEK]);
    expect(calls).toBe(1);
  });

  it('answers what the generated mock handlers answer for each operation', async () => {
    server.use(
      getListMyListsMockHandler({ lists: [WEEK] }),
      getGetListMockHandler(WEEK),
      getCreateListMockHandler(WEEK),
      getRenameListMockHandler(WEEK),
      getDeleteListMockHandler(),
      getLeaveListMockHandler(),
    );
    const { adapter } = setup();

    expect(await adapter.loadMyLists()).toEqual([WEEK]);
    expect(await adapter.loadList(ID)).toEqual(WEEK);
    expect(await adapter.createList('Wocheneinkauf')).toEqual(WEEK);
    expect(await adapter.renameList(ID, 'Wocheneinkauf')).toEqual(WEEK);
    await expect(adapter.deleteList(ID)).resolves.toBeUndefined();
    await expect(adapter.leaveList(ID)).resolves.toBeUndefined();
  });

  it('sends the name as the body of the create call', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/v1/lists', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(WEEK, { status: 201 });
      }),
    );

    await setup().adapter.createList('Wocheneinkauf');

    expect(body).toEqual({ name: 'Wocheneinkauf' });
  });

  it('maps 404 to ListNotFoundError without reporting', async () => {
    server.use(http.get('*/api/v1/lists/:id', () => problem(404, { code: 'LIST_NOT_FOUND' })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadList(ID)).rejects.toBeInstanceOf(ListNotFoundError);
    expect(reportError.report.mock.calls).toHaveLength(0);
  });

  it('maps 409 LIST_LIMIT_REACHED to ListLimitReachedError', async () => {
    server.use(http.post('*/api/v1/lists', () => problem(409, { code: 'LIST_LIMIT_REACHED' })));

    await expect(setup().adapter.createList('x')).rejects.toBeInstanceOf(ListLimitReachedError);
  });

  it.each([
    ['NAME_REQUIRED', 'required'],
    ['NAME_TOO_LONG', 'tooLong'],
  ] as const)('maps the 400 field error %s to a ListNameInvalidError', async (code, expected) => {
    server.use(
      http.patch('*/api/v1/lists/:id', () =>
        problem(400, { code: 'VALIDATION_FAILED', errors: [{ field: 'name', code }] }),
      ),
    );

    await expect(setup().adapter.renameList(ID, 'x')).rejects.toEqual(new ListNameInvalidError(expected));
  });

  it('reports and rethrows a TechnicalError for a server error', async () => {
    server.use(http.delete('*/api/v1/lists/:id', () => HttpResponse.json({ status: 500 }, { status: 500 })));
    const { adapter, reportError } = setup();

    await expect(adapter.deleteList(ID)).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });

  it('answers a TechnicalError when the body does not match the contract', async () => {
    server.use(http.get('*/api/v1/lists', () => HttpResponse.json({ lists: [{ id: 'not-a-uuid' }] })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadMyLists()).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });

  it('stops waiting when the caller aborts', async () => {
    server.use(http.get('*/api/v1/lists', async () => new Promise<Response>(() => undefined)));
    const control = new AbortController();
    const pending = setup().adapter.loadMyLists(control.signal);

    control.abort();

    await expect(pending).rejects.toBeDefined();
  });
});
