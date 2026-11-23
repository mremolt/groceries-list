import type { Page } from '@playwright/test';

import type { AddItemRequest } from '../../src/features/items/adapter/out/http/generated/model/addItemRequest';
import type { ClearCheckedRequest } from '../../src/features/items/adapter/out/http/generated/model/clearCheckedRequest';
import type { ItemResponse } from '../../src/features/items/adapter/out/http/generated/model/itemResponse';
import type { UpdateItemRequest } from '../../src/features/items/adapter/out/http/generated/model/updateItemRequest';
import type { ListResponse } from '../../src/features/lists/adapter/out/http/generated/model/listResponse';

// The body types come from the backend's committed spec through the generated client models, so this fixture stops
// compiling when the contract moves (API-CON-11, TS-TEST-10).

export interface ItemsStub {
  /** The server-side state per list id, in creation order. */
  readonly items: Map<string, ItemResponse[]>;
  /** Number of `GET .../items` calls (request budget, TS-TEST-14). */
  readonly loadCalls: () => number;
  readonly sent: {
    added: AddItemRequest[];
    patched: { id: string; body: UpdateItemRequest }[];
    deleted: string[];
    cleared: ClearCheckedRequest[];
  };
  /** The next write call fails with this status (a server error, FR-FB-05). */
  failNextWrite: (status: number) => void;
  /** Somebody else changes the server state between two calls of this person (FR-SYNC-02). */
  deleteBehindTheBack: (listId: string, itemId: string) => void;
}

export function item(id: string, text: string, done = false, second = 0): ItemResponse {
  const createdAt = new Date(Date.UTC(2026, 10, 23, 10, 0, second)).toISOString();
  return { id: `00000000-0000-4000-8000-${id.padStart(12, '0')}`, text, done, createdAt, version: 1 };
}

function problem(status: number, code: string, errors?: { field: string; code: string }[]) {
  return {
    status,
    contentType: 'application/problem+json',
    json: { type: 'about:blank', title: code, status, code, ...(errors ? { errors } : {}) },
  };
}

/**
 * A stateful stub of the items API, answering like the backend (404 for lists without access, validation as in the
 * spec). Lists without seeded items start with `openCount` open items, so the drawer numbers of the lists fixture stay
 * true. Item changes update the list's `openCount` on the lists stub, as the real server would.
 */
export async function stubItems(
  page: Page,
  lists: ListResponse[],
  seeded: Readonly<Record<string, readonly ItemResponse[]>>,
): Promise<ItemsStub> {
  const items = new Map<string, ItemResponse[]>();
  let nextId = 1000;
  let loadCalls = 0;
  let failWith: number | undefined;
  const sent: ItemsStub['sent'] = { added: [], patched: [], deleted: [], cleared: [] };

  const itemsOf = (listId: string): ItemResponse[] | undefined => {
    const list = lists.find((entry) => entry.id === listId);
    if (!list) return undefined;
    if (!items.has(listId)) {
      const given = seeded[listId];
      items.set(
        listId,
        given
          ? given.map((entry) => ({ ...entry }))
          : Array.from({ length: list.openCount }, (_, index) =>
              item(String(nextId++), `Artikel ${String(index + 1)}`, false, index),
            ),
      );
    }
    return items.get(listId);
  };
  const syncCount = (listId: string): void => {
    const index = lists.findIndex((entry) => entry.id === listId);
    const list = lists[index];
    if (list) lists[index] = { ...list, openCount: (items.get(listId) ?? []).filter((entry) => !entry.done).length };
  };
  const take = (): number | undefined => {
    const status = failWith;
    failWith = undefined;
    return status;
  };
  const invalidText = (text: string | undefined) => {
    const trimmed = (text ?? '').trim();
    if (trimmed.length === 0) return problem(400, 'VALIDATION_FAILED', [{ field: 'text', code: 'TEXT_REQUIRED' }]);
    if (trimmed.length > 200) return problem(400, 'VALIDATION_FAILED', [{ field: 'text', code: 'TEXT_TOO_LONG' }]);
    return undefined;
  };
  const segments = (url: string): string[] => new URL(url).pathname.split('/'); // '', api, v1, lists, :id, items, :item

  await page.route('**/api/v1/lists/*/items/*', async (route) => {
    const request = route.request();
    const [, , , , listId = '', , itemId = ''] = segments(request.url());
    const state = itemsOf(listId);
    const failing = take();
    if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    if (!state) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    const index = state.findIndex((entry) => entry.id === itemId);
    if (request.method() === 'DELETE') {
      sent.deleted.push(itemId);
      if (index >= 0) state.splice(index, 1);
      syncCount(listId);
      return route.fulfill({ status: 204 });
    }
    if (request.method() !== 'PATCH') return route.fulfill({ status: 405, json: { title: 'Method not allowed' } });
    const body = request.postDataJSON() as UpdateItemRequest;
    sent.patched.push({ id: itemId, body });
    if (index < 0) return route.fulfill(problem(404, 'ITEM_NOT_FOUND'));
    if (body.text !== undefined) {
      const invalid = invalidText(body.text);
      if (invalid) return route.fulfill(invalid);
    }
    const current = state[index]!;
    const changed: ItemResponse = {
      ...current,
      text: body.text === undefined ? current.text : body.text.trim(),
      done: body.done ?? current.done,
      version: current.version + 1,
    };
    state[index] = changed;
    syncCount(listId);
    return route.fulfill({ json: changed });
  });

  await page.route('**/api/v1/lists/*/items/clear-checked', async (route) => {
    const [, , , , listId = ''] = segments(route.request().url());
    const state = itemsOf(listId);
    const failing = take();
    if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    if (!state) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    const body = route.request().postDataJSON() as ClearCheckedRequest;
    sent.cleared.push(body);
    const doomed = state.filter((entry) => entry.done && body.itemIds.includes(entry.id));
    items.set(
      listId,
      state.filter((entry) => !doomed.includes(entry)),
    );
    syncCount(listId);
    return route.fulfill({ json: { removed: doomed.length } });
  });

  await page.route('**/api/v1/lists/*/items', async (route) => {
    const request = route.request();
    const [, , , , listId = ''] = segments(request.url());
    const state = itemsOf(listId);
    if (request.method() === 'GET') {
      loadCalls += 1;
      return state ? route.fulfill({ json: { items: state } }) : route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    }
    const failing = take();
    if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    if (!state) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    const body = request.postDataJSON() as AddItemRequest;
    sent.added.push(body);
    const invalid = invalidText(body.text);
    if (invalid) return route.fulfill(invalid);
    if (state.length >= 500) return route.fulfill(problem(409, 'ITEM_LIMIT_REACHED'));
    const created = item(String(nextId++), body.text.trim(), false, 600 + state.length);
    state.push(created);
    syncCount(listId);
    return route.fulfill({ status: 201, json: created });
  });

  return {
    items,
    loadCalls: () => loadCalls,
    sent,
    failNextWrite: (status) => {
      failWith = status;
    },
    deleteBehindTheBack: (listId, itemId) => {
      const state = itemsOf(listId);
      const index = state?.findIndex((entry) => entry.id === itemId) ?? -1;
      if (state && index >= 0) state.splice(index, 1);
      syncCount(listId);
    },
  };
}
