# Phase 2-A — Evaluator / Ground Truth alignment (F11 GT · STATE_DRIFT GT · F08 evaluator)

Branch: `cursor/sprint2-phase2-e648` (base `cursor/sprint2-f11-slot-grounding-e648` @ `719c278`)
Scope (CPO order): GT and evaluator only. **No AI PM, question-decision or gap-priority runtime code changed.**

## 0. Pre-merge check — 6 holdout `marketChannel` rows (CONTRADICTED → OPEN)

| business | behavior | turn | user answer contains channel info? | where the conflict actually belongs | verdict |
|---|---|---|---|---|---|
| biz-16 | normal | t4 | No | `problemJtbd` (candidate B pattern) | correct: OPEN |
| biz-16 | normal | t5 | No | `problemJtbd` (candidate B pattern) | correct: OPEN |
| biz-16 | contradiction | t4 | No | `customerPersona` (F11 pattern) | correct: OPEN |
| biz-16 | contradiction | t5 | No | `customerPersona` (F11 pattern) | correct: OPEN |
| biz-17 | normal | t4/t5 | No | `problemJtbd` | correct: OPEN |
| biz-17 | contradiction | t4/t5 | No | `customerPersona` | correct: OPEN |

All six transitions are valid state changes: the answer never mentioned a channel, so `marketChannel` must not
be CONTRADICTED. Note: GT `closeSlot(asked)` marks these CLOSED — a known GT asked-slot defect, tracked under
Phase 2-C candidate A (unrelated answer closes asked gap). Not fixed here.

## 1. Changes

| file | change | CPO item |
|---|---|---|
| `ground-truth-engine.ts` | Removed behavior/turn-based CONFLICT inside `closeSlot`. Added `isPersonaReversal` → `customerPersona` CONFLICT on reversal; restating the same value after CONFLICT → CLOSED (`trigger: correction`). Refinements ("정정합니다", "도 포함") stay normal closes. | A1, A2 |
| `deterministic-evaluator.ts` | F11 fires only when GT says `customerPersona === 'CONFLICT'` (was `turn >= 4`). | A1 |
| `longitudinal-adjudication.ts` | P0 preservation: conflict → GT CLOSED + AI CLOSED = PASS (GROUND_TRUTH_DEFECT reclass); AI still conflicted = AI_PM_DEFECT. | A1, A2 |
| `gap-priority-evaluator.ts` | F08 uses stage SoT order (`STAGE_A_REQUIRED_GAPS` → `STAGE_B_REQUIRED_GAPS`); CONTRADICTED first within the unfinished stage; never-asked (absent) gaps count as askable. | A3 |
| 3 calibration tests | Hardcoded `50` → sum of `min(10, available)` per cluster with asserted shortfall (F11/STATE_DRIFT now 0 available). | — |
| `phase2a-evaluator-gt-alignment.test.ts` | 13 new tests (GT conflict/resolve/different value/refinement/log consistency, F11 follows GT, F08 SoT). | — |

## 2. 630-turn re-evaluation (all longitudinal turns)

10 businesses × 9 behaviors × 7 turns = 630 turns, replayed with the same diagnostic against the F11 branch
(`719c278`) and Phase 2-A. AI PM output (gaps + next target) is **identical on all 630 rows**; only GT/evaluator moved.

| metric | F11 baseline | Phase 2-A |
|---|---:|---:|
| evaluator expected gap == AI next target | 307 | **617** |
| evaluator expected gap = none (never-asked gaps ignored) | 230 | 13 |
| F08 alignment failures | 0 | 0 |
| STATE_DRIFT (GT vs AI) | 60 | **0** |
| F11 (GT CONFLICT, AI not conflicted) | 60 | **0** |
| GT CLOSED while AI still CONTRADICTED (missed resolution) | 0 | 0 |

F08 note: the old evaluator never failed the AI on these turns, but it did so because it skipped never-asked
gaps and so had no expectation on 230 turns. The 10 F08 calibration cases are proxy rows (gap/question FAIL or F16)
and stay classified EVALUATOR_DEFECT. The 13 rows where the expectation differs from the AI's next target still pass
alignment (the AI targets a CONTRADICTED gap in the unfinished stage, which the SoT allows).

STATE_DRIFT/F11 baseline 60 = contradiction t5–t7 + longitudinal_f11 t4/t6/t7 across 10 businesses. The
engine-mining view below counts 20 each because it samples the sandbox ladder (450 turns).

## 3. Regression (`/tmp/run-regression.sh`, baseline = F11 branch)

| suite | F11 baseline | Phase 2-A |
|---|---|---|
| Engine mining failedTurns | 118 | **98** (F11 20→0, STATE_DRIFT 20→0; F13 98, F16 18 unchanged) |
| Scale ladder failures | 59 | 49 |
| Holdout (biz-16/17) failures | 2 | **0** |
| Seed A–F | identical | identical |
| Golden 8/8 scenarios + 10 golden tests | pass | pass (identical output) |
| F11 targeted (16) | pass | pass |
| Longitudinal adjudication | AI_PM 30 | **AI_PM 10 / GT 20 / EVAL 40**, P0 Turn 5 FAIL 0 |
| Phase 3 table | — | F13 aiPm 10 · F11 0 · STATE_DRIFT 0 · F04 evaluator 10 · F08 evaluator 10 |
| Full unit | 34 failed / 694 passed | 34 failed / 723 passed — **identical failing set** (+29 = new tests); 1 Vitest worker RPC timeout (infra) |

Remaining AI_PM_DEFECT 10 = F04 pricing (CPO HOLD).

## 4. Reclassification (CPO-approved)

- F11: 20 turn 6–7 `customerPersona` rows → **GROUND_TRUTH_DEFECT** (AI correctly closed after explicit resolution).
- STATE_DRIFT: 20 rows → **GROUND_TRUTH_DEFECT** (GT now models CONFLICT → explicit resolution).
- F08: evaluator ordering defect, resolved in evaluator only.

Completion criterion met: existing correct AI PM behavior is no longer flagged as a defect.

Artifacts: `PHASE-2A/longitudinal-adjudication-submission.json`, `PHASE-2A/adjudication-summary-after-2a.md`.
