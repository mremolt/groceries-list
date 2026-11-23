# 0007. Last write wins for item and list updates (deviation from API-REST-11)

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** API-REST-11, SPRING-REST-12, ARCH-SC-08

## Context

API-REST-11 requires optimistic concurrency (`If-Match` / `version`) for concurrently edited resources. FR-SYNC-02 AC2 is an explicit product rule: conflicting edits of the same item or its done state — the last change saved wins. A conflict dialog would break the shopping flow (FR-ITEM-02).

## Decision

Item and list updates are **idempotent sets** (`PATCH` with the new text/done value or `PUT` of the text), applied without a version precondition. The response is `200` with the resource including its `version`; the architecture rule `updatesAnswerWithTheResource` stays on. A write to an item deleted in the meantime answers 404 (not found; FR-SYNC-02 AC3). Hibernate `@Version` stays on the persistence entity so concurrent transactions do not corrupt rows: the adapter retries once on an optimistic-lock failure and then the last write wins. Deletion of the list's last member is guarded by row locking (ARCH-UC-16).

## Consequences

Documented deviation for the rules named above only. Clients never get 412/428 on these endpoints.

**Revisit when:** the product wants conflict detection for text edits.

## Implementation note (M2)

For lists the rename is one atomic SQL update (`name = …, revision = revision + 1`), so concurrent renames and item-driven revision changes never fail and the last write wins; no adapter retry is needed. The `@Version` on the entity (= the revision column) covers only entity writes. The decision above is unchanged.
