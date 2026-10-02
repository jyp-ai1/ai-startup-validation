# CPO Calibration Instructions (Improvement Sprint 1)

## Input

`EVAL/cpo-improvement-calibration-pack.json` — **50 cases** (10 × 5 clusters).

## Per case, set

| Field | Values |
|-------|--------|
| `cpoCalibratedVerdict` | PASS / PARTIAL / FAIL |
| `calibrationClass` | `AI_PM_DEFECT` · `EVALUATOR_DEFECT` · `GROUND_TRUTH_DEFECT` |
| `cpoNotes` | Free text |

## Do not conflate

- **A** AI PM defect → Improvement Sprint fix target  
- **B** Evaluator defect → fix Validation Engine rules only  
- **C** Ground truth defect → fix schema/GT engine only  

## After 50 verdicts

CTO runs priority matrix (frequency, severity, impact, generalization — **separate fields**) and starts **one cluster** structural fix cycle.

No AI PM code changes until this file’s cases are adjudicated.
