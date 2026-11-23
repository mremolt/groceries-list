# 10. Quality Requirements

Quality goals: [chapter 1](01-introduction-and-goals.md). Baseline: [../baseline/10-quality-requirements](../baseline/10-quality-requirements/README.md).

| ID | Scenario | Measure | Verified by |
|---|---|---|---|
| Q1 | A user checks an item | UI updates ≤ 100 ms (optimistic) | component test, E2E |
| Q2 | Member A changes a list | member B sees it ≤ 6 s | two-session E2E (M5) |
| Q3 | Unchanged list poll | 304, one row read | integration test with statement count |
| Q4 | Any screen | no WCAG 2.2 AA violation (axe), keyboard operable | component + E2E axe (L3/L4), `docs/accessibility.md` |
| Q5 | Non-member requests a list | 404, same as unknown id | cross-user tests |
| Q6 | First load, mid-range phone, 4G | LCP ≤ 2.5 s, INP ≤ 200 ms | M7 measurement |

PR-tier wall-clock budget for E2E (TS-TEST-30): to be recorded in M0 once measured.

## Budgets and tiers (recorded at M0)

- Frontend initial bundle budget (NG-TOOL-05): warn 810 kB / error 970 kB raw (measured 737 kB + 10 %); first measurement, to be tightened.
- E2E stubbed tier runs Chromium and Firefox here; WebKit needs host libraries missing on the development machine (`E2E_SKIP_WEBKIT=1`, explicit switch, see implementation log). PR-tier wall clock budget (TS-TEST-30): the M0 e2e run takes ~10 s.

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
