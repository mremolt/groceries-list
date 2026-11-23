# 5. Building Block View

Structure inside components follows the baseline: [../baseline/05-building-block-view](../baseline/05-building-block-view/README.md).

## 5.1 Level 1: components

```mermaid
flowchart LR
  browser[Browser] --> backend
  subgraph backend[backend/ Spring Boot + BFF chain, serves the Angular bundle]
    app[Groceries service]
  end
  frontend[frontend/ Angular SPA bundle] -. embedded at image build .-> backend
  backend --> db[(PostgreSQL)]
  backend --> kc[Keycloak]
```

| Component | Responsibility | Folder |
|---|---|---|
| Backend | REST API, authorization on `Caller`, BFF session, persistence, serves the SPA | `backend/` |
| Frontend | Angular SPA: shell, lists, items, sharing, settings | `frontend/` |
| Keycloak theme | German login/registration/reset pages with design tokens | `backend/dev/keycloak/theme/` |

## 5.2 Level 2: backend

Base package `de.tantive.groceries`. Rings and adapters per [spring.md](../baseline/05-building-block-view/spring.md). Status: accounts, sessions and lists exist; the other cuts are planned and filled in per milestone (DOC-ARC-11).

| Feature cut (`application`) | Use cases (planned milestone) | Adapters |
|---|---|---|
| accounts | provision user at first login (M1), update display name (M6), delete account (M6) | `rest.v1`, `jpa`, `http` (Keycloak admin) |
| lists | **built (M2):** `CreateList`, `ListMyLists`, `GetList`, `RenameList`, `DeleteList`, `LeaveList` (one `@UseCase` each in `application.lists`; ports `ports.in.*UseCase`, commands/queries as records; outgoing ports `LoadListPort`, `SaveListPort`, `DeleteListPort`, `MembershipPort`, `ListSummaryPort`); domain `ShoppingList`, `ListName`, `Membership`, `ListSummary`, `ListNotFoundException`, `ListLimitReachedException` | `adapter.in.rest.v1` (`MyListsController`, `CreateListController`, `RenameListController`, `DeleteListController`, `LeaveListController`), `adapter.out.jpa` (`ListPersistenceAdapter`: JPA entity for creation, `JdbcClient` for member-scoped reads, locked read, rename, delete), `adapter.out.jdbc` (`MembershipJdbcAdapter`, `ListSummaryJdbcAdapter`) |
| items | add, edit, check, delete, clear checked (M3) | `rest.v1`, `jpa` |
| sharing | renew token, join, lookup invitation (M4) | `rest.v1`, `jpa` |
| sync | read items with revision, read list summaries (M5; read side of M2/M3) | `rest.v1`, `jpa` |
| demo | seed two users and three lists (M0/M7) | `adapter.in.demo` |

### Lists API (M2, contract of `backend/openapi/groceries-v1.yaml`)

| Operation | Path | Result |
|---|---|---|
| `listMyLists` | `GET /api/v1/lists` | 200 `{lists:[{id,name,openCount,revision}]}`, at most 100, oldest membership first (BR-10, BR-12) |
| `createList` | `POST /api/v1/lists` | 201 + `Location`; 400 `VALIDATION_FAILED` (`errors[].field=name`, code `NAME_REQUIRED` / `NAME_TOO_LONG`); 409 `LIST_LIMIT_REACHED` |
| `getList` | `GET /api/v1/lists/{listId}` | 200; 404 `LIST_NOT_FOUND` |
| `renameList` | `PATCH /api/v1/lists/{listId}` | 200 with the list (last write wins, no `If-Match`, ADR 0007); 404 `LIST_NOT_FOUND` |
| `deleteList` | `DELETE /api/v1/lists/{listId}` | 204; 404 |
| `leaveList` | `DELETE /api/v1/lists/{listId}/members/me` | 204; the last member leaving deletes the list; 404 |

`openCount` is `0` until M3 (the items table does not exist yet); M3 changes only the SQL of `ListSummaryJdbcAdapter`.

## 5.3 Level 2: frontend

Rings per [angular.md](../baseline/05-building-block-view/angular.md). Built in M1 (DOC-ARC-11); lists, items, sharing and settings are planned for M2-M6.

| Element | Content | Status |
|---|---|---|
| `src/platform` | runtime config, theme (`ColorScheme`), route title and focus, global error path, `PAGE_NAVIGATION` + `LOGIN_PATH` (whole-page navigation to the BFF login), `unauthenticatedInterceptor` (401 on `/api/` goes to the login), `untilAborted`, `TechnicalError` | built |
| `src/shared/ui` | `AppIcon` (self-hosted SVG icons), `WindowSize` (size classes), `Announcer`, `Snackbar` + `SnackbarHost`, `ConfirmDialogs`, `ValidatedField` (Signal Forms control), `EmptyState` | built |
| `features/session` | use cases `LoadCurrentUser`, `Logout`; ports; HTTP adapter over the generated client; published API `provideSessionApi()` | built (adapter see implementation log) |
| `features/shell` | `AppShell` (app bar with the page's h1, drawer, ⋮ menu), `ShellStore` (sign-out), `authenticatedGuard`, empty lists page, settings placeholder | built |
| `features/lists`, `items`, `sharing`, `settings` | | planned (M2-M6) |
