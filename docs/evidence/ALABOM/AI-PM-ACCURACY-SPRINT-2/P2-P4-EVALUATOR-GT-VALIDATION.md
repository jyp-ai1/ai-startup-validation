# Sprint 2 P2–P4 — Evaluator / GT / AI PM validation (F08 · F13 · STATE_DRIFT)

**Branch:** `cursor/sprint2-f11-slot-grounding-e648` (on top of the F11 fix). Docs only: no AI PM, evaluator, or GT code changed for P2–P4.
**Order applied to each cluster:** Evaluator, then GT, then actual AI PM behavior, then the defect decision.
**Data:** deterministic replay (`replayCalibrationTurn`) over 10 sandbox businesses × 9 behaviors (`normal`, `sparse`, `multi_fact`, `off_slot`, `contradiction`, `correction`, `uncertainty`, `longitudinal_f11`, `longitudinal_f04_pricing`) × turns 1–7 = **630 turns**, plus the regenerated Validation Engine pack. Holdout biz-16/17 was not used for any analysis.

## Summary

| Cluster | Evaluator | GT | AI PM actual | Decision |
|---|---|---|---|---|
| **F08** gap priority | ❌ defect | ❌ inherits the evaluator | ✅ 0/630 asks a CLOSED gap · 0/630 asks Stage B while Stage A is open · 0/630 has no next target | **EVALUATOR_DEFECT**. No AI PM change. |
| **F13** multi-fact | ⚠️ counts facts only | ❌ vocabulary mismatch + user-agent artifacts | ❌ 69/70 multi-fact turns extract ≤ 1 fact; the value is the whole utterance; the key follows the asked slot | **AI_PM_DEFECT confirmed**, plus evaluator/GT defects. The fix needs a structural design decision (see below). |
| **STATE_DRIFT** | ✅ rule is sound | ❌ no resolution transition | ✅ conflict raised, A/B asked, explicit restatement resolves it | **GROUND_TRUTH_DEFECT**. No AI PM change. |

---

## P2 — F08 wrong gap priority

**Evaluator** (`gap-priority-evaluator.ts` → `highestPriorityOpenGap`):

1. It ignores **CONTRADICTED** gaps, because only OPEN/PARTIAL/UNKNOWN/ASSUMPTION count as open.
2. It ignores **absent** gaps (never reviewed), so an unasked Stage A gap is invisible to it.
3. It uses `ADAPTIVE_CRITICAL_GAP_KEYS` (includes `solution`, omits `businessOneLiner`/`marketChannel`/`validationTestability`). When none match, it falls back to object insertion order, which ranks a non-required `revenueModel` PARTIAL above the Stage B required gaps. The V3 stage source of truth is `STAGE_A_REQUIRED_GAPS` followed by `STAGE_B_REQUIRED_GAPS`.

The pass rule (it fails only when the next target is CLOSED) is lenient, so the mining count is 0. Measured against "first gap the evaluator expects", the AI disagrees in 93 of 630 turns, and **every disagreement is the evaluator's error**:

| Count | AI PM next target | Evaluator expects | Correct |
|---|---|---|---|
| 51 | Stage A gap that is CONTRADICTED (A/B question) | a Stage B or non-required gap | AI PM (resolve the conflict first) |
| 16 | Stage A gap never asked yet | a non-required gap | AI PM |
| 26 | Stage B required gap | non-required `revenueModel` | AI PM |

**GT:** `expectedPriorityGap` is produced by the same function, so the GT inherits all three defects.

**AI PM actual:** 0 turns ask a CLOSED gap, 0 ask a Stage B gap while any Stage A gap is open, and 0 have a missing next target.

**Decision: EVALUATOR_DEFECT.** Proposed harness fix (not applied, pending CPO acceptance): compute the expected gap from `STAGE_A_REQUIRED_GAPS` then `STAGE_B_REQUIRED_GAPS`, treat absent and CONTRADICTED gaps as askable, and give CONTRADICTED gaps priority within their stage.

## P3 — F13 multi-fact loss

**Evaluator** (`deterministic-evaluator.ts`): `behavior === 'multi_fact' && extractedFacts.length < 2`. It counts facts only, so two wrong-key facts would pass. It should check slot coverage (buyer and problem required, current alternative optional) and the key and value of each fact.

**GT / user agent:**

- The GT gap vocabulary (`problemStatement`, `payerUser`, `wtp`) does not exist in the AI PM gap ids (`problemJtbd`, `payer`, `revenueModel`/`pricingHint`), so GT-vs-AI state comparison never lines up for these slots.
- The utterance template produces artifacts. 9 of 10 businesses have no payer ground truth, so the payer is the placeholder "구매 decision maker". The particle is wrong in all 10 ("분산**를**", "어려움**를**").
- The GT closes `payerUser` and `problemStatement` with the whole utterance as the value.

**AI PM actual** (also re-checked with two grammatical sentences, outside the pack, on 4 asked slots):

| Asked slot | Extracted |
|---|---|
| `businessOneLiner` | 1 fact: `revenue` (or `buyer`) = whole sentence. businessOneLiner CLOSED |
| `customerPersona` | 0 facts (persona gate), OPEN |
| `payer` | 1 fact: `buyer` = whole sentence |
| `problemJtbd` | 1 fact: `problem` = whole sentence |

Pack distribution over 70 multi-fact turns: 0 facts in 30, 1 fact in 39, 2 facts in 1. The fact key follows the asked slot, not the clause, and the value is never split ("팀장이 결제" / "팀원들이 매일 사용" / "엑셀로 관리" / problem).

**Decision: AI_PM_DEFECT confirmed (CPO Phase 3 also confirmed 10/10).** Evaluator and GT defects exist as well. Root cause: there is no clause-level segmentation step before slot mapping (Answer → **Clauses** → Fact per clause → Slot). Per the order, `enrichMultiFactSemantic` was not extended. A structural fix would add a segmentation stage in the interpretation layer, which touches V3 fact extraction for every answer, so Golden risk is high. **CPO decision needed** before implementation: approve a clause-segmentation design, or keep F13 on the evaluator/GT track for this sprint.

## P4 — STATE_DRIFT

**Evaluator** (`detectStateDrift`): drift is flagged when GT CONFLICT meets AI CLOSED/PARTIAL, or GT ASSUMPTION meets AI CLOSED. The rule is sound and only compares slots that both sides share.

**GT transition** (`ground-truth-engine.ts`):

1. For `contradiction` turn ≥ 4 and `longitudinal_f11` turn ≥ 5, the GT sets `customerPersona = CONFLICT` on **every** such turn, including the turn where the user restates the new value in answer to the A/B question. There is no CONFLICT → CLOSED resolution, even though `state-transition-rules.ts` allows it.
2. `correctionTransition` logs CLOSED → CONFLICT → PARTIAL but stores CONFLICT, so the GT disagrees with its own transition log.
3. `closeSlot(askedGapId)` closes the asked slot for any answer. The GT therefore encodes the "asked slot closes on an unrelated answer" assumption and cannot detect it.

**State transition and longitudinal replay (AI PM):**

| Behavior | Turn | AI PM |
|---|---|---|
| contradiction | 4 | `customerPersona` CONTRADICTED, next question is the A/B choice (10/10) |
| contradiction | 5 | user restates the new customer, `customerPersona` CLOSED with the new value (10/10), counted as explicit resolution |
| longitudinal_f11 | 5 → 6 | same pattern (10/10) |

All 20 STATE_DRIFT mining hits (contradiction turn 5) are this resolution turn.

**Decision: GROUND_TRUTH_DEFECT.** Proposed GT fix (not applied, pending CPO acceptance): the GT moves CONFLICT → CLOSED when the user restates one side after the A/B question, and the stored state matches the transition log.

## AI PM defect candidates seen during replay (outside P2–P4, not fixed, need CPO)

1. **Asked-slot force-close.** An OPEN asked gap is CLOSED by a VALID answer about another slot (for example, `businessOneLiner` by "고객은 직장인입니다"). See `F11-SLOT-GROUNDING.md` for the measured broad variant.
2. **False contradiction on repeat** (`normal` behavior turns 3–7, 26 turns). The same answer repeated is flagged CONTRADICTED on `problemJtbd`, because the prior stored value is the extracted phrase and the new value is the whole sentence.
3. **Correction value truncation.** "정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다." stores customer = "중소".
4. **Next-question template leaks.** Examples: "「아직 문서에서 사업 내용을 충분히 이해하지 못했습니다」가 대안과 갈리는 핵심 한 가지는…" and "직장인. 문제: 할 일 분산.이 「B2C SaaS — …」을 풀 때…", where placeholder or document text ends up in the question.
