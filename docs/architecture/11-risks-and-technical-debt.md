# 11. Risks and Technical Debt

| # | Item | Trigger to pay back / handle |
|---|---|---|
| R1 | Keycloak login/registration pages are themed FreeMarker pages, not Angular components; design parity is best effort | Tester feedback or public release |
| R2 | No pipeline; scans run locally (ADR 0004) | SCM host chosen |
| R3 | Last write wins (ADR 0007), deviates from API-REST-11 | product wants conflict detection |
| R4 | 30-day sliding sessions are longer than SPRING-SEC-32 defaults (ADR 0002) | security review or public release |
| R5 | Snapshot polling instead of deltas (ADR 0006) | lists ≫ 500 items |
| R6 | OQ-1: no e-mail verification (accepted in 04); SPRING-SEC-44 requires verified e-mail for linking, so linking by e-mail is never done: the account is linked by IdP subject only | public release |
