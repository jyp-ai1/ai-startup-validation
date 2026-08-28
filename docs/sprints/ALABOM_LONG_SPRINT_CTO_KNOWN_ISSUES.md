# ALABOM Long Sprint — CTO Known Issues (CPO Validation)

```text
Date: 2026-08-28 (KST)
Production SHA (baseline): 6f29b90 → vNext deploy pending poll
CPO judgment: FIX — real adaptive vNext (T4 wrong-slot + Analysis Ready too early)
Auth / KI-1: Deferred
CEO Walkthrough: NOT READY
```

## Open — CPO FIX batch (real adaptive vNext)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| RA-V1 | T4 wrong-slot: after diff → customer persona instead of diff relevance | **P0** | **FIXED** — competitor→diff→validationTestability chain + last-answer causality |
| RA-V2 | Analysis Ready ~10 turns (turn-count / premature gate) | **P0** | **FIXED** — `listAnalysisBlockingGaps`; diff without relevance blocks Start Analysis |
| RA-V3 | LIVE capture 15–25 meaningful adaptive turns | P0 | **IN PROGRESS** — `_cpo-real-adaptive-prod-capture.spec.ts` → `real-adaptive-vnext/` |

## Resolved prior batch

| ID | Issue | Resolution |
|----|-------|------------|
| RA-1 | Harness padding T17–T30 | FIXED @ 6f29b90 |
| RA-2 | T33 GO on padded journey | Superseded by vNext capture |
| RA-3 | Why meta why-now | FIXED |
| RA-4 | B2B vs tourist payer conflict | Engine OK |
| RA-5 | Analysis gate score-only GO | Engine OK |

## Explicitly deferred

- **Auth / KI-1**
- **CPO PASS** — pending vNext LIVE capture
- **CEO Walkthrough**

## Regression watch (real adaptive vNext)

| Metric | Target |
|--------|--------|
| wrong-slot | 0 |
| mixed-Q | 0 |
| re-ask | 0 |
| padding turns | 0 |
| Meaningful answers | 15–25 natural |

## Closing statements (required)

- **CPO review: pending — do NOT declare PASS**
- **CEO Walkthrough: NOT READY**
- **CTO QA: vNext engine shipped — LIVE capture pending**
