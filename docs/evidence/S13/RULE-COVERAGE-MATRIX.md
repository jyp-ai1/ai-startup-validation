# S13 Rule Coverage Matrix

| Rule | Acceptance Test (`describe`) | Status | S12 lineage |
|------|------------------------------|--------|-------------|
| R-01 | `R-01` | ✅ PASS | S12 §2 Direct |
| R-02 | `R-02` | ✅ PASS | S12 §2 Direct |
| R-03 | `R-03` | ✅ PASS | S12 §2 Direct |
| R-04 | — Folded — | ✅ vacated | Insight language only |
| R-05 | `R-05` | ✅ PASS | S12 §2 Direct |
| R-06 | `R-06` | ✅ PASS | Derived from S12 §2 |

Fold guard: `S13 Acceptance §4` → `R-04 Fold: ProblemFit must never appear as a Decision`

Shipped Decision Rules: **5 / 5** · Decision Families: `RevenueValidation` · `MarketJudgment` · `AnalysisGate` only.
