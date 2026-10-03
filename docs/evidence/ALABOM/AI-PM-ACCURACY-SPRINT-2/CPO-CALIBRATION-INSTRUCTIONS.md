# CPO Calibration Instructions (Accuracy Sprint 2)

## Input

`EVAL/longitudinal-calibration-pack.json` — longitudinal scenarios × mini-sandbox archetypes.

## Per checkpoint (not per single turn in isolation)

Evaluate **state preservation** across turns 4→7 (P0) or 3→6 (P1).

| Field | Values |
|-------|--------|
| `cpoCalibratedVerdict` | PASS / PARTIAL / FAIL |
| `calibrationClass` | `AI_PM_DEFECT` · `EVALUATOR_DEFECT` · `GROUND_TRUTH_DEFECT` |
| `cpoNotes` | Free text — cite transition (e.g. CONFLICT → CLOSED without resolution) |

## Priority order for adjudication

1. **P0** Turn-5+ F11 preservation  
2. **P1** Revenue / pricingHint longitudinal  
3. **P2** F08 (evaluator/GT only unless proven otherwise)  
4. **P3** F13 (evaluator/GT only — no AI PM enrich)  
5. **P4** STATE_DRIFT (GT / transition rules)

## Do not

- Start AI PM structural fixes before this pack is adjudicated.  
- Treat Sprint 1 Production F11/F04 smoke as substitute for longitudinal P0/P1.  
- Re-open F13 via `enrichMultiFactSemantic` without CPO AI_PM_DEFECT class.

## After adjudication

CTO publishes confirmed defect list → CPO approval → one cluster structural fix cycle (same as Sprint 1).
