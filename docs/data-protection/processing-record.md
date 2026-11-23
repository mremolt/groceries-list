# Personal-data inventory and record of processing: Groceries list

Rules: [data-protection.md](../baseline/08-crosscutting-concepts/data-protection/data-protection.md). Public-release GDPR measures (NFR-PRIV) are deferred ([05 §5](../../requirements/05-implementation-plan.md)); this inventory is still kept current (DP-INV-03).

| | |
|---|---|
| Controller | TBD (DPO) |
| Our role | controller (TBD, DPO) |
| DPO contact | TBD (DPO) |
| Security measures (Art. 32) | [docs/security/requirements.md](../security/requirements.md) |
| Last reviewed | 2026-11-23 by implementing agent (internal test release, fictitious data only, DP-ENV-01) |

## Processing activities

### Account and list management

| Field | Value |
|---|---|
| Purpose | Provide shared grocery lists to registered users |
| Legal basis | TBD (DPO) (contract performance, Art. 6(1)(b), proposed) |
| Data subjects | users (testers) |
| Personal data | e-mail address, display name, IdP subject id, created/last-login timestamps; list names, item texts and memberships (free text typed by users) |
| Fields and where stored | PostgreSQL `users(id, idp_subject, email, display_name, created_at, last_login_at)`, `memberships(user_id, list_id, joined_at)`, `lists(id, name, created_by, created_at, updated_at, revision)` (`created_by` is informational and cleared with the account, `ON DELETE SET NULL`), `items(text)` (M3); Keycloak: credentials, e-mail, name, sessions; Spring Session tables: session attributes incl. tokens; Mailpit/mail server: reset mails (e-mail address) |
| Recipients | operator; Keycloak (processor-internal component); mail server for reset mails |
| Transfers outside EU/EEA | none planned (local installation) |
| Retention | [deletion-concept.md](deletion-concept.md) |
| Data subject rights covered by | `DeleteAccount` use case (M6); copy of data handled manually by support (N3, deferred) |
| DPIA needed? | no (small, low-risk lists); TBD (DPO) |

## Processors and external services (DP-PROC-01)

| Service | Data sent | Purpose | DPA status | Location | Transfer basis | Fallback |
|---|---|---|---|---|---|---|
| Keycloak (self-hosted) | e-mail, name, credentials | authentication | n/a (self-hosted) | same host | n/a | none |
| SMTP server (Mailpit locally; operator's provider later) | recipient e-mail, reset link | password reset mail | TBD (DPO) before public release | local | n/a | none |
