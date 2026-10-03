# Accuracy Sprint 2 — Phase 1 Completion Evidence

**Generated:** 2026-10-02 (UTC)

## Scope

Longitudinal Calibration Set + **auto adjudication** (harness/evaluator/GT/AI PM separation). **No AI PM product code changes.**

## Deliverables

| Item | Status |
|------|--------|
| `longitudinal-calibration-pack.json` | ✅ 20 scenarios (10 × P0 + 10 × P1) |
| `longitudinal-adjudication-submission.json` | ✅ 70 checkpoint rows |
| `PHASE-1-ADJUDICATION-SUMMARY.md` | ✅ |
| PR #71 (draft) | ✅ |

## CPO review criteria — auto baseline

### P0 F11

| Check | Result |
|-------|--------|
| Turn 5 contradiction onset | **PASS** 10/10 — `customerPersona` CONTRADICTED, next Q reflects A/B conflict |
| Turn 4 GT vs correction | **GROUND_TRUTH_DEFECT** 10/10 — GT CONFLICT expectation premature at correction turn |
| Turn 6–7 preservation | **FAIL** 20 rows — CONTRADICTED → CLOSED without resolution (**AI_PM_DEFECT** candidate) |

### P1 F04

| Check | Result |
|-------|--------|
| Turn 3 hedge → not FACT | **PASS** — no false FACT at assumption turn |
| Turn 3 revenue extraction on pricing gap | **PARTIAL AI_PM** — hedge often on non-pricing ask (journey/slot) |
| Turn 5 validation → FACT | **FAIL** 10/10 — FACT not observed at validation checkpoint in harness replay |
| Turn 6 FACT preservation | **FAIL** when turn 5 lacked FACT |

## Defect class counts (auto)

See `PHASE-1-ADJUDICATION-SUMMARY.md` — CPO may reclassify (especially GT vs harness vs AI PM on P1 wrong-slot).

## Next gate

CPO confirms **subset** of `confirmedAiPmDefects` before any structural fix Phase opens.
