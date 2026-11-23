# 10. Create an account row from an unverified e-mail address; never link by e-mail

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** SPRING-SEC-44, OQ-1 (04-detailed-requirements §7), ARCH-SC-08

## Context

SPRING-SEC-44 links a product account to an IdP subject only on `email_verified: true`. OQ-1 of the requirements decides that users do not confirm their e-mail address after sign-up (accepted risk), so Keycloak reports `email_verified: false` for every new account and the realm keeps verification off.

## Decision

1. The product row is **created** at the first login from the claims of the verified ID token even when `email_verified` is false (OQ-1). The row is identified by the IdP **subject** (`users.idp_subject`, unique).
2. An existing row is **never linked by e-mail**: a login with an unknown subject whose e-mail address belongs to another row is refused with `ACCOUNT_CONFLICT` (409 / failed login). The unique constraint `users_email_key` backs this up atomically and is mapped by constraint name (SPRING-DB-18).
3. Because the e-mail address is not verified, it is not an identity: nothing in the product grants access by e-mail (no e-mail invitations, no e-mail based lookups).

## Consequences

The accepted OQ-1 risk (someone registers another person's address and that person can take the account over via reset) stays; it cannot lead to a product account being merged or taken over, only to a refused login for the later, real owner of the address until the IdP user is removed. Public release must revisit this with e-mail verification (R6 in chapter 11).

**Revisit when:** e-mail verification is switched on in the realm.

## Implementation note (M6)

The product's `display_name` is the source of truth after the first login: `User.loggedIn` no longer takes the name from the IdP claim, so `PATCH /api/v1/me` (FR-SET-01) survives the next login. Keycloak's own copy of the name is not updated (it keeps the value from sign-up); the admin client has no profile write access. On account deletion the product row is removed first, then the Keycloak user; a failed IdP call is kept in `pending_idp_deletions` and retried. The decision above is unchanged: a deleted account that signs up again with the same address gets a new, empty account (new subject), never the old data.

