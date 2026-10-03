# Phase 2-B — F13 multi-fact loss: clause/claim segmentation

Branch: `cursor/sprint2-f13-clause-segmentation-e648` (base `cursor/sprint2-phase2-e648`, Phase 2-A)
Approval: CPO approved an AI PM structural fix for F13, with a minimal design and no large `enrichMultiFactSemantic` extension.

## 1. Before (Phase 2-A baseline)

The replay covered 10 sandbox businesses and 15 development matrix businesses (holdout excluded), with 9 behaviors × 7 turns each, for 1,365 turns in total. Of these, 175 are multi-fact turns.

| facts per multi-fact turn | turns |
|---|---:|
| 0 | 120 |
| 1 | 54 |
| 2 | 1 |

Example (`sb-b2b-saas`, turn 1, asked `businessOneLiner`):

- Answer: `경영진/팀 리더가 구매하고 팀이 매일 사용하며, 지금은 엑셀로 업무 협업 비효율를 관리합니다.`
- Facts: `revenue` = the whole sentence (FACT), so `revenueModel` is CLOSED.
- `payer`, the problem and the current workaround are lost. When the ask is `customerPersona`, the turn yields 0 facts.

Root cause: the review treated the answer as one sentence.

- Fact keys came from surface cues of the full sentence ("구매" was read as `revenue`).
- Every fact value was the full sentence (`extractFactValue` fallback).
- No step split the answer into claims.

## 2. Fix (minimal)

Pipeline: Raw answer → clause segmentation → per-claim slot/entity → FACT / ASSUMPTION / INFERENCE → Answer Review → Gap State.

**New module `answer-claim-segmentation.ts`**

- Splits clauses on `, . ; ! ?` and after the connectives `하고 / 하며 / 이고 / 이며`.
- Recognizes role patterns only:

| role | pattern | slot key | evidence |
|---|---|---|---|
| buyer | `X가 구매/결제/구입/비용을 내…` | `buyer` (payer) | FACT (ASSUMPTION if hedged) |
| workaround | `지금은 X로 (Y를) 관리/처리/해결…` | `competitor` = X | FACT (ASSUMPTION if hedged) |
| workaround problem | object Y of the workaround clause | `problem` = Y | INFERENCE (ASSUMPTION if hedged) |
| user | `X가 매일 사용…` | none; no slot owns "user" | recorded, not mapped |

- `segmentMultiClaimAnswer` returns claims only when at least two distinct slot keys are found. Otherwise it returns `[]`, and the answer stays on the existing path.

**Changes to `build-answer-review.ts`**

- One branch: `applyClaimSegmentation(...) ?? enrichMultiFactSemantic(...)`. It applies only to `business_fact` answers that are not CONTRADICTORY.
- Claims replace the whole-answer fact hits.
- `buildExtractedFacts` uses `claimValue` and `claimEvidenceClass` when present.
- `SemanticFactHit` gains the two optional fields.

**Not changed**

- The four V3 SoT functions: `buildAnswerReview` flow order, `gapVerdicts` derivation, `updateGapStateFromReview`, `decideNextQuestionFromReview`.
- `enrichMultiFactSemantic`.
- The asked-gap verdict, contradiction handling, and question decision.

## 3. After

The same 1,365-turn replay:

| facts per multi-fact turn | before | after |
|---|---:|---:|
| 0 | 120 | 6 |
| 1 | 54 | 0 |
| 2 | 1 | 105 |
| 3 | 0 | 64 |

**Non-multi-fact rows: 1,190 of 1,190 are identical** (facts, gaps and next target). Only `multi_fact` rows changed.

Example (`sb-b2b-saas`, asked `customerPersona`):

| fact | value | evidence | gap verdict |
|---|---|---|---|
| buyer | 경영진/팀 리더 | FACT | payer CLOSED |
| competitor | 엑셀 | FACT | alternativesCompetitors CLOSED |
| problem | 업무 협업 비효율 | INFERENCE | problemJtbd PARTIAL |
| (asked) | — | — | customerPersona OPEN (no persona stated) |

- `revenueModel` is no longer falsely CLOSED (154 → 0 of the 175 multi-fact rows).
- The next question stays `customerPersona`, which is correct because the persona is still unknown.

The 6 remaining 0-fact rows are `sb-platform`, turns 2–7, asked `customerPersona`. The existing V3-06 rule (a technology cue such as "API" on a persona ask means off-topic) clears all facts before segmentation runs. This is left as is and is not tuned.

## 4. Regression (baseline = Phase 2-A)

| suite | Phase 2-A | F13 |
|---|---|---|
| F13 targeted (`f13-claim-segmentation.test.ts`, 8) | — | 8 pass; 3 integration tests fail without the wiring |
| Golden 8/8 scenarios (turn evidence JSON) | — | **identical** |
| Golden 10 tests | pass | pass |
| Seed A–F | — | **identical** (including Seed D, matrix multi-fact) |
| F11 targeted + f11-all | pass | pass |
| Engine mining (450 turns) | 98 failed (F13 98, F16 18) | **8 failed (F13 8, all `sb-platform` V3-06)** |
| Scale ladder (300 turns) | 49 failed | 4 failed (`sb-platform` V3-06) |
| Holdout biz-16/17 | 0 failed | 0 failed |
| Longitudinal adjudication | AI_PM 10 / GT 20 / EVAL 40 | identical |
| Phase 3 table | F13 aiPm 10 | F13 aiPm 10 (pack padded from the 8 `sb-platform` rows) |
| Full unit | 34 failed | 34 failed, identical set (after the test correction below) |

Notes:

- **F16 18 → 0 is not a fix.** Failure mining only counts failure codes on failed turns. F16 is a PARTIAL verdict on the turn-1 question "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?". That wording has none of the evaluator's customer keywords (`고객|타겟|페르소나|사용자`). Those turns no longer fail, because F13 passes, so F16 is no longer mined. The question text did not change.
- **Holdout:** I did not read or tune on holdout answers. The patterns are generic Korean role constructions. The holdout result is reported only.
- **Test correction:** the Phase 2-A pack test asserted `cases = min(10, available)`. `diversifyPick` actually pads any cluster that has at least one row up to 10, so the assertion was wrong once F13 had 8 rows. I corrected the assertion; the pack code is unchanged.
- **Lint:** the `prefer-const` error on `nuclearWrongSlot` and the unused `askedGapId` warning are pre-existing, on unchanged lines.

## 5. Residual / for CPO

1. **`user` claim vocabulary.** "팀이 매일 사용" is a real claim, but no slot owns it. GT uses `payerUser`, while the AI uses `payer` + `customerPersona`. Mapping users to `customerPersona` needs a CPO decision.
2. **Harness defects (not fixed):**
   - The user agent uses the placeholder payer "구매 decision maker" for 9 of 10 businesses. It is stored as payer FACT.
   - The user agent uses the wrong object particle ("분산를").
3. **V3-06** clears multi-fact facts when a technology cue appears on a persona ask (`sb-platform`).
