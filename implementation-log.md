# Implementation log

## Resume

- **Stop point:** none. M0 through M7 unattended (kickoff.md).
- **Milestone status:**

| Milestone | Status | Commit | Tag |
|---|---|---|---|
| M0 design (documents only) | done | f9e82bc | |
| M0 Project setup | done | b0ecad1 | m0-done |
| M1 Accounts and app shell | done | 16e1331 | m1-done |
| M2 Lists | done | 0eba963 | m2-done |
| M3 Items | done | 9a65f1a | m3-done |
| M4 Sharing and joining | done | 90fc5a7 | m4-done |
| M5 Synchronisation | done | ae98bc7 | m5-done |
| M6 Settings and account | done | da1d286 | m6-done |
| M7 Internal test readiness | not started | | |

- **Next action:** M7 Internal test readiness (read requirements/05 M7 and 04 §4 NFRs; deferred NFR-PRIV are out of scope per 05 §5): close known issues from the milestone entries, run `verify` + real tier + full gates, check docs/architecture against code (DOC-ARC-11), write the final log entry, commit `M7 done`, tag.
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

### M3 Items (2026-11-23)

| Done when | Status |
|---|---|
| All ITEM acceptance criteria tested | FR-ITEM-01..06 (AC2 of 06, remembering the „Im Wagen“ state per device, is a Should and not implemented). Backend: 5 use cases, V6, cross-user ITs, concurrency IT for the 500 limit (mutation-checked). Frontend: items store with optimistic check and rollback, add card, edit/clear dialogs, focus rules. Gates: `mvnw verify` green; frontend unit (272) green; stubbed Chromium e2e 61 green (7 projects incl. compact/medium/dark/high-contrast/forced-colors run by the fork); real tier 21 green |
| Main screen matches screenshots at three widths, both themes | Checked by layout e2e per width/theme, not by pixel comparison; no visual diff against the mockups was done |
| Keyboard focus after checking (FR-ITEM-02 AC3) | Tested |

Deviations: `expectReflowAndTextSpacing` now treats vertical overflow as clipping only for `overflow: hidden/clip` (scrolling shell areas on tall lists), for review. A second Enter while an add is in flight is ignored and the text stays in the field (no queue). One load-related flake seen once in `items.spec.ts` drawer-count test (6/6 alone, 2 full runs green afterwards). Initial-bundle budget warning (951 kB vs 810 kB) predates M3. N+1: items read is one statement (LIMIT 500), drawer count is a sub-select in the one summary statement.

Manual check (for human review): a real shopping trip on a phone with the demo list.

### M4 Sharing and joining (2026-11-23)

| Done when | Status |
|---|---|
| FR-SHARE-01..04, FR-AUTH-06, BR-06..08, BR-12 members | Backend: V7 share_token, 4 use cases, public lookup/remember endpoints with Bucket4j limits, join with 50-member lock (mutation-checked), pending token in the server session, redirect to /j/consume. Frontend: share dialog, renew, Web Share where available, join and invitation pages, invalid-link page. Gates: `mvnw verify` green (244 unit, 67 IT); frontend unit 343 green; stubbed Chromium e2e 77 green (twice); real tier 28 green (incl. sharing scenarios and the visitor-cookie check HttpOnly/SameSite=Lax) |

Deviations: the anonymous visitor session created by `POST /api/v1/invitations` is a deliberate exception to "no session for anonymous calls" (threat model T8, 2 h lifetime). A MockMvc assertion on that cookie was replaced by a real-tier check (`e2e/real/invitation-session.spec.ts`). The sign-up variant uses `?prompt=create`. The invitation page shows the list name in plain text (not bold as in the mockup). Frontend fork changed three M3 e2e tests (`.check()`/`.uncheck()` to `.click()` + assertions) because they were unstable under parallel projects. Initial-bundle warning (952 kB) predates M3.

Manual check (for human review): share a link by messenger, join with a second account (new and existing), renew the link and open the old one.

### M5 Synchronisation (2026-11-23)

| Done when | Status |
|---|---|
| FR-SYNC-01..05, FR-FB-06, NFR-PERF-03/04, NFR-A11Y-07 | Backend: ETag "<revision>" + If-None-Match -> 304 on GET items (statement count proves no items read, mutation-checked), 404 after leave/delete, concurrent adds kept. Frontend: 5 s item poll with etag, 30 s drawer poll, focus/visibility handling, batched polite announcements, list-removed handling, offline banner with disabled actions, backoff, no leaks. Gates: `mvnw verify` green; frontend unit 414 green; stubbed Chromium e2e 87 green (twice); real tier 32 green (two browser contexts, 6 s propagation, offline via setOffline) |

Deviations: offline banner is visible text in the app-bar header announced once through the Announcer (not a second `role="status"` region, which broke 32 locators; A11Y-20). Under `page.clock` the new e2e specs use `focus()` instead of `click()` in the 320 px project (Playwright hang). Stubbed offline test aborts stub routes (setOffline does not affect routed stubs); the real tier uses setOffline. Membership changes (join/leave) and share-link changes do not move the list revision; the 30 s drawer poll covers them.

Manual check (for human review): two devices side by side: add, check, rename, delete; network off and on.

### M6 Settings and account (2026-11-23)

| Done when | Status |
|---|---|
| FR-SET-01..04, FR-NAV-02 AC2 | Backend: PATCH /me (product is the source of truth for the display name), DELETE /me with re-authentication (<= 5 min, `?reauth=1` -> prompt=login/max_age=0, redirect to /einstellungen?konto-loeschen), one-transaction deletion with row locks (race IT, mutation-checked), sessions ended, Keycloak admin port (service account manage-users only, timeouts) with outbox `pending_idp_deletions` retried every 5 min (V8). Frontend: Profil/Darstellung/Konto cards, delete dialogs with re-authentication, per-device theme. Gates: `mvnw verify` green (288 unit, 86 IT); frontend unit 464 green; stubbed Chromium e2e 99 green (twice); real tier 36 green (incl. deletion: other session ends, guest keeps the shared list, login fails afterwards) |

Deviations: FR-SET-04 AC1 password field replaced by re-authentication at the IdP (ADR 0003); two dialogs, the final one adds „Du hast dich gerade noch einmal angemeldet.“; the wrong-password text comes from Keycloak. `REAUTH_REQUIRED` (stale login) is covered in backend tests and the stubbed tier only. A deletion whose Keycloak call fails still answers 204 (data erased, IdP deletion retried). The Keycloak dev realm must be re-imported (`docker compose down -v`) to get the `groceries-admin` service account. The backend fork once ran `git stash`/`pop`; no loss (verified by green gates).

Manual check (for human review): switch the theme on a phone and compare with the system setting; delete a test account that shares a list.

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
