# Baseline feedback

Running log of places where the baseline was unclear, contradictory, missing, impractical or contradicted by a skill, and of decisions the baseline did not answer. Format: F-NN, doc or rule ID, what happened, what I did instead.

| # | Doc / rule | What happened | What I did |
|---|---|---|---|
| F-01 | TOOL-SKL-10 / AGENTS.md "How to read" | The mandatory start-of-task read (shared rule index 53 KB + stack indexes ≈ 120 KB) costs roughly 35k tokens before any work. The files are long single-line bullets. | Read shared, java, spring, typescript, angular indexes once at the start. Suggest an even shorter "agent digest" per stack. |
| F-02 | API-REST-11 / SPRING-REST-12 vs. requirement FR-SYNC-02 AC2 | The baseline requires optimistic concurrency (If-Match/version) on concurrently edited resources. The product requires "last change wins" for item edits. No rule says how to record a deliberate last-write-wins. | Chose last-write-wins with a returned `version`, recorded in ADR 0007 as a deviation naming API-REST-11 / SPRING-REST-12 (ARCH-SC-08). |
| F-03 | SPRING-SEC-09 | The BFF can be its own component or a filter chain; no guidance for choosing beyond "ADR". | Chose in-process BFF chain (one backend, only browser clients), ADR 0002. |
