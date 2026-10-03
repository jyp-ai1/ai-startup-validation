# Phase 1 Adjudication Summary (auto)

Generated: 2026-10-02T23:57:33.663Z

## Counts

| calibrationClass | count |
|------------------|------:|
| GROUND_TRUTH_DEFECT | 10 |
| EVALUATOR_DEFECT | 30 |
| AI_PM_DEFECT | 30 |

## P0 Turn 5 (contradiction onset) FAIL
0 — all 10 archetypes PASS at turn 5 (CONTRADICTED + next question reflects conflict).

## P0 Turn 6–7 (preservation) FAIL
20 — `customerPersona` drops CONTRADICTED → CLOSED without resolution (auto AI_PM_DEFECT).

## P1 Turn 3 revenue false-FACT FAIL
0 — no hedge→FACT misclassification at turn 3.

## P1 Turn 5 validation→FACT FAIL
10 — revenue FACT not retained in extracted facts at validation turn (wrong-slot / journey).

## P1 Turn 6 FACT preservation FAIL
10 — prior FACT lost on follow-up unvalidated claim (when turn 5 lacked FACT).

## Confirmed AI PM defects (auto — CPO may override)
30 rows — see `longitudinal-adjudication-submission.json`.

**No structural fix authorized** until CPO confirms AI_PM_DEFECT subset.
