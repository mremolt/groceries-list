# 0006. Synchronisation by polling with a per-list revision and conditional GET

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** API-N1-01..09, API-REST-11, FR-SYNC-01..05, NFR-PERF-03/04

## Context

R1: polling every 5 s, cheap when unchanged (NFR-PERF-04), drawer counts (FR-LIST-05, FR-SYNC-03).

## Decision

- Every `lists` row has a `revision` (bigint) incremented in the same transaction by every change to the list or its items. Items carry their own `version` for the returned resource.
- `GET /v1/lists/{id}/items` returns the full snapshot (≤ 500 items, bounded, API-N1-07) with a strong `ETag: "<revision>"`; `If-None-Match` with the current revision answers `304`. The 304 path reads one row (membership check + revision) and no items (API-N1-09).
- `GET /v1/lists` returns the user's lists with open counts and revision from **one** set-based query with a grouped count (API-N1 strategy: backend view endpoint, API-N1-05/08). The frontend polls it every 30 s (and after each own change); the open list's items every 5 s. No per-list calls from the drawer.
- A deleted or left list answers 404 on the next poll (FR-SYNC-05).
- No tombstones, no event log: the snapshot is small, so "changes since" is "snapshot if the revision moved".

## Consequences

Simple, scales for the stated sizes (< 100 items, < 10 members). Query count asserted by test (SPRING-TEST-06, API-N1-06).

**Revisit when:** lists grow far beyond 500 items or push (SSE) is wanted.

## Implementation note (M2)

`lists.revision` exists since M2 (migration `V5__lists_and_memberships.sql`) and is the Hibernate `@Version` of the list entity as well; renames increase it with `revision = revision + 1`. The drawer read `GET /api/v1/lists` is one grouped statement (asserted by test). The ETag/304 item snapshot follows with M3/M5. The decision above is unchanged.
