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

## Implementation note (M3)

Every item write moves `lists.revision` in the same transaction (`ItemPersistenceAdapter.touchList`: add, update, delete, and clear-checked when at least one row was removed). `GET /lists/{id}/items` is one bounded statement (`LIMIT 500`); the open count of the drawer is a sub-select in the existing summary statement. The ETag/304 snapshot read follows with M5. The decision above is unchanged.

## Implementation note (M5)

`ListItemsUseCase` returns an `ItemsSnapshot(revision, items?)`; the query carries the revision the client holds (`If-None-Match`, one strong or weak `"<digits>"` validator, otherwise ignored). Membership and revision come from the existing single-row `findForMember` read; on a match the use case answers not-modified and never touches `ItemPort` (test: the 304 path issues exactly one statement less than the 200 path). The items are read after the revision, so the ETag is never newer than the data. The 304 answer repeats the ETag and has no body; non-members and gone lists answer the uniform 404 before any comparison, so a guessed revision tells a stranger nothing. Spring Security's `Cache-Control: no-store` stays; the client sends `If-None-Match` itself. Join, leave and share-link changes do not move the revision (they change neither list content nor items; the 30 s drawer poll shows them). The decision above is unchanged.
