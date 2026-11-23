import type { Page } from '@playwright/test';

import type { ListResponse } from '../../src/features/lists/adapter/out/http/generated/model/listResponse';
import type { JoinListRequest } from '../../src/features/sharing/adapter/out/http/generated/model/joinListRequest';
import type { JoinListResponse } from '../../src/features/sharing/adapter/out/http/generated/model/joinListResponse';
import type { ShareLinkResponse } from '../../src/features/sharing/adapter/out/http/generated/model/shareLinkResponse';
import type { ShareTokenRequest } from '../../src/features/sharing/adapter/out/http/generated/model/shareTokenRequest';

// The body types come from the backend's committed spec through the generated client models, so this fixture stops
// compiling when the contract moves (API-CON-11, TS-TEST-10).

export const LINK_BASE = 'https://einkauf.example.test/j/';

export interface SharingStub {
  /** Makes a list the person is not a member of joinable; answers its (new) share token. */
  offerForeignList: (list: ListResponse) => string;
  /** The current token of a list the person is a member of (the stub invents one on first use). */
  tokenOf: (listId: string) => string;
  /** Another member renews the link: answers the new token, the old one is unknown from now on (BR-06). */
  renewToken: (listId: string) => string;
  /** The token the server session remembers from before the login (what `/j/consume` joins with). */
  readonly remembered: { token: string | undefined };
  /** Bodies the page sent. */
  readonly sent: { lookups: ShareTokenRequest[]; remembered: ShareTokenRequest[]; joins: (JoinListRequest | null)[] };
  /** The next join is refused with this problem code (status 409). */
  refuseNextJoin: (code: 'MEMBER_LIMIT_REACHED' | 'LIST_LIMIT_REACHED') => void;
  /** Number of `GET .../share-link` calls. */
  readonly linkLoads: () => number;
}

function problem(status: number, code: string) {
  return {
    status,
    contentType: 'application/problem+json',
    json: { type: 'about:blank', title: code, status, code },
  };
}

/**
 * A stateful stub of the sharing API, answering like the backend: one valid token per list, a renewed token makes the old
 * one unknown (BR-06), unknown tokens are one uniform 404 (FR-SHARE-04 AC2), joining an own list changes nothing.
 * `members` is the lists stub's state, so a join shows up in the drawer.
 */
export async function stubSharing(page: Page, members: ListResponse[]): Promise<SharingStub> {
  const tokenByList = new Map<string, string>();
  const foreign = new Map<string, ListResponse>();
  const sent: SharingStub['sent'] = { lookups: [], remembered: [], joins: [] };
  const remembered: { token: string | undefined } = { token: undefined };
  let counter = 0;
  let refusal: 'MEMBER_LIMIT_REACHED' | 'LIST_LIMIT_REACHED' | undefined;
  let linkLoads = 0;

  const issue = (listId: string): string => {
    counter += 1;
    const token =
      `T${String(counter).padStart(2, '0')}-${listId.slice(-4)}_stub-share-code-0123456789abcdefghijkl`.slice(0, 43);
    tokenByList.set(listId, token);
    return token;
  };
  const tokenOf = (listId: string): string => tokenByList.get(listId) ?? issue(listId);
  const listOfToken = (token: string): { list: ListResponse; member: boolean } | undefined => {
    for (const [listId, current] of tokenByList) {
      if (current !== token) continue;
      const own = members.find((list) => list.id === listId);
      if (own) return { list: own, member: true };
      const other = foreign.get(listId);
      if (other) return { list: other, member: false };
    }
    return undefined;
  };
  const idOf = (url: string): string => new URL(url).pathname.split('/')[4] ?? '';

  await page.route('**/api/v1/lists/*/share-link', (route) => {
    const listId = idOf(route.request().url());
    if (!members.some((list) => list.id === listId)) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    linkLoads += 1;
    const body: ShareLinkResponse = { url: `${LINK_BASE}${tokenOf(listId)}` };
    return route.fulfill({ json: body });
  });

  await page.route('**/api/v1/lists/*/share-link/renew', (route) => {
    const listId = idOf(route.request().url());
    if (!members.some((list) => list.id === listId)) return route.fulfill(problem(404, 'LIST_NOT_FOUND'));
    const body: ShareLinkResponse = { url: `${LINK_BASE}${issue(listId)}` };
    return route.fulfill({ json: body });
  });

  await page.route('**/api/v1/invitations/lookup', (route) => {
    const body = route.request().postDataJSON() as ShareTokenRequest;
    sent.lookups.push(body);
    const found = listOfToken(body.token);
    return found
      ? route.fulfill({ json: { listName: found.list.name } })
      : route.fulfill(problem(404, 'SHARE_LINK_INVALID'));
  });

  await page.route('**/api/v1/invitations', (route) => {
    const body = route.request().postDataJSON() as ShareTokenRequest;
    sent.remembered.push(body);
    if (!listOfToken(body.token)) return route.fulfill(problem(404, 'SHARE_LINK_INVALID'));
    remembered.token = body.token;
    return route.fulfill({ status: 204 });
  });

  await page.route('**/api/v1/memberships/join', (route) => {
    const raw = route.request().postData();
    const body = raw ? (JSON.parse(raw) as JoinListRequest) : null;
    sent.joins.push(body);
    if (refusal) {
      const code = refusal;
      refusal = undefined;
      return route.fulfill(problem(409, code));
    }
    const token = body?.token === undefined || body.token === '' ? remembered.token : body.token;
    const found = token ? listOfToken(token) : undefined;
    if (!found) return route.fulfill(problem(404, 'SHARE_LINK_INVALID'));
    if (!found.member) members.push({ ...found.list });
    remembered.token = undefined;
    const answer: JoinListResponse = { listId: found.list.id, listName: found.list.name, alreadyMember: found.member };
    return route.fulfill({ json: answer });
  });

  return {
    offerForeignList: (list) => {
      foreign.set(list.id, list);
      return issue(list.id);
    },
    tokenOf,
    renewToken: issue,
    remembered,
    sent,
    refuseNextJoin: (code) => {
      refusal = code;
    },
    linkLoads: () => linkLoads,
  };
}
