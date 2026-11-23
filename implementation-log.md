# Implementation log

## Resume

- **Stop point:** none. M0 through M7 unattended (kickoff.md).
- **Milestone status:**

| Milestone | Status | Commit | Tag |
|---|---|---|---|
| M0 design (documents only) | done | f9e82bc | |
| M0 Project setup | done | b0ecad1 | m0-done |
| M1 Accounts and app shell | done | 16e1331 | m1-done |
| M2 Lists | done | PENDING | m2-done |
| M3 Items | not started | | |
| M4 Sharing and joining | not started | | |
| M5 Synchronisation | not started | | |
| M6 Settings and account | not started | | |
| M7 Internal test readiness | not started | | |

- **Next action:** M3 Items (BR-06–09, FR-ITEM-*, per 04 by requirement ID): backend + frontend in parallel against a contract fixed up front, then extend the real-backend E2E tier, verify both gates (frontend e2e Chromium projects only, see memory), commit `M3 done`, tag.
- **Work in flight:** none.
- Initial commit `ce2ac52` (baseline sync and kickoff) done.

## Durations (implementation time per step)

Part-level timing (who/what took how long, by category): `implementation-timing.tsv` (appended by `tools/timed.sh` around every gate, build, test and infra command, and by hand for reading/coding parts). Summary: `sh tools/timing-report.sh` (by category, by milestone, 15 largest parts). The table below is the coarse per-step view.

Wall-clock timestamps taken with `date -Is` at step start and end. Durations are elapsed time including tool and build time.

| Step | Start | End | Duration |
|---|---|---|---|
| Session start, read kickoff, baseline rule indexes, requirements | 2026-11-23T11:28:04+01:00 | 2026-11-23T11:29:00+01:00 | ~1 min |
| M0 design documents (arc42, 9 ADRs, security, data protection) | 2026-11-23T11:29:00+01:00 | 2026-11-23T11:31:19+01:00 | ~2 min (commit f9e82bc) |
| M0 scaffolding: backend fork | 2026-11-23T11:32:17+01:00 | 2026-11-23T11:46:12+01:00 | ~14 min (steps in the fork's timing: pom+wrapper 20 s, doc reading+deps 1 min, main code 3 min, tests 4 min, verify 3 min, compose+runtime check 1 min) |
| M0 scaffolding: frontend fork | 2026-11-23T11:32:17+01:00 | 2026-11-23T11:47:29+01:00 | ~15 min (ng new+install 1 min, theme/platform/shell+tests 6 min, lint/arch fixes 3 min, Playwright matrix 3 min) |
| M1 (see below) | 2026-11-23T11:53:00+01:00 | | |
| M0 integration (config.json contract, real index.html test, IDE setup, verify of both) | 2026-11-23T11:47:30+01:00 | 2026-11-23T11:51:30+01:00 | ~4 min |

### M2 Lists (2026-11-23)

| Done when | Status |
|---|---|
| FR-LIST-01..05, FR-NAV-02/03/05/06, BR-01–05, BR-10–12 (lists) | Backend: domain, 6 use cases, JPA/JDBC adapters, V5 migration, REST v1 with member-only 404, concurrency ITs (mutation-checked), cross-user tests. Frontend: lists store, drawer entries with counts, create/rename/delete/leave dialogs, ⋮ menu, deep links, start screen. Gates: `mvnw verify` green; frontend format/lint/typecheck/arch/unused/unit (185) green; stubbed e2e 38 green (Chromium); real tier 18 green (2 new list scenarios incl. BR-01 isolation) |

Deviations: frontend e2e run on Chromium only (`e2e:fast`) by the user's instruction; Firefox/WebKit projects stay in the config and are not run. N+1: drawer counts come from one summary read model query (asserted by StatementCounting). Baseline feedback: F-61..F-71.

Manual check (for human review): create, rename, delete and leave lists on a phone; open a list URL as another account.

## Assumptions

(see per-milestone entries)

## Milestone entries

### M0 Project setup (2026-11-23)

| Done when | Status |
|---|---|
| Pipeline builds, tests and deploys on every change | Replaced by local gates per ADR 0004 (REL-CD-08): `cd backend && ./mvnw verify` green (71 unit, 7 IT with Testcontainers, ArchUnit, SpotBugs, Spotless, Error Prone/NullAway), `cd frontend && E2E_SKIP_WEBKIT=1 npm run verify` green (32 unit/component tests with axe, 35 E2E in Chromium+Firefox). Image build + Compose deployment of the app **not yet exercised** (to do before M1 manual check; backend runs locally against Compose PostgreSQL) |
| Placeholder page uses token colours and switches with system theme | Done: E2E checks light/dark/high-contrast/forced-colors |
| Accessibility scan in the pipeline | Done: axe in component tests and E2E (`target-size` asserted to run), part of `npm run verify` |

Assumptions/deviations: WebKit E2E projects cannot start on this host (Playwright needs libicu74 on Fedora); the explicit switch `E2E_SKIP_WEBKIT=1` was used for the verify. This is an environment gap, not a weakened check; run `sudo npx playwright install-deps` and plain `npm run verify` on a capable host. Medium viewport 768 px (baseline table) instead of 834 px. Backend `allowEmptyShould(true)` on three application-ring ArchUnit rules until the first `@UseCase` (to remove in M1). CSP report endpoint has no rate limit/metric yet (M1).

Manual check (for human review): open the test environment on a phone and a desktop; toggle the system dark mode.

### M1 Accounts and app shell (2026-11-23)

| Done when | Status |
|---|---|
| All AUTH acceptance criteria tested | Tested against the real Keycloak in `npm run e2e:real` (16 scenarios, green twice) and in backend tests. Deviations: AUTH-04 AC3 (a newer reset link does not invalidate older ones; each is single-use and expires in 60 min); AUTH-02 AC4 lockout text reveals that the account exists after the lock (required by the AC); exact 5th-attempt boundary not observable (Keycloak quick-login rule locks after fast repeated failures) |
| Reset e-mails delivered in the test environment | Yes: Mailpit via Keycloak SMTP, asserted in E2E |
| Drawer focus handling with the keyboard | Yes: component + stubbed E2E (open, Esc, backdrop, focus return to menu button) |

Other: the three AUTH screens are Keycloak themed pages (ADR 0003); the invitation page for FR-AUTH-06 comes in M4. Backend: login by OIDC client with ID-token claims only; sessions 30 d idle/absolute (ADR 0002). Image built with Buildpacks and run in Compose with the app and Keycloak (REL-FE-06 positive case proven; start-without-bundle case only by backend test). WebKit E2E still skipped via `E2E_SKIP_WEBKIT=1` on this host.

Assumptions: A-1 (invitation page before the Keycloak redirect, ADR 0003), A-2 (session lifetimes, ADR 0002), ADR 0010 (account row created with unverified e-mail under OQ-1, never linked by e-mail). Medium window uses the modal drawer (FR-NAV-01), not the navigation rail of NG-UI-10. Mockup logo icon on Keycloak pages omitted.

Manual check (for human review): sign up, log out, log in, reset the password; try a wrong password 6 times.

Known issues: no rate-limit metric for `/csp-reports` (OBS-07); `idp_sessions` rows purged only on next login registration; session attributes Java-serialized (SPRING-SEC-42 alternative, documented); POST /logout not in the OpenAPI spec.
