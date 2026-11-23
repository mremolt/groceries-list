# 4. Solution Strategy

Baseline strategy: [../baseline/04-solution-strategy](../baseline/04-solution-strategy/README.md) (hexagonal, test-first, generated contract, WCAG AA by tests). Product-specific choices:

| Topic | Strategy | Record |
|---|---|---|
| Repository | one repository, `backend/` + `frontend/` | [ADR 0001](../adr/0001-one-repository-backend-frontend.md) |
| Authentication | Keycloak, BFF filter chain in the backend, Spring Session JDBC | [ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md), [0003](../adr/0003-map-auth-requirements-to-oidc.md) |
| Domain | one context, features `accounts`, `lists`, `items`, `sharing`, `sync` | [ADR 0009](../adr/0009-single-bounded-context.md) |
| Synchronisation | polling, per-list revision, ETag/304 | [ADR 0006](../adr/0006-sync-by-polling-with-list-revision.md) |
| Concurrency | last write wins (deviation from API-REST-11) | [ADR 0007](../adr/0007-last-write-wins-item-updates.md) |
| Sharing | 256-bit token, join token kept server-side across login | [ADR 0008](../adr/0008-share-token-and-join-flow.md) |
| UI | Angular Material M3, theme from design tokens, light/dark/system per device | chapter 8 |
| Texts | German, resource files | [ADR 0005](../adr/0005-i18n-german-only-with-resource-files.md) |
| Delivery | local gates and Compose installation | [ADR 0004](../adr/0004-local-gates-and-compose-test-environment.md) |

Requirement mapping where 04 describes a technical solution that differs from the baseline: [ADR 0003](../adr/0003-map-auth-requirements-to-oidc.md).
