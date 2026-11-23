import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { ReportErrorUseCase } from '@platform';
import { REPORT_ERROR } from '@platform';
import { TechnicalError } from '@platform/domain';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
  ItemLimitReachedError,
  ItemListNotFoundError,
  ItemNotFoundError,
  ItemTextInvalidError,
} from '../../../domain/item-errors';
import {
  getAddItemMockHandler,
  getClearCheckedItemsMockHandler,
  getDeleteItemMockHandler,
  getListItemsMockHandler,
  getUpdateItemMockHandler,
} from './generated/endpoints/items/items.msw';
import { ItemsService } from './generated/endpoints/items/items.service';
import { HttpItems } from './http-items';

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
      ItemsService,
      HttpItems,
      { provide: REPORT_ERROR, useValue: reportError },
    ],
  });
  return { adapter: TestBed.inject(HttpItems), reportError };
}

const LIST = '8f0f5b1e-0000-4000-8000-0000000000a1';
const ID = '8f0f5b1e-0000-4000-8000-0000000000b1';
const DTO = { id: ID, text: '2× Milch', done: false, createdAt: '2026-11-23T10:00:00Z', version: 1 };

function problem(status: number, body: Record<string, unknown>): Response {
  return HttpResponse.json(
    { title: 'x', status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

describe('HttpItems', () => {
  it('loads all items of a list with one call (API-N1-01)', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/v1/lists/:id/items', () => {
        calls += 1;
        return HttpResponse.json({ items: [DTO] });
      }),
    );

    expect(await setup().adapter.loadItems(LIST)).toEqual([DTO]);
    expect(calls).toBe(1);
  });

  it('answers what the generated mock handlers answer for each operation', async () => {
    server.use(
      getListItemsMockHandler({ items: [DTO] }),
      getAddItemMockHandler(DTO),
      getUpdateItemMockHandler({ ...DTO, done: true }),
      getDeleteItemMockHandler(),
      getClearCheckedItemsMockHandler({ removed: 2 }),
    );
    const { adapter } = setup();

    expect(await adapter.loadItems(LIST)).toEqual([DTO]);
    expect(await adapter.addItem(LIST, '2× Milch')).toEqual(DTO);
    expect((await adapter.updateItem(LIST, ID, { done: true })).done).toBe(true);
    await expect(adapter.deleteItem(LIST, ID)).resolves.toBeUndefined();
    expect(await adapter.clearCheckedItems(LIST, [ID])).toBe(2);
  });

  it('sends the text on add, only the changed field on update and the ids on clear', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post('*/api/v1/lists/:id/items', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(DTO, { status: 201 });
      }),
      http.patch('*/api/v1/lists/:id/items/:item', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(DTO);
      }),
      http.post('*/api/v1/lists/:id/items/clear-checked', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ removed: 1 });
      }),
    );
    const { adapter } = setup();

    await adapter.addItem(LIST, 'Brot');
    await adapter.updateItem(LIST, ID, { done: true });
    await adapter.updateItem(LIST, ID, { text: 'Brot' });
    await adapter.clearCheckedItems(LIST, [ID]);

    expect(bodies).toEqual([{ text: 'Brot' }, { done: true }, { text: 'Brot' }, { itemIds: [ID] }]);
  });

  it('maps 404 LIST_NOT_FOUND and ITEM_NOT_FOUND to their domain errors without reporting', async () => {
    server.use(
      http.get('*/api/v1/lists/:id/items', () => problem(404, { code: 'LIST_NOT_FOUND' })),
      http.patch('*/api/v1/lists/:id/items/:item', () => problem(404, { code: 'ITEM_NOT_FOUND' })),
    );
    const { adapter, reportError } = setup();

    await expect(adapter.loadItems(LIST)).rejects.toBeInstanceOf(ItemListNotFoundError);
    await expect(adapter.updateItem(LIST, ID, { done: true })).rejects.toBeInstanceOf(ItemNotFoundError);
    expect(reportError.report.mock.calls).toHaveLength(0);
  });

  it('maps 409 ITEM_LIMIT_REACHED (BR-12)', async () => {
    server.use(http.post('*/api/v1/lists/:id/items', () => problem(409, { code: 'ITEM_LIMIT_REACHED' })));

    await expect(setup().adapter.addItem(LIST, 'x')).rejects.toBeInstanceOf(ItemLimitReachedError);
  });

  it.each([
    ['TEXT_REQUIRED', 'required'],
    ['TEXT_TOO_LONG', 'tooLong'],
  ] as const)('maps the 400 field error %s to an ItemTextInvalidError', async (code, expected) => {
    server.use(
      http.post('*/api/v1/lists/:id/items', () =>
        problem(400, { code: 'VALIDATION_FAILED', errors: [{ field: 'text', code }] }),
      ),
    );

    await expect(setup().adapter.addItem(LIST, 'x')).rejects.toEqual(new ItemTextInvalidError(expected));
  });

  it('reports and rethrows a TechnicalError for a server error', async () => {
    server.use(
      http.delete('*/api/v1/lists/:id/items/:item', () => HttpResponse.json({ status: 500 }, { status: 500 })),
    );
    const { adapter, reportError } = setup();

    await expect(adapter.deleteItem(LIST, ID)).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });

  it('answers a TechnicalError when the body does not match the contract', async () => {
    server.use(http.get('*/api/v1/lists/:id/items', () => HttpResponse.json({ items: [{ id: 'not-a-uuid' }] })));
    const { adapter, reportError } = setup();

    await expect(adapter.loadItems(LIST)).rejects.toBeInstanceOf(TechnicalError);
    expect(reportError.report.mock.calls).toHaveLength(1);
  });
});
