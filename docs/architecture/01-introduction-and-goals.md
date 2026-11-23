# 1. Introduction and Goals

Groceries list: a simple, fast, mobile-first web app where households and friends share grocery lists and shop from them together. Requirements: [`requirements/`](../../requirements/README.md) (binding for business behaviour; the baseline wins on technical matters, see [chapter 4](04-solution-strategy.md)). Baseline: [../baseline/01-introduction-and-goals](../baseline/01-introduction-and-goals/README.md).

## 1.1 Requirements overview

Accounts and sign-in (via an identity provider), lists with equal-rights members, items with check/uncheck, share links, change polling every 5 s, settings. Release scope: **internal test release** without public access ([05 §5](../../requirements/05-implementation-plan.md)).

## 1.2 Quality goals

| # | Goal | Scenario |
|---|---|---|
| 1 | Usability and speed | Adding or checking an item gives feedback within 100 ms (NFR-PERF-02); ≤ 3 taps from app start (NFR-USE-01) |
| 2 | Accessibility | WCAG 2.2 AA asserted by tests in every screen (NFR-A11Y, A11Y-03) |
| 3 | Security of list data | Only members see a list; non-members get "not found" (BR-01, NFR-SEC-04) |
| 4 | Freshness | A change reaches other members within 6 s (NFR-PERF-03) |

## 1.3 Stakeholders

| Role | Expectation |
|---|---|
| Household members / friends | Fast shared list |
| Internal testers | Stable app, tester guide, bug reporting |
| Platform/quality team | The baseline is enough to guide the build (see `baseline-feedback.md`) |
