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
  S-->>B: {listId}
```

## 6.3 Polling

Open list: `GET /v1/lists/{id}/items` with `If-None-Match` every 5 s while visible; 304 reads one row. Drawer: `GET /v1/lists` every 30 s ([ADR 0006](../adr/0006-sync-by-polling-with-list-revision.md)).

## 6.4 Optimistic check/uncheck

Store patches the item, calls `PATCH /v1/lists/{id}/items/{itemId}`, rolls back and shows the error snackbar on failure (NG-STATE-10).

Implemented in M3 (`ItemsStore.setDone`): the item moves between the sections at once (NFR-PERF-02), the saves of one item run in order through a per-key queue so the last click wins on the server too (NG-STATE-18, ADR 0007), a failure puts the item back only while the screen still shows that click, and a 404 (`ITEM_NOT_FOUND`) drops the item and says „Dieser Artikel wurde inzwischen gelöscht.“ Focus after checking moves to the next open item, or the previous one when it was the last (FR-ITEM-02 AC3); adding keeps the focus in the field (FR-ITEM-01 AC3). Adding is not optimistic: the field is cleared only after the server saved the item, so typed text is never lost (FR-FB-05 AC2); a second add waits for the first.

## 6.5 Sign-out (frontend, M1)

The ⋮ menu entry „Abmelden“ calls `Logout`, which posts `/logout` (XSRF header) to the BFF and expects `200 {"redirectUri"}`; the adapter accepts only an `https` URL (`http` only for the local IdP, TS-SEC-10). The page then navigates to that address with `window.location.assign`. A technical failure shows the generic error snackbar and the page stays. The sign-out command cannot run twice at once (UI-20).
