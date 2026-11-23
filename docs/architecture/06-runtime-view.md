# 6. Runtime View

Status: 6.1 and 6.5 are built in the frontend as of M1 (the guard, the 401 interceptor and the sign-out); the rest is planned per milestone.

## 6.1 Login (OIDC code flow through the BFF)

```mermaid
sequenceDiagram
  participant B as Browser (SPA)
  participant S as Backend (BFF)
  participant K as Keycloak
  B->>S: GET /api/v1/me (no session)
  S-->>B: 401
  B->>S: navigate /oauth2/authorization/keycloak
  S-->>B: 302 to Keycloak (state, PKCE)
  B->>K: login or register
  K-->>B: 302 /login/oauth2/code/keycloak?code
  B->>S: code
  S->>K: token request (client secret, PKCE verifier)
  S->>S: provision/link user, create session (cookie)
  S-->>B: 302 /
```

## 6.1a Delete the account (M6, FR-SET-04)

```mermaid
sequenceDiagram
  participant B as Browser (SPA)
  participant S as Backend (BFF)
  participant K as Keycloak
  B->>S: DELETE /api/v1/me
  S-->>B: 403 REAUTH_REQUIRED (no fresh login in this session)
  B->>S: navigate /oauth2/authorization/keycloak?reauth=1
  S-->>B: 302 to Keycloak (prompt=login, max_age=0), expected subject kept in the session
  B->>K: password
  K-->>B: 302 callback (ID token with auth_time)
  S->>S: same subject and auth_time < 5 min: confirm in the session
  S-->>B: 302 /einstellungen?konto-loeschen
  B->>S: DELETE /api/v1/me
  S->>S: one transaction: lock user and lists, leave lists, delete empty lists, delete user, end sessions, outbox row
  S->>K: DELETE admin/realms/groceries/users/{sub} (service account, timeouts)
  S-->>B: 204, session invalidated, cookie expired
```

The SPA side: „Konto löschen“ opens the dialog „Konto löschen?“ (the password field of FR-SET-04 AC1 is the new login at the IdP, ADR 0003); confirming navigates the whole page to `…?reauth=1`. On `/einstellungen?konto-loeschen` the page removes the marker from the address (`replaceUrl`) and opens the final dialog; its confirmation calls `DELETE /api/v1/me`. `204` navigates to the login, `403 REAUTH_REQUIRED` starts the re-authentication again, any other failure keeps the dialog open with a status line and the error snackbar (FR-FB-05). A guessed or bookmarked address only opens the dialog: the backend refuses without a fresh login.

If Keycloak does not answer, the answer is still `204`; the outbox row stays and `IdpDeletionRetryJob` retries every 5 minutes (idempotent: a missing user is a success).

## 6.2 Join via share link

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Backend
  B->>S: POST /v1/invitations/lookup {token}
  S-->>B: {listName} or 404
  B->>S: POST /v1/invitations {token} (stored in session)
  B->>S: login (6.1)
  S-->>B: 302 /j/consume
  B->>S: POST /v1/memberships/join {} (token from session)
  S-->>B: {listId, listName, alreadyMember}
```

Built in M4 (frontend): `/j/consume` comes first in `shell.routes.ts` and has the `authenticatedGuard`; `/j/:token` has none, because a visitor must see the invitation. `JoinStore.start` asks `CheckSignedIn` first (the 401 of the probe does not redirect, `ANONYMOUS_ALLOWED`): with a session it joins at once with the token in the request body and opens the list with `replaceUrl`, so the token leaves the address bar and the history; without one it looks the list name up and shows the invitation. „Konto erstellen und beitreten“ and „Anmelden“ first call `POST /v1/invitations`, then navigate the whole page to the login (`?prompt=create` for the sign-up). Invalid, limit and failure answers are pages of the same route; except a retryable failure, they take the secret off the address bar with `Location.replaceState('/')`. The token lives in the store's memory only, never in browser storage or a link. A snackbar behind a modal dialog is hidden from screen readers, so the share dialog repeats „Link kopiert“ and the renewal message in its own `role="status"` line.

Built in M4 (backend). `POST /v1/invitations` validates the token first (a wrong one answers the uniform `404 SHARE_LINK_INVALID` and opens **no** session), then keeps the token in a server-side session that lives 2 hours until the login has finished; the login success handler restores the normal idle time and redirects to `/j/consume` when a token is pending. The sign-up variant is `GET /oauth2/authorization/keycloak?prompt=create`. `JoinList` locks the list row (found by token) before it counts the members (50), then the user's row before it counts their lists (100); `RenewShareLink` locks the same list row, so a join that read the old token waits and then finds nothing. A member opening the link again gets `alreadyMember: true` without any limit check. The remembered token is used once whatever the outcome.

## 6.3 Polling

Open list: `GET /v1/lists/{id}/items` with `If-None-Match` every 5 s while visible. The ETag is the strong validator `"<revision>"`. `ListItemsService` reads membership and revision in one single-row statement; when the client names the current revision it answers 304 (no body, ETag repeated) and **no item is read** (asserted by `ItemsSyncApiIT`, statement count). Otherwise it reads the items after the revision, so a snapshot is never labelled newer than its data; a concurrent change shows up as a newer revision on the next poll. A non-member, a member who left and a deleted list answer the uniform 404 `LIST_NOT_FOUND` even to a valid validator, without an ETag (FR-SYNC-05, BR-01). Only a single strong or weak `"<digits>"` validator counts; anything else (several values, `*`, text) is treated as no validator. The responses keep Spring Security's `Cache-Control: no-store` (personal data), so the browser never revalidates by itself: the SPA sends `If-None-Match` explicitly and keeps its last snapshot on 304. Drawer: `GET /v1/lists` every 30 s ([ADR 0006](../adr/0006-sync-by-polling-with-list-revision.md)).

Implemented in M5 (frontend). **Open list:** `ListSync` calls `ItemsStore.refresh` every 5 s with the etag of the snapshot it holds (`PageActivity` pauses it while the tab is hidden and fires one poll at once when the tab becomes visible, the window gets the focus or the network is back). A `304` changes nothing. A `200` replaces the items but keeps the object of every unchanged item (`reuseUnchanged`), so rows, focus, scroll position, typed text and open dialogs stay (FR-SYNC-01 AC5); the changes by others (`describeChanges` against what is shown, so the person's own confirmed changes count as nothing) are announced once per sync through the polite `Announcer` („Liste aktualisiert: 2 neue Artikel, 1 erledigt.“, FR-SYNC-04). **No overwriting of the person's own changes:** a poll is dropped when one of their saves is running, or when one started or ended after the poll's request began (a stamp in the store); the next poll, at most 5 s later, brings the state. After a `200` the lists are read again (one call), so a rename by another member reaches the heading and the drawer within seconds, and the open list's count is taken from the items, which are newer than that answer. **List gone:** a 404 answers FR-SYNC-05 with „Diese Liste wurde gelöscht.“, the next list or the empty state; a list the person deleted or left here (`ListsStore.isDeparted`) is silent. **Drawer:** `ShellSync` reads `GET /v1/lists` every 30 s while visible and on focus (FR-SYNC-03). **No connection (FR-FB-06):** failed polls (a `TechnicalError`) are reported to `ConnectionMonitor`; after 10 s from the first failure the banner „Keine Verbindung. Änderungen sind gerade nicht möglich.“ shows and the commands that change data are disabled (reading stays), without error snackbars from background polls; the polls back off (5, 10, 15 s) and the first success, or the browser's `online` event, ends it and syncs at once. All timers stop with the component or shell that started them (tested: no timer is left behind).

## 6.4 Optimistic check/uncheck

Store patches the item, calls `PATCH /v1/lists/{id}/items/{itemId}`, rolls back and shows the error snackbar on failure (NG-STATE-10).

Implemented in M3 (`ItemsStore.setDone`): the item moves between the sections at once (NFR-PERF-02), the saves of one item run in order through a per-key queue so the last click wins on the server too (NG-STATE-18, ADR 0007), a failure puts the item back only while the screen still shows that click, and a 404 (`ITEM_NOT_FOUND`) drops the item and says „Dieser Artikel wurde inzwischen gelöscht.“ Focus after checking moves to the next open item, or the previous one when it was the last (FR-ITEM-02 AC3); adding keeps the focus in the field (FR-ITEM-01 AC3). Adding is not optimistic: the field is cleared only after the server saved the item, so typed text is never lost (FR-FB-05 AC2); a second add waits for the first.

## 6.5 Sign-out (frontend, M1)

The ⋮ menu entry „Abmelden“ calls `Logout`, which posts `/logout` (XSRF header) to the BFF and expects `200 {"redirectUri"}`; the adapter accepts only an `https` URL (`http` only for the local IdP, TS-SEC-10). The page then navigates to that address with `window.location.assign`. A technical failure shows the generic error snackbar and the page stays. The sign-out command cannot run twice at once (UI-20).
