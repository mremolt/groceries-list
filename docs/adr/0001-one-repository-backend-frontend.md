# 0001. One repository with backend/ and frontend/ components

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** REPO-LAY-01, REPO-LAY-02, REPO-LAY-03, D12

## Context

Decision guide check (REPO-LAY-02). Signals for separate repositories: none. One product, one team, one release cadence, one OpenAPI contract consumed by exactly one frontend (REPO-API-01), no separate compliance or access boundary, no different lifecycle. Signals for one repository: backend and frontend change together on almost every feature; the Angular client is generated from the backend's committed spec.

## Decision

One repository. Components: `backend/` (Spring Boot, also the in-process BFF, ADR 0002) and `frontend/` (Angular). The baseline is synced at the root (REPO-LAY-06). No build orchestrator across components (REPO-LAY-04); each component has its own `verify`. Repo-wide docs, tools and the Compose installation live at the root or in `backend/` (compose files).

## Consequences

One PR can change contract and client. The frontend bundle reaches the backend image as a build artifact (REL-FE-02), not through a cross-component build.
