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
| M0 scaffolding (backend + frontend as parallel forks) | 2026-11-23T11:33:00+01:00 | | |

## Assumptions

(see per-milestone entries)

## Milestone entries
