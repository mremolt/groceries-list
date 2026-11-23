# 8. Cross-cutting Concepts

Baseline concepts: [../baseline/08-crosscutting-concepts](../baseline/08-crosscutting-concepts/README.md). This chapter records only what is product-specific.

## Business rules

Source of truth: [`requirements/04-detailed-requirements.md` §2.2](../../requirements/04-detailed-requirements.md) (BR-01…BR-12), implemented in `domain` and the use cases (DOC-ARC-10). Open assumptions: [open-questions.md](open-questions.md).

## Authorization (BR-01, NFR-SEC-04)

Use cases authorize on the `Caller` (SPRING-SEC-02); every list/item use case loads the membership first and answers `NotFoundException` for non-members, so "no access" and "does not exist" are identical (SPRING-SEC-36). Cross-user tests per use case (SPRING-SEC-16).

## Authentication and sessions

See [ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md)/[0003](../adr/0003-map-auth-requirements-to-oidc.md). IdP configuration for SEC-CRY-06 exists as the dev realm `backend/dev/keycloak/groceries-realm.json` and the German login/e-mail theme `backend/dev/keycloak/theme/groceries/` (policy table in [security requirements](../security/requirements.md)); run with `docker compose --profile auth --profile mail up`. Wiring the backend to it (OIDC client, sessions) is built by the M1 backend work and is not documented as existing here yet.

## Theme and design tokens

`requirements/mockups/design-tokens.json` → `frontend/src/styles/theme.scss` (`mat.theme` with custom palettes, light/dark, system mode, high contrast). Per-device preference stored in `localStorage` key `theme` (not personal data, not a token: allowed by TS-SEC-01). Planned for M0.

## Time

One injected `Clock` in the backend (ARCH-UC-20); `CLOCK` token in the frontend (NG-ARCH-24).

## Errors

RFC 9457 problem details with stable codes (catalogue grows per milestone: `LIST_NOT_FOUND`, `ITEM_NOT_FOUND`, `LIMIT_REACHED`, `SHARE_LINK_INVALID`, `VALIDATION_FAILED`).

## Rate limits (SPRING-SEC-21)

| Endpoint | Limit | Where |
|---|---|---|
| Keycloak login/registration/reset | brute-force detection, 5/15 min | Keycloak realm |
| `POST /v1/memberships/join`, `POST /v1/invitations/lookup`, `POST /v1/invitations` | per user/IP buckets (to be fixed in M4) | Bucket4j filter in the app |
| `/oauth2/authorization/*` (creates a session) | per IP | Bucket4j filter in the app (M1) |

## UI building blocks (M1)

- **Responsive shell** (FR-NAV-01): `WindowSize` decides only the drawer mode (modal on compact and medium, permanent 360 px on expanded); everything else is CSS (NG-UI-21). Medium follows FR-NAV-01 (modal drawer) instead of the navigation rail of NG-UI-10; recorded as an assumption in the implementation log.
- **Page heading**: every route carries `data.heading` (translation key); the shell renders it as the page's one h1 in the app bar. Route focus moves to that h1 after a navigation (A11Y-21).
- **Snackbar** (FR-FB-02): one visible `role="status"` region, 10 s minimum, the countdown restarts after hover or focus leaves.
- **Dialogs** (FR-FB-03): `ConfirmDialogs.confirm()` over `MatDialog`; focus starts on the cancel button, Esc cancels, focus returns to the trigger.
- **Form fields** (FR-FB-04): `ValidatedField` is a Signal Forms custom control; errors appear after the field was touched or the form submitted, text starts with „Fehler:“, linked by `aria-describedby`, `focus()` for the first invalid field.
- **Icons**: inline SVG paths in `AppIcon` (no icon font, no `bypassSecurityTrust*`).
