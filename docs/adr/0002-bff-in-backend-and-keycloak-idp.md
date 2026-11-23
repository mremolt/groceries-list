# 0002. BFF as additional filter chain in the backend; Keycloak as identity provider

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** SPRING-SEC-03, SPRING-SEC-08, SPRING-SEC-09, SPRING-SEC-24/25/32/33/37/38/40, NG-SEC-07/08

## Context

Browsers are the only clients. Sign-up, login, password reset and brute-force protection are required (FR-AUTH-01..05, NFR-SEC-02/03/06). The baseline forbids a second password store when an IdP can serve (SEC-CRY-02, SPRING-SEC-03/41) and requires browser apps to authenticate through a BFF (SPRING-SEC-08). SPRING-SEC-09 lets the project choose between a separate `backend-bff/` component and an additional filter chain.

## Decision

1. The BFF is an additional filter chain inside the one backend (`spring-boot-starter-security-oauth2-client`, session cookie, CSRF `csrf.spa()`). There is one deployable. No machine client exists, so no resource-server chain is added yet (SPRING-SEC-03 allows this without a deviation ADR).
2. The identity provider is **Keycloak** in every environment (no organisation IdP is known). Locally it runs in Compose with a committed realm template (SPRING-DEV-11/12). Realm settings carry the password policy (min. 8, max. 128, no composition rules, breached-password check via Keycloak policy where available), brute-force detection, self-registration, "forgot password" (60 min, single use), and the German login theme with the design tokens.
3. Sessions: Spring Session JDBC on the product's PostgreSQL (SPRING-SEC-37). Idle timeout 30 days sliding and absolute lifetime 30 days as required by FR-AUTH-02 AC5. This **deviates from the SPRING-SEC-32 defaults (30 min idle, 12 h absolute)** because the product requirement explicitly sets 30 days sliding. The reason is recorded in `docs/security/requirements.md`; the session never outlives the Keycloak SSO session, which is configured to the same 30 days. Session cookie `__Host-` prefixed where the profile allows, `HttpOnly; Secure; SameSite=Lax`.
4. The BFF is a confidential client with PKCE; `client_secret` read from a mounted file (SPRING-SEC-38). Logout ends the BFF session and the Keycloak session (SPRING-SEC-33); back-channel logout via `idp_sessions` (SPRING-SEC-40).
5. The product keeps its own `users` row (id, IdP subject, e-mail, display name, timestamps), created on first login from verified claims (SPRING-SEC-44). No password column.

## Consequences

Own sign-up/reset/login screens of the mockups cannot be built as Angular forms; they are Keycloak themed pages (ADR 0003). Acceptance criteria for AUTH are tested against the real Keycloak in the real-backend E2E tier. A 30-day session needs the refresh path to work; failed refresh ends the session.

**Revisit when:** a non-browser client appears (add the resource-server chain), or the team wants a shorter session.
