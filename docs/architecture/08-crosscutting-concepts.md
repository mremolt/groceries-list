# 8. Cross-cutting Concepts

Baseline concepts: [../baseline/08-crosscutting-concepts](../baseline/08-crosscutting-concepts/README.md). This chapter records only what is product-specific.

## Business rules

Source of truth: [`requirements/04-detailed-requirements.md` §2.2](../../requirements/04-detailed-requirements.md) (BR-01…BR-12), implemented in `domain` and the use cases (DOC-ARC-10). Open assumptions: [open-questions.md](open-questions.md).

## Authorization (BR-01, NFR-SEC-04)

Use cases authorize on the `Caller` (SPRING-SEC-02); every list/item use case loads the membership first and answers `NotFoundException` for non-members, so "no access" and "does not exist" are identical (SPRING-SEC-36). Cross-user tests per use case (SPRING-SEC-16).

## Authentication and sessions

See [ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md)/[0003](../adr/0003-map-auth-requirements-to-oidc.md). IdP configuration for SEC-CRY-06: password 8–128, no composition rules, brute-force detection, reset link 60 min single use, SSO session 30 days. Planned until M1.

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
