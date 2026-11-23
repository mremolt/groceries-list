# Deletion concept: Groceries list

Rules: [data-protection.md](../baseline/08-crosscutting-concepts/data-protection/data-protection.md) (DP-RET-*), [spring.md](../baseline/08-crosscutting-concepts/data-protection/spring.md).

| | |
|---|---|
| Last reviewed | 2026-11-23 by implementing agent |
| Backup retention | no backups in the internal release (05 §5); public release: ≤ 30 days (NFR-PRIV-03), TBD (DPO) |
| Telemetry retention | logs: stdout only, no persistence in the internal release; no traces/error reports yet |

## Data categories

| Category | Storage locations | Retention | Start event | Statutory retention | Deletion mechanism | Tested by |
|---|---|---|---|---|---|---|
| User account data | `users`, Keycloak user | until account deletion | user deletes account | none | `DeleteAccount` use case: one transaction erases the product's rows, then the Keycloak user is deleted through the admin port; a failed IdP call stays in `pending_idp_deletions` and is retried (`RetryIdpDeletions`, every 5 min) | `DeleteAccountIT` (DP-TEST-01), `AccountApiIT`, `KeycloakAdminAdapterTest` |
| Memberships | `memberships` (`ON DELETE CASCADE` from `users` and `lists`, SPRING-DP-03) | until leave/delete | leave, list delete, account delete | none | cascade + last-member rule BR-04 | `MembershipJdbcAdapterIT`, `ListRulesConcurrencyIT` (M2); `DeleteAccountIT` (account deletion) |
| Lists and items | `lists` (`created_by` set to NULL when the creator's account is deleted, the list stays for its members), `items` (M3, `ON DELETE CASCADE` from `lists`) | until deleted by a member or when the last member leaves | member action | none | `DeleteList`, `LeaveList`, `DeleteAccount` | `ListPersistenceAdapterIT`, `MembershipJdbcAdapterIT`, `ListsApiIT` (M2); `ItemPersistenceAdapterIT.deletingTheListDeletesItsItems` (M3); `DeleteAccount` in M6 |
| Share tokens | `lists.share_token` (nullable until the first link is shown; not personal data, but a secret that grants membership) | replaced on renewal; removed with the list | renewal/list delete | none | with the list | `SharingApiIT` (old token dead after renewal), `ListsApiIT` (list delete) |
| Sessions and tokens | `spring_session`, `spring_session_attributes`, `idp_sessions` (rows of dead sessions purged at every login) | idle 30 days sliding, absolute 30 days | login | none | expiry job; end on logout, back-channel logout, account deletion | M1/M6 ITs |
| Pending join token | server-side session attribute `app.pending-invitation` (a visitor session of 2 hours until the login finished) | until consumed (used once, whatever the outcome) or session end | invitation | none | with the session | `JoinListControllerTest`, `SharingApiIT` |
| Pending IdP deletions | `pending_idp_deletions(idp_subject, recorded_at)`: the pseudonymous IdP subject, only between the erasure of the product's data and the successful deletion at the IdP | until the IdP confirms (a missing user counts as deleted) | account deletion | none | `DeleteAccount` (immediate call) or `RetryIdpDeletions` (scheduled) | `DeleteAccountIT`, `PendingIdpDeletionJdbcAdapterIT` |
| Reset mails | mail server | operator-defined (Mailpit: in-memory) | send | none | mail server retention | n/a |

## Erasure on request (Art. 17)

Self-service `DeleteAccount` (FR-SET-04), confirmed by a re-authentication at the identity provider younger than 5 minutes (ADR 0003) instead of a password field. In one transaction: the person's memberships go, every list where they were the last member is deleted with its items (the list rows are locked first, so two last members deleting at once cannot leave a list without members, ARCH-UC-16), the user row goes, and all sessions of the IdP subject end (`spring_session`, `idp_sessions`). The subject is written to `pending_idp_deletions` in the same transaction; after the commit the Keycloak account is deleted and the row removed. The Keycloak account is deleted by a service account that may manage users only (SPRING-SEC-41). Locations not reached directly: backups (none in the internal release; later expire per retention and the deletion log is re-applied on restore, DP-RET-05); items the user typed in remaining lists stay (FR-SET-04 AC3: free text, no personal data beyond the text); the security audit trail holds pseudonymous user ids only (SEC-AUD-02), retention TBD (DPO).

Tables without personal data: `flyway_schema_history`, `shedlock` (if added).
