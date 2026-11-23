# 2. Architecture Constraints

| Constraint | Source |
|---|---|
| Spring Boot backend, Angular frontend (stacks in `.baseline.json`) | [D17](../baseline/04-solution-strategy/README.md), [05 §2](../../requirements/05-implementation-plan.md) |
| Baseline rules are binding and win over requirements on technical topics | `kickoff.md`, TOOL-SKL-01 |
| Authentication by an external OIDC IdP through a BFF | SPRING-SEC-03/08, [ADR 0002](../adr/0002-bff-in-backend-and-keycloak-idp.md), [ADR 0003](../adr/0003-map-auth-requirements-to-oidc.md) |
| German only, texts in resource files | NFR-L10N, [ADR 0005](../adr/0005-i18n-german-only-with-resource-files.md) |
| Material Design 3 with `requirements/mockups/design-tokens.json` | 03-ux-material3, NG-UI-04 |
| No CI/hosting yet; local gates | [ADR 0004](../adr/0004-local-gates-and-compose-test-environment.md) |
| Unattended build; no push, no real credentials | `kickoff.md` |
