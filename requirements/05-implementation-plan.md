# Groceries List App – Implementation Plan (MVP, internal test release)

| | |
|---|---|
| **Status** | Draft – for review |
| **Version** | 0.2 |
| **Date** | 2026-11-23 |
| **Based on** | [04-detailed-requirements.md](04-detailed-requirements.md) v0.3, [mockups/](mockups/README.md) |

---

## 1. Purpose and how to use this plan

This plan sets the **order** in which the MVP is built. Development runs **unattended**: the implementer (normally an AI agent) works through all milestones M0–M7 in one go, **without stopping for review between milestones**. It stops only for a blocker (section 1.2).

### 1.1 Working rules

1. Read [README.md](README.md), [04-detailed-requirements.md](04-detailed-requirements.md) and [mockups/README.md](mockups/README.md) first. The requirements are binding. The mockups show the intended look; take values from `mockups/design-tokens.json`.
2. Work through the milestones in order. Within a milestone, implement only the requirement IDs listed there. If a later milestone's requirement is needed earlier, build only the minimum and note it in the log.
3. A milestone is done when **all** its "Done when" points are met. Then **commit**, update the log (1.3), and **continue directly with the next milestone**.
4. If a requirement is unclear or contradicts the mockups but a reasonable interpretation exists: choose the interpretation that fits the requirements best, **record it in the log as an assumption**, and continue. Don't stop for this.
5. Never weaken a requirement to make progress (e.g. skipping tests, disabling the authorisation checks or accessibility scans). If that seems necessary, it is a blocker.

### 1.2 Blockers – the only reasons to stop

Stop, describe the problem in the log, commit the current working state (on a branch if the build is broken) and report back when:

| Blocker | Example |
|---|---|
| Missing information that cannot be reasonably assumed | The platform team's technical documentation is missing a decision that the code depends on (database, authentication library, deployment target) |
| Contradiction without a sensible interpretation | Two requirements exclude each other and either choice would change the product's behaviour noticeably |
| Environment or access problem | Test environment, repository, package registry or mail catcher not reachable; credentials missing |
| A requirement can't be met | e.g. a performance or accessibility target that is impossible with the given stack, after a serious attempt |
| Security-relevant decision | Anything that would loosen NFR-SEC or BR-01 (authorisation) |

Not blockers: unclear wording, cosmetic differences from the mockups, missing nice-to-haves (*Should*/*Could*). Decide, log, continue.

### 1.3 Commits and implementation log

| Topic | Rule |
|---|---|
| Commit frequency | Commit in small, logical steps (one feature, one fix), **at least once per milestone**. Every commit builds and passes all tests |
| Commit messages | Start with the milestone and requirement IDs, e.g. `M3 FR-ITEM-01: add item with focus retention`. The final commit of a milestone: `M3 done: items` |
| Milestone markers | Tag the final commit of each milestone (`m0-done` … `m7-done`) |
| History | No force-pushes, no rewriting of existing history. Push according to the project's repository conventions |
| Implementation log | Keep `implementation-log.md` in the **project root** (not inside `requirements/`). Per milestone: date, status of each "Done when" point, assumptions made (rule 4), deviations from mockups, items for the later human review (the "Manual check" lines), known issues. A blocker is recorded at the top of the log |
| Requirements folder | Treat `requirements/` as read-only. Questions and assumptions go into the log, not into these documents |

### 1.4 Human review

Humans review **after** the run (or when a blocker is reported), using the log, the tags and the "Manual check" lines of each milestone. Findings come back as new tasks; they don't interrupt the run.

## 2. Technical frame

| Topic | Decision |
|---|---|
| Backend | Spring Boot (REST API) |
| Frontend | Angular (single-page app) |
| Details (versions, libraries, database, build, hosting, coding conventions) | Defined by the platform team's technical documentation. Not part of this plan |
| UI | Material Design 3 as specified in 03 and the design tokens. Whether an existing M3 component library is used is up to the platform team; the result must match the tokens and the accessibility requirements |
| Release target | **Internal test environment only.** No public access (see section 5) |

## 3. Rules for every milestone

| Topic | Rule |
|---|---|
| Tests | Every acceptance criterion of the milestone has at least one automated test (backend: API/integration tests; frontend: component and end-to-end tests) |
| Authorisation | Every new API endpoint checks the session and list membership on the server (BR-01, NFR-SEC-04). Each such endpoint has a test that a non-member gets "not found" |
| Accessibility | Each milestone's screens pass an automated accessibility scan (e.g. axe) without violations, and are checked once with keyboard only |
| Layout | Each new screen is checked at 390 px, 834 px and 1280 px width, in light and dark, against the matching screenshots |
| Texts | UI texts in German, exactly as in 04; kept in a resource file (NFR-L10N-02) |
| Demo data | A seed script creates two test users who share the lists from the mockups („Wocheneinkauf“, „Grillabend Samstag“, „WG-Vorrat“) |

## 4. Milestones

Order: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7, run back to back (M4 and M5 are independent of each other; keep the order for simplicity).

The "Manual check" line of each milestone is **not** done by the implementer. It is copied into the implementation log as a checklist for the human review after the run (1.4).

### M0 – Project setup

**Goal:** an empty but deployable app with the design system in place.

| | |
|---|---|
| Scope | Backend and frontend projects per platform-team conventions; build and test pipeline; automatic deployment to the internal test environment; design tokens (`mockups/design-tokens.json`) as the Angular theme for light and dark incl. "System" mode; Roboto font; accessibility scan in the pipeline; German resource file; `lang="de"` |
| Requirements | NFR-COMP-01/02, NFR-A11Y-01, NFR-A11Y-09 (basis), NFR-L10N-01/02, NFR-SEC-01 |
| Done when | Pipeline builds, tests and deploys on every change · a placeholder page uses the token colours and switches with the system theme · accessibility scan runs in the pipeline |
| Manual check | Open the test environment on a phone and a desktop; toggle the system dark mode |

### M1 – Accounts and app shell

**Goal:** users can sign up, log in, reset their password, and see the empty app frame.

| | |
|---|---|
| Scope | User entity; sign-up, login, logout, password reset (request + set new password); sessions; rate limits; app shell with top app bar and navigation drawer (permanent on Expanded, modal on Compact/Medium), still without lists; empty state „Noch keine Listen“ (button can be inactive until M2); form validation pattern; snackbar and dialog base components |
| Requirements | FR-AUTH-01–05, FR-NAV-01, FR-NAV-04, FR-FB-02 (component), FR-FB-03 (component), FR-FB-04, NFR-SEC-02/03/06/07, NFR-A11Y-08 |
| Mockups | `Auth-*`, `M3Auth`, `Leer-Listen-hell`, `Leer-Listen-Desktop-hell` |
| Done when | All AUTH acceptance criteria are tested · reset emails are delivered in the test environment (a test mail catcher is fine) · drawer focus handling works with the keyboard |
| Manual check | Sign up, log out, log in, reset the password; try a wrong password 6 times |

### M2 – Lists

**Goal:** users can manage their own lists.

| | |
|---|---|
| Scope | List and membership entities; create, rename, delete, leave (incl. "last member → delete"); lists in the drawer in the order of BR-10, with open counts (0 until M3); start screen opens the last used list; ⋮ menu; deep links; confirmation dialogs |
| Requirements | BR-01–05, BR-10–12 (lists), FR-LIST-01–05, FR-NAV-02, FR-NAV-03, FR-NAV-05, FR-NAV-06, FR-FB-01 AC1, FR-FB-03 |
| Mockups | `Dlg-NeueListe-dunkel`, `Dlg-Umbenennen-dunkel`, `M3-Mobil-Menue-dunkel`, `M3-Mobil-Dialog-dunkel`, `M3-Mobil-Navigation-hell` |
| Done when | All LIST and NAV acceptance criteria are tested · a non-member cannot read or change a list via the API (tested) · the menu works with arrow keys |
| Manual check | Create three lists, rename one, delete one, reload the page on a list URL |

### M3 – Items

**Goal:** the core of the app – a list you can shop with.

| | |
|---|---|
| Scope | Item entity; add (focus stays in the field), check/uncheck with optimistic update and rollback, edit and delete (dialog), clear checked items, progress and badges, „Im Wagen“ card (collapsible on Compact), empty states, error snackbar |
| Requirements | BR-09, BR-11, BR-12 (items), FR-ITEM-01–06, FR-FB-01 AC2/AC3, FR-FB-05, NFR-PERF-02, NFR-USE-01/02 |
| Mockups | `M3`, `M3-Mobil-hell`, `M3-Tablet-*`, `M3-Desktop-dunkel`, `Dlg-Artikel-hell`, `Leer-Liste-dunkel` |
| Done when | All ITEM acceptance criteria are tested · the main screen matches the screenshots at all three widths in both themes · checking an item with the keyboard moves focus as in FR-ITEM-02 AC3 |
| Manual check | Do a real "shopping trip" on a phone with the demo list |

### M4 – Sharing and joining

**Goal:** two people can work on the same list.

| | |
|---|---|
| Scope | Share token per list; share dialog incl. copy (and Web Share where available); renew link; join route `/j/‹token›` for logged-in users; login/sign-up with invitation banner for logged-out visitors, joining after login; invalid-link page |
| Requirements | BR-06–08, FR-SHARE-01–04, FR-AUTH-06, NFR-SEC-05, NFR-SEC-08/09 |
| Mockups | `Dlg-Teilen-hell`, `Dlg-Teilen-Desktop-dunkel`, `Auth-Registrieren-hell`, `Snack-Beigetreten-dunkel` |
| Done when | All SHARE acceptance criteria are tested, including "old link after renewal is rejected" and "already a member" · tokens never appear in logs |
| Manual check | User A shares a list; user B (new) signs up through the link and lands in the list; A renews the link; the old link shows the invalid-link page |

### M5 – Synchronisation

**Goal:** changes by one member appear for the others without reloading.

| | |
|---|---|
| Scope | Change polling every 5 s while visible, immediate refresh on focus/visibility, pause when hidden; efficient "changes since" API; conflict rules; handling deleted items/lists; drawer counts; screen-reader announcements; no-connection banner |
| Requirements | FR-SYNC-01–05, FR-FB-06, NFR-PERF-03/04, NFR-A11Y-07 |
| Done when | All SYNC acceptance criteria are tested (end-to-end test with two browser sessions) · polling does not reset focus, typed text, open dialogs or scroll position · an unchanged list's poll response is small |
| Manual check | Two devices side by side: add, check, rename, delete; switch the network off and on |

### M6 – Settings and account

**Goal:** users can manage their profile, theme and account.

| | |
|---|---|
| Scope | Settings page (drawer entry, ⋮ menu); display name; theme System/Hell/Dunkel stored per device; email shown; log out; delete account with password confirmation incl. deleting lists where the user was the last member |
| Requirements | FR-SET-01–04, FR-NAV-02 AC2 (settings entry) |
| Mockups | `Settings-hell`, `Settings-Desktop-dunkel`, `Dlg-Konto-hell` |
| Done when | All SET acceptance criteria in scope are tested · after account deletion the user's sessions are invalid and shared lists still work for the remaining members |
| Manual check | Switch the theme on a phone and compare with the system setting; delete a test account that shares a list |

### M7 – Internal test readiness

**Goal:** the app is solid enough for internal testers. Reduced scope: no public launch (see section 5).

| | |
|---|---|
| Scope | Performance check against NFR-PERF-01 on a mid-range phone; complete accessibility check of all screens: automated scan, keyboard-only walkthrough, 200 % text size, 320 px width, forced-colors mode, one screen-reader pass (NFR-A11Y-10, *Should*); fix findings; seed data and a short tester guide (how to log in, what to try, where to report bugs) |
| Requirements | NFR-PERF-01, NFR-A11Y-02–10, NFR-COMP-01–03 |
| Done when | No open accessibility violations of level A/AA · Core Web Vitals within target on the test device · tester guide available |

## 5. Not required for the internal test release

The internal test release has **no public access**. The following requirements in 04 are therefore deferred to a later public release. They stay in 04 as the target for that release.

| Deferred | Why it is not needed now |
|---|---|
| NFR-PRIV-01–06 (privacy / GDPR measures) | Only internal testers with test data |
| FR-SET-04 AC4 (deletion from backups) | No backups (see below) |
| FR-SET-05 (data access note, Impressum/Datenschutz links) and the corresponding links in FR-AUTH-01 AC7 | No public users; legal texts follow with the public release (OQ-5) |
| NFR-OPS-01–04 (availability target, backups, email domain setup, monitoring) | Test environment; data may be lost; a test mail catcher is enough |

All other requirements, **including security (NFR-SEC)**, still apply. Testers use real passwords, and the release is the base for the public version.

## 6. Change Log

| Version | Changes |
|---|---|
| 0.1 | First version |
| 0.2 | Unattended development: no stops between milestones, only for blockers (1.2); commit and log rules (1.3); human review after the run (1.4) |
