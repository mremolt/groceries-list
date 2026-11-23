# Implementation log

## Resume

- **Stop point:** none. M0 through M7 unattended (kickoff.md).
- **Milestone status:**

| Milestone | Status | Commit | Tag |
|---|---|---|---|
| M0 design (documents only) | done | f9e82bc | |
| M0 Project setup | in progress | | |
| M1 Accounts and app shell | not started | | |
| M2 Lists | not started | | |
| M3 Items | not started | | |
| M4 Sharing and joining | not started | | |
| M5 Synchronisation | not started | | |
| M6 Settings and account | not started | | |
| M7 Internal test readiness | not started | | |

- **Next action:** M0 scaffolding: backend/ (Spring Boot, `./mvnw verify` green) and frontend/ (Angular, `npm run verify` green) were delegated to two background forks; when both are green, commit "M0 done: project setup", tag `m0-done`, continue with M1.
- **Work in flight:** backend/ and frontend/ scaffolds in progress (uncommitted files under backend/, frontend/, tools/; feedback scratch files .m0-*-feedback.txt and .m0-*-timing.txt to merge into baseline-feedback.md / this log, then delete).
- Initial commit `ce2ac52` (baseline sync and kickoff) done.

## Durations (implementation time per step)

Wall-clock timestamps taken with `date -Is` at step start and end. Durations are elapsed time including tool and build time.

| Step | Start | End | Duration |
|---|---|---|---|
| Session start, read kickoff, baseline rule indexes, requirements | 2026-11-23T11:28:04+01:00 | 2026-11-23T11:29:00+01:00 | ~1 min |
| M0 design documents (arc42, 9 ADRs, security, data protection) | 2026-11-23T11:29:00+01:00 | 2026-11-23T11:31:19+01:00 | ~2 min (commit f9e82bc) |
| M0 scaffolding: backend fork | 2026-11-23T11:32:17+01:00 | 2026-11-23T11:46:12+01:00 | ~14 min (steps in the fork's timing: pom+wrapper 20 s, doc reading+deps 1 min, main code 3 min, tests 4 min, verify 3 min, compose+runtime check 1 min) |
| M0 scaffolding: frontend fork | 2026-11-23T11:32:17+01:00 | 2026-11-23T11:47:29+01:00 | ~15 min (ng new+install 1 min, theme/platform/shell+tests 6 min, lint/arch fixes 3 min, Playwright matrix 3 min) |
| M0 integration (config.json contract, real index.html test, IDE setup, verify of both) | 2026-11-23T11:47:30+01:00 | 2026-11-23T11:51:30+01:00 | ~4 min |

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
