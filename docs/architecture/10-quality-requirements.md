# 10. Quality Requirements

Quality goals: [chapter 1](01-introduction-and-goals.md). Baseline: [../baseline/10-quality-requirements](../baseline/10-quality-requirements/README.md).

| ID | Scenario | Measure | Verified by |
|---|---|---|---|
| Q1 | A user checks an item | UI updates ≤ 100 ms (optimistic) | component test, E2E |
| Q2 | Member A changes a list | member B sees it ≤ 6 s | two-session E2E (M5) |
| Q3 | Unchanged list poll | 304, one row read | integration test with statement count |
| Q4 | Any screen | no WCAG 2.2 AA violation (axe), keyboard operable | component + E2E axe (L3/L4), `docs/accessibility.md` |
| Q5 | Non-member requests a list | 404, same as unknown id | cross-user tests |
| Q6 | First load, mid-range phone, 4G | LCP ≤ 2.5 s, INP ≤ 200 ms | M7 measurement (below); not met on LCP in the emulation, see result |

PR-tier wall-clock budget for E2E (TS-TEST-30): to be recorded in M0 once measured.

## Budgets and tiers (recorded at M0)

- Frontend initial bundle budget (NG-TOOL-05): warn 810 kB / error 970 kB raw (measured 737 kB + 10 %); first measurement, to be tightened.
- E2E stubbed tier runs Chromium and Firefox here; WebKit needs host libraries missing on the development machine (`E2E_SKIP_WEBKIT=1`, explicit switch, see implementation log). PR-tier wall clock budget (TS-TEST-30): the M0 e2e run takes ~10 s.

## E2E page objects (TS-TEST-42)

Locators and flows that two places use live in page and component objects under `frontend/e2e/pages/` (`ShellPage`, `ListsPage`, `ItemsPage`, `SharingPage`, `SettingsPage`, `JoinPage`, `AuthPage`; dialogs are `Dialog` / `ConfirmDialog` objects scoped to their dialog). Both tiers get them as Playwright fixtures (`pages/fixtures.ts`, `real/fixtures.ts`); a second browser profile in a real-tier test gets them through `pagesOf(page)` (`newDevice` returns them). Locators are lazy getters in the role-plus-name form (TS-TEST-11), actions are intent level (`lists.rename(name)`), and the objects hold no `expect`: assertions stay in the specs. A one-off locator stays inline until its second use.

## Real-backend E2E tier (M1)

`cd frontend && npm run e2e:real` (Playwright project `real`, Chromium, tag `@real`, one worker) runs against the Compose stack of chapter 7 and never starts it; a missing stack fails with the start command (REPO-CI-04, SPRING-DEV-10, TS-TEST-10). `npm run verify:full` = `verify` + `e2e:real`. Every scenario creates its own person with a unique e-mail address (TS-TEST-34) and reads reset mails from Mailpit's HTTP API (no fixed waits, TS-TEST-15). 16 scenarios, about 15 s per run:

| Area | Scenarios |
|---|---|
| FR-AUTH-01 | sign-up lands in the shell and `GET /api/v1/me` returns the display name; duplicate e-mail message with login link; 7 characters rejected, 8 accepted |
| FR-AUTH-02 | login; wrong password and unknown e-mail give the same message; repeated failures lock with the lockout text, the correct password is refused while locked; session survives a reload, cookie HttpOnly, SameSite=Lax, 30 days |
| FR-AUTH-03 | logout ends the BFF session and the Keycloak session |
| FR-AUTH-04/05 | reset request answer is identical for unknown accounts and sends no mail; mail, new password, logged in, old link expired; setting a new password ends the person's sessions on two other devices (back-channel logout) |
| NFR-SEC / NG-SEC-12 | anonymous API call 401 problem+json; `POST /logout` without XSRF header 403; pre-login session id rejected after login; nonce CSP matches the script nonces, differs per request, other headers; unknown asset 404 |
| A11Y-03 | axe (WCAG 2.2 AA, `target-size` proven to run) on the signed-in shell and on the themed Keycloak login, register (also with errors), reset request and check-your-mailbox pages |
| NFR-SEC-09, DP-TEL-01 | after the run the application log (`test-results/app.log`) contains no recorded password, client secret or session id, no e-mail address and no share-link token |

## M7 audit: performance, compression, compatibility

### NFR-PERF-01 measured (emulation, not a phone)

Method: the production build in the Compose stack (chapter 7), a signed-in person with a list of 120 items (40 checked, created through the API), Chromium mobile emulation (412 x 915, device scale 2.625, touch), cold cache, CDP throttling of the CPU (4x slowdown, as Lighthouse's mobile preset) and of the network. FCP, LCP, layout shifts, long tasks and event timings come from `PerformanceObserver` in the page; INP is the longest event duration of 19 interactions (check, add with Enter, open menu, open edit dialog) under the same throttling. 5 runs per cell, medians. The scripts are not part of the repository (measurement aid, run once).

| Profile | Build | Transferred | FCP | LCP | CLS | TBT | INP |
|---|---|---|---|---|---|---|---|
| 4G (9 Mbit/s, 170 ms RTT), 4x CPU | before: no compression | 1402 kB, 30 requests | 2.9 s | 3.5 s | 0.005 | 78 ms | 72 ms |
| 4G (9 Mbit/s, 170 ms RTT), 4x CPU | with compression (this change) | 458 kB, 30 requests | 2.1 s | **2.66 s** | 0.005 | 75 ms | 64 ms |
| Slow 4G (1.6 Mbit/s, 150 ms RTT), 4x CPU | before: no compression | 1401 kB | 8.1 s | 8.7 s | 0.005 | 85 ms | 64 ms |
| Slow 4G (1.6 Mbit/s, 150 ms RTT), 4x CPU | with compression | 459 kB | 3.4 s | 4.1 s | 0.005 | 72 ms | 64 ms |

Result: INP (about 65 ms) and CLS are far inside the targets. **LCP misses the 2.5 s target by 0.16 s on the 4G profile** (the LCP element is an item text). Limits: no real mid-range phone and no real mobile network were used; emulated throttling is a model; the measurement is a single page (the list with 120 items); Lighthouse was not used because the app needs a session. The Compose stack serves over plain HTTP from localhost (no TLS handshake, no CDN): a deployed environment adds a TLS round trip and may add a CDN and HTTP/2 or 3, so real numbers will differ.

What the waterfall shows: about eight serial round trips of ~175 ms: `main.js` (234 kB compressed) → `config.json` (deliberately `no-store`, NG-CFG-02) → a chain of lazy route chunks (shell routes, session, app shell, list page) → `GET /me` → `GET /lists` → `GET /lists/{id}` → `GET …/items`. Leads for the team (not done, each is an architecture decision): (1) the shell route and the session guard are lazy; an eager shell route would remove about three round trips (~0.5 s) but adds ~250 kB raw to the initial bundle, which is above the 970 kB error budget (NG-TOOL-05); (2) zod is 521 of 937 kB of the main bundle: the classic API with the generated orval schemas pulls every locale, `compile` and JSON-schema code through the esbuild builder; zod mini or a trimmed import path would cut roughly 100 kB gzip; (3) `GET /me`, the lists and the items could start in parallel after `config.json` instead of one after the other.

### Compression (changed in M7)

The container compressed nothing: the 937 kB main bundle crossed the wire in full. `server.compression` now covers the static assets only (`text/javascript`, `application/javascript`, `text/css`, `image/svg+xml`, from 1 KB). HTML (carries the CSP nonce) and JSON (account data) stay uncompressed to stay out of BREACH range. Proven by `StaticAssetCompressionIT` (real server, three cases). Transfer of the page above fell from 1402 kB to 458 kB. A reverse proxy in front of a deployed environment may take this over; the baseline has no rule on it (feedback).

### Bundle budget

Initial bundle 951 kB raw, 203 kB estimated transfer: still above the 810 kB warning (error at 970 kB). Not weakened; see the zod lead above.

### NFR-COMP-01..03 (what can be shown here)

Verified in Chromium projects only (by instruction; Firefox and WebKit projects stay in `playwright.config.ts` and are not run): widths 320 px (`stubbed-reflow`), 390 px compact, 768 px medium, 1024 px expanded, 1440 px, 1920 px, 2560 px (`nightly-ultrawide`, added in M7) and a landscape phone 844 x 390 (`nightly-compact-landscape`); the accessibility matrix (`e2e/a11y-matrix.spec.ts`) passes in all of them. Not verified here: Firefox, Safari, Edge, Safari on iOS/iPadOS, Chrome on Android, previous major versions, a real browser or system text-size setting (NFR-COMP-03). These stay manual checks for the tester guide.
