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
