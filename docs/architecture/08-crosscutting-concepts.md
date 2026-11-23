# 8. Cross-cutting Concepts

Baseline concepts: [../baseline/08-crosscutting-concepts](../baseline/08-crosscutting-concepts/README.md). This chapter records only what is product-specific.

## Business rules

Source of truth: [`requirements/04-detailed-requirements.md` §2.2](../../requirements/04-detailed-requirements.md) (BR-01…BR-12), implemented in `domain` and the use cases (DOC-ARC-10). Open assumptions: [open-questions.md](open-questions.md).

## Authorization (BR-01, NFR-SEC-04)

Use cases authorize on the `Caller` (SPRING-SEC-02); every list/item use case loads the membership first and answers `NotFoundException` for non-members, so "no access" and "does not exist" are identical (SPRING-SEC-36). Cross-user tests per use case (SPRING-SEC-16).

## Lists: rules, concurrency and data loading (M2)

| Topic | Realisation |
|---|---|
| BR-01/NFR-SEC-04 | `LoadListPort.findForMember` and `ListSummaryPort` only find lists the caller is a member of, so a non-member and an unknown id are the same empty result and the use case raises `ListNotFoundException` (404 `LIST_NOT_FOUND`, one body). Proven per use case (`@Tag("cross-user")` unit tests) and through the real chain and PostgreSQL in `ListsApiIT` |
| Audit | A refusal logs the structured event `access.refused` (resource `list`, pseudonymous user id only, no list name or e-mail, SPRING-SEC-22) in the REST advice |
| BR-02/05 | no roles: any member renames and deletes; deleting a list removes memberships by `ON DELETE CASCADE` |
| BR-04 | `LeaveList` locks the list row (`SELECT … FOR UPDATE OF l`) before it counts the remaining members; the last two members leaving at once delete the list exactly once (`ListRulesConcurrencyIT`) |
| BR-10 | order of `GET /lists`: `memberships.joined_at, lists.id` ascending, served by `memberships_user_joined_idx` |
| BR-12 (100 lists per user) | `CreateList` locks the user's row (`SELECT … FOR UPDATE`, SPRING-DB-22), then counts, then inserts; two parallel creations at 99 lists let exactly one through (`ListRulesConcurrencyIT`). The overview query has the hard bound `LIMIT 100` (SPRING-DB-12, API-N1-07) |
| Revision | `lists.revision` (also the Hibernate `@Version`) is increased by every rename (`revision = revision + 1`, atomic, last write wins, [ADR 0007](../adr/0007-last-write-wins-item-updates.md)); every item write (add, update, delete, clear checked that removed something) increases it in the same transaction as the item change (`ItemPersistenceAdapter`, ADR 0006); items carry their own `version` (Hibernate `@Version`, +1 per set-based update). It is the ETag of the item snapshot (M5). Membership changes (join, leave) and share-link get/renew do **not** move it: they change no item or list content, and the drawer poll (`GET /v1/lists`, 30 s) carries new and removed lists; a list that was left or deleted answers 404 to the items poll (FR-SYNC-05) |
| N+1 (API-N1-01) | strategy: backend view endpoint. `GET /api/v1/lists` is **one** set-based statement for all lists of the user (asserted: `ListSummaryJdbcAdapterIT.usesOneStatementNoMatterHowManyListsTheUserHas`, SPRING-TEST-06); the drawer never calls per list. the open count is a correlated sub-select in the same statement (M3), not a second query. `GET …/items` is one statement for all items of a list (`ItemPersistenceAdapterIT.readsOldestFirstInOneStatement…`, `LIMIT 500`); membership is a second, constant check |
| BR-12 (500 items per list) | `AddItem` locks the list row (`FOR UPDATE OF l`) before it counts, then inserts; two parallel additions at 499 items let exactly one through (`ItemRulesConcurrencyIT`, mutation-checked by removing the lock). Item text 1–200 characters after trimming, validated once in `ItemText` (code points, not UTF-16 units) |
| BR-09 | `GET …/items` orders by `created_at, id` ascending, served by `items_list_created_idx`; unchecking keeps the item's place because the order never depends on `done` |
| Name rule | 1–80 characters after trimming, validated once in `ListName` (domain); a missing name is `NAME_REQUIRED` like an empty one |

## Authentication and sessions

See [ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md)/[0003](../adr/0003-map-auth-requirements-to-oidc.md). IdP configuration for SEC-CRY-06 exists as the dev realm `backend/dev/keycloak/groceries-realm.json` and the German login/e-mail theme `backend/dev/keycloak/theme/groceries/` (policy table in [security requirements](../security/requirements.md)); run with `docker compose --profile auth --profile mail up`. Wiring the backend to it (OIDC client, sessions) is built by the M1 backend work and is not documented as existing here yet.

## Theme and design tokens

`requirements/mockups/design-tokens.json` → `frontend/src/styles/theme.scss` (`mat.theme` with custom palettes, light/dark, system mode, high contrast). Per-device preference stored in `localStorage` key `theme` (not personal data, not a token: allowed by TS-SEC-01). Planned for M0.

## Time

One injected `Clock` in the backend (ARCH-UC-20); `CLOCK` token in the frontend (NG-ARCH-24).

## Errors

RFC 9457 problem details with stable codes. Validation errors are always `400` with `code: VALIDATION_FAILED` and `errors: [{field, code}]` (field codes such as `NAME_REQUIRED`, `NAME_TOO_LONG`). Existing codes: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `RATE_LIMITED`, `LIST_NOT_FOUND`, `LIST_LIMIT_REACHED`. `ITEM_NOT_FOUND`, `ITEM_LIMIT_REACHED` (M3), field codes `TEXT_REQUIRED`, `TEXT_TOO_LONG`, `CHANGE_REQUIRED`, `TOO_MANY_ITEMS`. Planned: `SHARE_LINK_INVALID`, member limit code.

## Rate limits (SPRING-SEC-21)

| Endpoint | Limit | Where |
|---|---|---|
| Keycloak login/registration/reset | brute-force detection, 5/15 min | Keycloak realm |
| `POST /v1/invitations/lookup`, `POST /v1/invitations` (public) | 30 per minute and client address (`app.rate-limits.invitations-per-minute`) | `RateLimitFilter` (Bucket4j) in the API chain |
| `POST /v1/memberships/join` | 20 per minute and client address **and** 20 per minute and person (`app.rate-limits.join-per-minute`; two filters, each with its own request marker) | `RateLimitFilter` in the API chain |
| `/oauth2/authorization/*` (creates a session) | per IP | Bucket4j filter in the app (M1) |

## UI building blocks (M1)

- **Responsive shell** (FR-NAV-01): `WindowSize` decides only the drawer mode (modal on compact and medium, permanent 360 px on expanded); everything else is CSS (NG-UI-21). Medium follows FR-NAV-01 (modal drawer) instead of the navigation rail of NG-UI-10; recorded as an assumption in the implementation log.
- **Page heading**: every route carries `data.heading` (translation key); the shell renders it as the page's one h1 in the app bar. Route focus moves to that h1 after a navigation (A11Y-21).
- **Snackbar** (FR-FB-02): one visible `role="status"` region, 10 s minimum, the countdown restarts after hover or focus leaves.
- **Dialogs** (FR-FB-03): `ConfirmDialogs.confirm()` over `MatDialog`; focus starts on the cancel button, Esc cancels, focus returns to the trigger.
- **Form fields** (FR-FB-04): `ValidatedField` is a Signal Forms custom control; errors appear after the field was touched or the form submitted, text starts with „Fehler:“, linked by `aria-describedby`, `focus()` for the first invalid field.
- **Icons**: inline SVG paths in `AppIcon` (no icon font, no `bypassSecurityTrust*`).
