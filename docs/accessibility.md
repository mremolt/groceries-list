# Accessibility

<!-- The product's accessibility record. Rules: ../baseline/10-quality-requirements/accessibility.md (A11Y-*).
     Keep each section current in the same change that alters it (a new screen updates the inventory, A11Y-27). -->

## Legal scope (A11Y-26)

<!-- Decided with legal: does the European Accessibility Act (BFSG in Germany) or public-sector law (BITV 2.0) apply?
     If yes: link to the published accessibility statement, the feedback channel and its response time,
     and confirm that the L4 fixture runs the axe tag EN-301-549. -->

| Question | Answer | Decided by, date |
|---|---|---|
| Accessibility law applies | TBD (legal); the product targets WCAG 2.2 AA regardless (A11Y-01). Internal test release, no public access | open |
| Accessibility statement | not yet; required decision before the public release | |
| Feedback channel and response time | tester guide (M7) names the channel; response time TBD | |

## Conformance notes (A11Y-02, A11Y-04)

<!-- Adopted AAA criteria the product does not meet: which, where, why. Narrow test exclusions with ticket and expiry. -->

| Criterion or rule | Where | Why / ticket | Expires |
|---|---|---|---|
| 1.4.4 / 1.4.12 combined with 320 px | the 200 % text-size run of `e2e/a11y-matrix.spec.ts` starts at 768 x 500 px | NFR-A11Y-06 asks for 320 px and for 200 % text as separate conditions; the run scales the root font size (rem) and cannot change the browser's default size, so on a phone-sized window it tests a stricter, combined case. 320 px width is covered by `stubbed-reflow` (reflow, text spacing, axe) at the default size. Real browser text-size settings are a manual check | open (manual check in the tester guide) |
| 1.4.10 data-entry fields | one-line inputs holding long text (display name at 200 %) scroll inside the field | a single-line field cannot wrap; the share link uses a wrapping textarea instead (M7) | |

## Screen reader support matrix (A11Y-19)

<!-- Default NVDA + Chrome on Windows. A wider matrix needs an ADR; state the mobile assistive technology decision. -->

| Screen reader | Browser | Platform | Reason |
|---|---|---|---|
| NVDA (current) | Chrome (current) | Windows | baseline default |

Mobile assistive technology and real devices: not tested by the unattended run; listed as manual checks in the implementation log (NFR-A11Y-10 is Should).

## Journey and screen inventory (A11Y-27)

<!-- Every main journey with its routes, states and owner. Each entry has a tagged E2E spec (TS-TEST-18). -->

| Journey | Routes | States (dialog open, error, empty, loading, …) | E2E spec tag | Owner |
|---|---|---|---|---|
| Auth pages (Keycloak) | `/realms/groceries/...` | login, register (also with errors), reset request, check-your-mailbox | `@a11y-auth` (real tier, `frontend/e2e/real/auth.spec.ts`) | team |
| App shell | `/`, `/einstellungen` | empty state, modal drawer open (compact, medium), permanent drawer (expanded), ⋮ menu open, snackbar, sign-out error, start-up failure | `@a11y-shell`, `@a11y-matrix` | team |
| Lists | `/listen/:id` | dialogs (new, rename, delete, leave), menu entries, list not found | `@a11y-lists`, `@a11y-matrix` | team |
| Items | `/listen/:id` | list with items, empty, all checked, edit dialog, clear-checked dialog, field error, error snackbar | `@a11y-items`, `@a11y-matrix` | team |
| Sharing | `/j/:token`, `/j/consume`, share dialog | share dialog, renew confirmation, invitation, invalid link (signed in and out), member limit | `@a11y-sharing`, `@a11y-matrix` | team |
| Settings | `/einstellungen` | profile field error, theme choice, delete-account dialogs | `@a11y-settings`, `@a11y-matrix` | team |
| Synchronisation | `/listen/:id` | offline banner (disabled actions), announcements of other members' changes | `@a11y-sync` | team |

### Coverage matrix of the internal test release (M7, Chromium only)

Every screen state of the inventory runs under the checks below. `e2e/a11y-matrix.spec.ts` (tags `@responsive @theme @shell @a11y-matrix`) puts 17 screen states into every Chromium project of the matrix; the existing specs keep their behaviour assertions plus axe in the `@responsive` and `@shell` projects.

| Check | Rule | Test | Projects |
|---|---|---|---|
| axe WCAG 2.2 A/AA + `target-size` + adopted AAA contrast (`color-contrast-enhanced`) | A11Y-03, TS-TEST-12/21 | `expectAccessible` in all specs and the matrix | expanded, compact, medium, 320 px (`reflow`), dark, high contrast, forced colors, nightly large / extra-large / ultrawide / landscape |
| Touch targets >= 48 x 48 px (Material's invisible touch target counts, a field counts as its whole box) | NFR-A11Y-05 | matrix, `smallTargets` | all of the above |
| Tab walk: the focused element is inside the window and not covered by other content | 2.4.11, NFR-A11Y-02 | matrix, `expectFocusNeverObscured` | all of the above |
| Keyboard-only journeys, focus return after dialogs and menus, arrow-key menus | NFR-A11Y-02/04, A11Y-21 | `lists`, `items`, `sharing`, `settings`, `app-shell` specs | expanded, compact, medium, 320 px |
| 320 px reflow, no horizontal scroll, text spacing (WCAG 1.4.12) without clipped text | NFR-A11Y-06, A11Y-13/14 | `expectReflowAndTextSpacing` on start page, list, items, settings, invitation, invalid link (signed in) | `@responsive` projects |
| 200 % text size set before the app starts + text spacing, no overflow or clipped text | NFR-A11Y-06 | matrix, run "… at 200 % text size" for each screen state | from 768 x 500 px up (see conformance notes) |
| Dark theme and high-contrast preference | NFR-A11Y-09 | matrix and `app-shell` `@theme` tests | `stubbed-dark`, `stubbed-high-contrast` |
| Forced colors | NFR-A11Y-09 | matrix and `@shell` tests | `stubbed-forced-colors` |
| `prefers-reduced-motion` | NFR-A11Y-09 | every project runs with `reducedMotion: 'reduce'`; the matrix test proves that opening a dialog starts no running animation over 50 ms | all |
| Status messages are live regions and do not move focus | NFR-A11Y-07 | snackbar, sync and offline specs | `@shell` projects |
| Authentication pages: autofill (`email`, `current-password`, `new-password`, `nickname`), paste not blocked, show-password toggle (`aria-pressed`), no CAPTCHA | NFR-A11Y-08 | Keycloak theme templates (`backend/dev/keycloak/theme/groceries/login/*.ftl`, checked by reading them); axe on the themed pages in the real tier | real tier |

Findings of the M7 audit that were fixed in the product: icon size no longer grows with the root font size (it pushed the edit buttons out of the item card at 200 %); card heads wrap instead of clipping; the permanent drawer takes at most 45 % of the window (it was 720 px at 200 % text); the theme choice is 48 px high, wraps at large text and its check mark keeps its size; floating labels of fields are no longer cut off; the share link is shown in a wrapping text area; the modal drawer has no horizontal scroll at 200 %.

Not verifiable in this environment: NVDA, VoiceOver, TalkBack, Firefox and Safari behaviour, a real browser text-size setting, real devices (NFR-A11Y-10 is Should; listed as manual checks).

## Release checklist results (A11Y-24, L6)

<!-- One row per release and matrix pair; details of findings go into tickets. -->

| Date | Release | Tester | Screen reader + version | Browser + version | Result | Tickets |
|---|---|---|---|---|---|---|
| | | | | | | |
