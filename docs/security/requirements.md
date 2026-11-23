# Security Requirements

Baseline: [security-requirements.md](../baseline/08-crosscutting-concepts/security/security-requirements.md).

## ASVS level

| | Value |
|---|---|
| Target level (ASVS 5.0) | L2 |
| Minimum release gate | L1 |
| ADR for a deviation | none |

## Data classification

| Data | Class | Stored in |
|---|---|---|
| E-mail, display name, Keycloak subject | personal | see [processing-record.md](../data-protection/processing-record.md) |
| List names, item texts, memberships | personal (may contain personal information typed by users) | PostgreSQL `lists`, `items`, `memberships` |
| Share tokens | confidential (bearer secret) | PostgreSQL `lists.share_token` |
| Sessions, access/refresh tokens | confidential | PostgreSQL `spring_session*` (server-side only) |
| Static UI bundle | public | image |

## Unmet requirements

| ASVS requirement | Issue | Owner | Level |
|---|---|---|---|
| V8 data at rest encryption for the session table (SPRING-SEC-37 / SEC-CRY-03) | to decide in M1 (refresh-token encryption) | team | L2 |
| Rate limiting at a gateway | none exists; app-level Bucket4j until then | team | L2 |

## Session lifetimes (SPRING-SEC-32)

| | Value | Reason if not the default |
|---|---|---|
| Idle timeout | 30 days sliding | FR-AUTH-02 AC5 ([ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md)) |
| Absolute lifetime | 30 days | same; never longer than the Keycloak SSO session |

## Session cookie and local installation

Deployed default: `__Host-SESSION`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` (SPRING-SEC-24). `http://localhost` cannot carry a `Secure` or `__Host-` cookie, so the `local` profile and the Compose installation (`compose.app.yaml`) use the plain name `SESSION` without `Secure`; this is a local-only override of `server.servlet.session.cookie.*`. Session attributes (the OIDC user with its ID token) are Java-serialized in `spring_session_attributes` (SPRING-SEC-42 alternative): a framework upgrade may invalidate live sessions and log everybody out. Spring Session JDBC keeps the idle timeout (30 days sliding); the absolute lifetime is enforced by `AbsoluteSessionLifetimeFilter`.

## Dev realm values

`backend/dev/keycloak/groceries-realm.json`, `backend/dev/secrets/keycloak-client-secret` and `backend/dev/secrets/keycloak-admin-client-secret` hold the **dev-realm** client secrets `dev-only-client-secret` and `dev-only-admin-secret` (the latter for the account-deletion service account, role `manage-users` only) and fictitious test users. They are development values for the local Compose installation only, are committed on purpose and must never be used in a deployed environment (SEC-INC-01, DP-ENV-01); deployed secrets come from the platform's secret store as mounted files (SPRING-CFG-07).

## Penetration tests (SEC-REQ-04)

Not before the public release; internal test release only.

## Cyber Resilience Act (SEC-REQ-05)

| | Value |
|---|---|
| CRA applies? | TBD (legal) |
| Reason | not decided; internal test release |
| Decided by, date | open |

## Other compliance

None known. Public-release privacy measures (NFR-PRIV) are deferred ([05 §5](../../requirements/05-implementation-plan.md)).

## Identity provider policy (SEC-CRY-06, ADR 0002/0003)

Configured in the committed dev realm `backend/dev/keycloak/groceries-realm.json`; a deployed IdP must be configured the same way.

| Setting | Value | Source |
|---|---|---|
| Password length | 8 to 128 characters, no composition rules | FR-AUTH-01 AC4, NIST SP 800-63B, ASVS V6 |
| Password hashing | Argon2id (Keycloak `hashAlgorithm(argon2)`) | NFR-SEC-02, SEC-CRY-02 |
| Breached-password check | not configured (FR-AUTH-01 AC5 is *Should*) | open |
| Brute-force protection | 5 failures, temporary lockout (no permanent lockout), 15 minute window and wait | NFR-SEC-06 |
| Reset link | valid 60 minutes, single use; reset ends other sessions | FR-AUTH-04/05 |
| E-mail verification | off (OQ-1, accepted risk) | 04 §7 |
| SSO session | idle and maximum 30 days; access token 5 minutes | FR-AUTH-02 AC5 |

**Dev-realm secrets:** the realm contains the confidential client secret `dev-only-client-secret` and two fictitious users with passwords. These are local development fixtures only (committed on purpose, also in `backend/dev/secrets/keycloak-client-secret`); no deployed environment may use them. A deployed realm gets its own secret from the secret store (SPRING-SEC-38, CFG-05).
