# 0009. One bounded context; application cut by feature

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** ARCH-ORG-04, ARCH-ORG-09, D2

## Context

Domain: users, lists, memberships, items, share links. All rules (BR-01..12) cross these entities in the same transactions (last member leaves → list deleted).

## Decision

One bounded context in one backend. `application` is cut by feature: `accounts`, `lists`, `items`, `sharing`, `sync`. Domain types: `User`, `ShoppingList`, `Membership`, `Item`, `ShareToken`. Rich domain methods where rules exist (limits, text validation, last-member rule), CRUD-style use cases elsewhere (D2).

## Consequences

No inter-context events. Deleting an account is one use case in one transaction plus a post-commit call to Keycloak's admin API (RES-TX-01: remote call outside the transaction).
