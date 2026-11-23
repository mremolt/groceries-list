import type { Page } from '@playwright/test';

import type { CreateListRequest } from '../../src/features/lists/adapter/out/http/generated/model/createListRequest';
import type { ListResponse } from '../../src/features/lists/adapter/out/http/generated/model/listResponse';
import type { MyListsResponse } from '../../src/features/lists/adapter/out/http/generated/model/myListsResponse';
import type { RenameListRequest } from '../../src/features/lists/adapter/out/http/generated/model/renameListRequest';

// The body types come from the backend's committed spec through the generated client models, so this fixture stops
// compiling when the contract moves (API-CON-11, TS-TEST-10).

export const WEEK: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'Wocheneinkauf',
  openCount: 7,
  revision: 3,
};
export const BBQ: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000a2',
  name: 'Grillabend Samstag',
  openCount: 0,
  revision: 1,
};
export const WG: ListResponse = {
  id: '00000000-0000-4000-8000-0000000000a3',
  name: 'WG-Vorrat',
  openCount: 12,
  revision: 5,
};

export interface ListsStub {
  /** The server-side state: what `GET /api/v1/lists` answers right now, in navigation order. */
  readonly lists: ListResponse[];
  /** Number of `GET /api/v1/lists` calls (request budget, TS-TEST-14). */
  readonly listCalls: () => number;
  /** Bodies the page sent to the create/rename calls. */
  readonly sent: { created: CreateListRequest[]; renamed: RenameListRequest[]; deleted: string[]; left: string[] };
  /** The next write call fails with this status (a server error, FR-FB-05). */
  failNextWrite: (status: number) => void;
}

function problem(status: number, code: string, errors?: { field: string; code: string }[]) {
  return {
    status,
    contentType: 'application/problem+json',
    json: { type: 'about:blank', title: code, status, code, ...(errors ? { errors } : {}) },
  };
}

/** A stateful stub of the lists API, answering like the backend: 404 for lists that are not in the state (BR-01). */
export async function stubLists(page: Page, initial: readonly ListResponse[]): Promise<ListsStub> {
  const lists: ListResponse[] = initial.map((list) => ({ ...list }));
  const sent: ListsStub['sent'] = { created: [], renamed: [], deleted: [], left: [] };
  let listCalls = 0;
  let failWith: number | undefined;
  let nextId = 100;
  const take = (): number | undefined => {
    const status = failWith;
    failWith = undefined;
    return status;
  };
  const invalidName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return problem(400, 'VALIDATION_FAILED', [{ field: 'name', code: 'NAME_REQUIRED' }]);
    if (trimmed.length > 80) return problem(400, 'VALIDATION_FAILED', [{ field: 'name', code: 'NAME_TOO_LONG' }]);
    return undefined;
  };
  const idOf = (url: string): string => new URL(url).pathname.split('/')[4] ?? '';

  await page.route('**/api/v1/lists', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      listCalls += 1;
      const body: MyListsResponse = { lists };
      return route.fulfill({ json: body });
    }
    const failing = take();
    if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    const body = request.postDataJSON() as CreateListRequest;
    sent.created.push(body);
    const invalid = invalidName(body.name);
    if (invalid) return route.fulfill(invalid);
    const created: ListResponse = {
      id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
      name: body.name.trim(),
      openCount: 0,
      revision: 1,
    };
    lists.push(created);
    return route.fulfill({ status: 201, json: created });
  });

  await page.route('**/api/v1/lists/*', async (route) => {
    const request = route.request();
    const id = idOf(request.url());
    const index = lists.findIndex((list) => list.id === id);
    if (request.method() !== 'GET') {
      const failing = take();
      if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    }
    if (index < 0) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    const list = lists[index]!;
    switch (request.method()) {
      case 'GET':
        return route.fulfill({ json: list });
      case 'PATCH': {
        const body = request.postDataJSON() as RenameListRequest;
        sent.renamed.push(body);
        const invalid = invalidName(body.name);
        if (invalid) return route.fulfill(invalid);
        const renamed = { ...list, name: body.name.trim(), revision: list.revision + 1 };
        lists[index] = renamed;
        return route.fulfill({ json: renamed });
      }
      case 'DELETE':
        sent.deleted.push(id);
        lists.splice(index, 1);
        return route.fulfill({ status: 204 });
      default:
        return route.fulfill({ status: 405, json: { title: 'Method not allowed' } });
    }
  });

  await page.route('**/api/v1/lists/*/members/me', async (route) => {
    const id = idOf(route.request().url());
    const failing = take();
    if (failing) return route.fulfill({ status: failing, json: { title: 'Server error' } });
    const index = lists.findIndex((list) => list.id === id);
    if (index < 0) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    sent.left.push(id);
    lists.splice(index, 1);
    return route.fulfill({ status: 204 });
  });

  return {
    lists,
    listCalls: () => listCalls,
    sent,
    failNextWrite: (status) => {
      failWith = status;
    },
  };
}
