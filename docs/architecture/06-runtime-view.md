# 6. Runtime View

Status: planned; each scenario is confirmed per milestone.

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
