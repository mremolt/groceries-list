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
| | | | |

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
| Auth pages (Keycloak) | `/realms/groceries/...` | error, reset sent, expired | `@a11y-auth` | team |
| App shell and lists | `/`, `/listen/:id` | empty, loading, drawer open, menu open, dialogs | `@a11y-lists` | team |
| Items | `/listen/:id` | empty, all checked, edit dialog, error snackbar | `@a11y-items` | team |
| Sharing | `/j/:token`, share dialog | invitation, invalid link | `@a11y-share` | team |
| Settings | `/einstellungen` | delete-account dialog | `@a11y-settings` | team |

## Release checklist results (A11Y-24, L6)

<!-- One row per release and matrix pair; details of findings go into tickets. -->

| Date | Release | Tester | Screen reader + version | Browser + version | Result | Tickets |
|---|---|---|---|---|---|---|
| | | | | | | |
