# AI PM Improvement Sprint 1

**Status:** **COMPLETE** (CPO) — Phase 4-B authenticated Production F11/F04 smoke PASS; see `IMPROVEMENT-SPRINT-1-FINAL-COMPLETION-EVIDENCE.md`

## Mission

Validation Engine baseline → **Failure Cluster calibration** → structural fix → regression → holdout (one-shot) → real business.

## Baseline clusters (450-turn mining)

1. F13_MULTI_FACT_LOSS  
2. F11_CONTRADICTION_MISHANDLING  
3. STATE_DRIFT  
4. F04_FACT_ASSUMPTION_CONFUSION  
5. F08_WRONG_GAP_PRIORITY  

## Phase order

```text
CPO Calibration (50 cases)
→ Priority evidence (freq × severity × impact × generalization — separate fields)
→ Minimal structural fix per cluster
→ Fix cycle (seed, golden, engine, holdout)
→ Real business
→ Production gate
```

## Hard rules

- No case-by-case prompt patches  
- Sprint 2B cluster fixes remain **HOLD** until calibration confirms AI PM defect  
- biz-16 / biz-17 **holdout** — no tuning exposure  
- No CEO testing until Completion Evidence gate (CPO policy)

## Artifacts

| Artifact | Path |
|----------|------|
| Calibration pack (50 target) | `EVAL/cpo-improvement-calibration-pack.json` |
| CPO verdict template | per-case `cpoCalibratedVerdict`, `calibrationClass` |

Generate:

```bash
cd apps/web && pnpm test:cpo-calibration-submission
```

Outputs:

- `EVAL/cpo-calibration-submission.json` — **50 cases with actualFacts, verdict, class, cpoRationale**
- `EVAL/cpo-calibration-summary.md` — aggregate table

## CEO

No action. Preview/CI subscriptions already closed.
