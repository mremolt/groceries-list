# Groceries List

A shared shopping list for households, flatmates and friends. Everyone who shares a list sees the same up-to-date list, adds what is missing and ticks items off in the store, so nothing is forgotten or bought twice. Simplicity over features: adding or checking an item takes seconds, also one-handed on a phone in the supermarket aisle.

The UI is German only. It runs on screens from 320 px up to desktop, in light and dark, and can be operated with keyboard and screen reader (WCAG 2.2 AA is asserted by tests).

**Status:** internal test release (milestones M0 to M7 are done, see [implementation-log.md](implementation-log.md)). There is no public access yet; the public-release items are listed in [requirements/05-implementation-plan.md](requirements/05-implementation-plan.md) §5.

## Features

- **Accounts:** sign-up, login, logout and password reset through an identity provider (Keycloak); the app itself stores no passwords.
- **Lists:** create, rename, leave and delete lists; the last member leaving deletes the list. Deep links, start screen opens the last used list.
- **Items:** add (the field keeps focus), check and uncheck with optimistic update and rollback, edit, delete, clear checked items, progress and "Im Wagen" section.
- **Sharing:** one share link per list; anyone with the link and an account can join; renewing the link invalidates the old one.
- **Synchronisation:** changes of other members appear within about 6 seconds (polling with ETag/304 per list revision), polite screen-reader announcements, offline banner.
- **Settings:** display name, theme per device (system, light, dark), account deletion with re-authentication.

## Try it (demo mode)

Prerequisites: Docker. For the first build also Node.js 24 and Java 25.

```sh
tools/start-demo.sh
```

The script builds the application image once, starts PostgreSQL, Keycloak, Mailpit and the app in Docker Compose with a **fresh database**, and creates demo data: two fictitious people sharing the lists „Wocheneinkauf“, „Grillabend Samstag“ and „WG-Vorrat“.

| | |
|---|---|
| App | http://localhost:8080 |
| Mailpit (password-reset mails) | http://localhost:8025 |
| Anna | `anna@example.test` / `Demo-Passwort-1` |
| Ben | `ben@example.test` / `Demo-Passwort-2` |

Use a second browser profile or a private window to be both people at once. `tools/start-demo.sh --rebuild` rebuilds the image from the current code first; `tools/start-demo.sh --stop` stops the stack. All accounts and secrets are fictitious development values and for local use only. A short walkthrough for testers (German): [docs/tester-guide.md](docs/tester-guide.md).

## Repository layout

One repository, two components ([ADR 0001](docs/adr/0001-one-repository-backend-frontend.md)):

| Path | Content |
|---|---|
| `backend/` | Spring Boot (Java 25) service: REST API, BFF login session, PostgreSQL via Flyway, serves the built frontend. Hexagonal architecture, ArchUnit-enforced |
| `frontend/` | Angular single-page app (Material Design 3, signal stores, generated API client from the OpenAPI spec in `backend/openapi/`) |
| `requirements/` | Concept, UX, detailed requirements, implementation plan, mockups |
| `docs/architecture/` | This product's arc42 documentation; `docs/adr/` decisions; `docs/security/`, `docs/data-protection/`, `docs/accessibility.md` |
| `docs/baseline/` | The shared quality baseline (binding technical rules, see [AGENTS.md](AGENTS.md)) |
| `tools/` | Demo mode, demo data, timing tooling |

## Development

Run commands from the component folder.

```sh
# backend (needs Docker for Testcontainers)
cd backend && ./mvnw verify

# frontend
cd frontend && npm ci
npm run verify        # format, lint, typecheck, architecture, unused code, unit tests, build, stubbed e2e
npm run e2e:fast      # stubbed e2e, Chromium, expanded window only
npm run e2e:real      # e2e against the running Compose stack (start it with tools/start-demo.sh or see backend/dev)
```

The current gates are local (no CI yet, [ADR 0004](docs/adr/0004-local-gates-and-compose-test-environment.md)). Without WebKit libraries on the host, set `E2E_SKIP_WEBKIT=1`.

## Documentation

- Architecture (arc42): [docs/architecture/README.md](docs/architecture/README.md); decisions: [docs/adr/](docs/adr/)
- Requirements and plan: [requirements/README.md](requirements/README.md)
- Security: [SECURITY.md](SECURITY.md), [docs/security/](docs/security/)
- Known issues, deviations and the manual checks for human review: [implementation-log.md](implementation-log.md)
- Feedback on the baseline collected during the build: [baseline-feedback.md](baseline-feedback.md)
