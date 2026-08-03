# S13 — Rule Origin (R-04 · R-06)

**Gate:** Implementation Review ✅ PASS (Conditional cleared 2026-08-04)  
**CPO policy:** R-04 **Fold** · R-06 **Keep**

---

## R-06 — Keep · Origin Closed ✅

| Field | Statement |
|-------|-----------|
| **Origin class** | **Derived from S12 §2** |
| **S12 §2 row** | `Required Confirmed missing → Analysis = Blocked + which Evidence` |
| **Decision family** | `RevenueValidation` (shared with R-01 — **not new**) |
| **Stage input** | S10 Idea Required Evidence includes Willing payer (`ev.payer`) |

**Status:** Origin Closed · Catalog Keep.

---

## R-04 — Fold (Insight only) ✅

| Field | Statement |
|-------|-----------|
| **CPO policy** | **Fold** — not Keep, not Drop-with-orphan |
| **Decision Family** | `ProblemFit` **removed** from Engine types + catalog |
| **Where Problem Fit lives** | Insight claim language only |

### Applied Fold

```text
Decision  (e.g. RevenueValidation = Insufficient)   ← machine
    ↓
Insight   「고객·문제에 대한 이해(Problem Fit)는 있으나, …」  ← language
    ↓
Action    「수익 구조를 먼저 검증하세요.」
```

- `rules.ts`: R-04 vacated (comment only; not in `ANALYSIS_RULES`)
- `types.ts`: `ProblemFit` / `Supported` removed from Decision unions
- `build-insight.ts`: `foldProblemFitLanguage()` when customer+problem Confirmed
- Acceptance: asserts **no** `ProblemFit` Decision · catalog = R-01·02·03·05·06

**No new ADR.** S12 Freeze preserved. Decision Tree not expanded.
