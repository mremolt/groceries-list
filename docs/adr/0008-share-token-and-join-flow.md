# 0008. Share token design and join flow across the OIDC round trip

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** SEC-CRY-05, SPRING-SEC-21, SPRING-SEC-36, TS-SEC-01, NFR-SEC-05, NFR-SEC-09, DP-TEL-02

## Context

Links `/j/{token}`; tokens must be ≥ 128 bits CSPRNG, never in logs, never leak via Referer, survive login/sign-up.

## Decision

- Token: 32 random bytes from `SecureRandom`, base64url (256 bits), unique index, stored as-is in `lists.share_token` (renewal replaces it). It is not derivable from ids.
- `/j/{token}` is an Angular route that calls `POST /v1/memberships/join` with the token in the **request body** (not in the URL of an API call, not logged). Logged-out visitors: the SPA shows the invitation page (ADR 0003), looks up the list name with `POST /v1/invitations/lookup`, and on the button calls `POST /v1/invitations` ("remember this token", body), which stores the token in the **server-side session**, then navigates to `/oauth2/authorization/keycloak` (sign-up variant with `prompt=create`). After login the BFF success handler redirects to `/j/consume` (no token), where the SPA calls `POST /v1/memberships/join` with an empty body and the session token. The token is removed from the session when consumed or on logout. The token never enters browser storage or the Referer (`Referrer-Policy: no-referrer`).
- Access logs: the request-logging config masks `/j/*` paths; no component logs bodies (SPRING-LOG-08).
- Invalid/renewed token → one uniform 404 problem (`code: SHARE_LINK_INVALID`) revealing nothing about the list (FR-SHARE-04 AC2). Join attempts are rate-limited per user and IP.

## Consequences

The token appears once in the browser address bar (unavoidable for a link) and is removed with `history.replaceState` after the join call.

## Implementation note (M4, backend)

- `lists.share_token` is nullable (migration `V7__share_token.sql`): the first `GET /lists/{id}/share-link` creates it with a set-if-absent update, so two members asking at once end with one token and existing rows need no backfill. A check constraint enforces the format, a partial unique index the uniqueness. The column is read and written only by `ShareLinkJdbcAdapter`; it is not mapped by the list entity.
- A malformed token (wrong characters or length, empty, missing) is the same `404 SHARE_LINK_INVALID` as an unknown one, never a 400: the answer carries no information about the shape the server expects.
- `POST /v1/invitations` validates the token before it opens a session. The visitor session lives 2 hours (`PendingInvitation`); the login success handler gives the session its normal idle time back and redirects to the constant `/j/consume`. The sign-up variant is `/oauth2/authorization/keycloak?prompt=create` (the existing `prompt=create` pass-through).
- `POST /v1/memberships/join` takes the token from the body or, with an empty body, from the session; the session token is removed after the attempt whatever its outcome, so a reload cannot retry a stale one.
- Renewal and joining do **not** change `lists.revision`: the revision covers what the list shows (name, items, [ADR 0006](0006-sync-by-polling-with-list-revision.md)), and membership changes are not shown. A joined list reaches the other devices of the new member through the drawer poll (FR-SYNC-03).
- Rate limits: invitation calls per address, join per address and per person (SPRING-SEC-21). Two `RateLimitFilter` instances on one request need distinct `OncePerRequestFilter` markers (`getAlreadyFilteredAttributeName`), otherwise the second is skipped without notice.
- The public link base is `app.sharing.public-base-url` (required, no default).

