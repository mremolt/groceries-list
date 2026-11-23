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
