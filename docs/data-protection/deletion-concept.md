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
| User account data | `users`, Keycloak user | until account deletion | user deletes account | none | `DeleteAccount` use case, then Keycloak admin API | `DeleteAccountIT` (M6, DP-TEST-01) |
| Memberships | `memberships` (`ON DELETE CASCADE` from `users` and `lists`, SPRING-DP-03) | until leave/delete | leave, list delete, account delete | none | cascade + last-member rule BR-04 | M2/M6 ITs |
| Lists and items | `lists`, `items` (cascade) | until deleted by a member or when the last member leaves | member action | none | `DeleteList`, `LeaveList`, `DeleteAccount` | M2/M6 ITs |
| Share tokens | `lists.share_token` | replaced on renewal; removed with the list | renewal/list delete | none | with the list | M4 IT |
| Sessions and tokens | `spring_session`, `spring_session_attributes`, `idp_sessions` | idle 30 days sliding, absolute 30 days | login | none | expiry job; end on logout, back-channel logout, account deletion | M1/M6 ITs |
| Pending join token | server-side session attribute | until consumed or session end | invitation | none | with the session | M4 test |
| Reset mails | mail server | operator-defined (Mailpit: in-memory) | send | none | mail server retention | n/a |

## Erasure on request (Art. 17)

Self-service `DeleteAccount` (FR-SET-04). Locations not reached directly: backups (none in the internal release; later expire per retention and the deletion log is re-applied on restore, DP-RET-05); items the user typed in remaining lists stay (FR-SET-04 AC3: free text, no personal data beyond the text); the security audit trail holds pseudonymous user ids only (SEC-AUD-02), retention TBD (DPO).

Tables without personal data: `flyway_schema_history`, `shedlock` (if added).
