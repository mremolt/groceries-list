# 10. Quality Requirements

Quality goals: [chapter 1](01-introduction-and-goals.md). Baseline: [../baseline/10-quality-requirements](../baseline/10-quality-requirements/README.md).

| ID | Scenario | Measure | Verified by |
|---|---|---|---|
| Q1 | A user checks an item | UI updates ≤ 100 ms (optimistic) | component test, E2E |
| Q2 | Member A changes a list | member B sees it ≤ 6 s | two-session E2E (M5) |
| Q3 | Unchanged list poll | 304, one row read | integration test with statement count |
| Q4 | Any screen | no WCAG 2.2 AA violation (axe), keyboard operable | component + E2E axe (L3/L4), `docs/accessibility.md` |
| Q5 | Non-member requests a list | 404, same as unknown id | cross-user tests |
| Q6 | First load, mid-range phone, 4G | LCP ≤ 2.5 s, INP ≤ 200 ms | M7 measurement |

PR-tier wall-clock budget for E2E (TS-TEST-30): to be recorded in M0 once measured.
