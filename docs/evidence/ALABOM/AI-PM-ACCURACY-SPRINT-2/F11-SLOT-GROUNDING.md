# Sprint 2 P0 — F11 Contradiction Slot Grounding (structural fix)

**Branch:** `cursor/sprint2-f11-slot-grounding-e648` (stacked on `cursor/ai-pm-accuracy-sprint2-calibration-6423` @ `6d27393`, PR #71)
**Status:** Draft PR, not merged, not deployed. The merge gate is CPO acceptance.
**CPO confirmation:** F11 is a confirmed AI PM defect. Rule: CONTRADICTED must not become CLOSED from an unrelated answer. It may change only on an explicit user correction or sufficient new evidence.

## Reproduction (before)

Longitudinal pack `longitudinal_f11`, all 10 sandbox businesses. The user agent repeats the same reversal sentence at turns 5–7: "실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다."

| Turn | Asked gap (b2c-saas) | Before | Correct? |
|---|---|---|---|
| 5 | `alternativesCompetitors` | `customerPersona` CONTRADICTED **and** `alternativesCompetitors` CONTRADICTED | customerPersona ✅ · asked gap ❌ (the conflict is on the customer slot) |
| 6 | `customerPersona` (A/B question) | `customerPersona` CONTRADICTED → CLOSED with value "50대 남성 기업 IT 담당자" | ✅ explicit resolution: the user restates B and calls the earlier definition a hypothesis |
| 7 | `alternativesCompetitors` | `alternativesCompetitors` CONTRADICTED → **CLOSED** with no competitor fact | ❌ **the F11 defect: closed by an unrelated answer** |

Marketplace shows the same pattern on `differentiationVsAlternatives`. All 10 businesses reproduce it.

Root cause has two layers:

1. `deriveGapCompleteness` returned CONTRADICTED for the **asked** gap whenever `semantic.quality === 'CONTRADICTORY'`, even when the conflicting fact belonged to another slot. `buildContradictions` itself already assigned the conflict to the correct slot.
2. `shouldApplyVerdict` let **any** verdict overwrite a CONTRADICTED record. A later answer that was VALID for some other slot therefore closed it.

## Fix (structural — Existing State + New Answer → Fact → Same Slot → Compatibility → Gap State)

| Layer | File | Change |
|---|---|---|
| Review (same slot/entity) | `build-answer-review.ts` | `isAnswerForOtherSlotsOnly(askedGapId, semantic)`: every fact key in the answer maps (via `FACT_KEY_TO_GAP`) to a gap other than the asked one. A CONTRADICTORY answer of that kind leaves the asked gap **OPEN**; the conflict stays on its own slot (`buildGapVerdicts` already marks that slot CONTRADICTED). It applies only to slot-owned asked gaps, so alias asks such as `solution` and `pricingHint`, and unmapped keys, keep the existing path. |
| Gap state (compatibility) | `update-gap-state-from-review.ts` | A CONTRADICTED record changes only when (a) the new verdict is CONTRADICTED again, or (b) this review extracted a fact for **that same gap** (`extractedFacts.some(f => f.targetGap === gapId)`): an explicit correction or a restated choice. Being the asked gap is not enough. CLOSED stays monotonic as before. |

There are no per-case patches, no business ids, and no holdout tuning. The design came from the Sprint 2 longitudinal pack only.

## Targeted tests — `__tests__/f11-contradiction-slot-grounding.test.ts` (16)

- Customer reversal on a competitor ask → `customerPersona` CONTRADICTED, asked gap OPEN, contradiction `gapId = customerPersona`.
- Customer reversal on a customer ask → still CONTRADICTED (same slot).
- A customer-only answer cannot close a CONTRADICTED `alternativesCompetitors`.
- A bare "B요" keeps the conflict open (no value, so no same-slot evidence).
- An explicit correction with the value resolves the conflict and carries evidence.
- CLOSED stays monotonic.
- Longitudinal replay over 10 businesses, turns 1–7: no CONTRADICTED → CLOSED transition without a same-slot fact, and at turn 5 the asked gap is not contradicted by another slot.

**Before the fix: 13/16 FAIL. After: 16/16 PASS.**

## Regression (before = `6d27393`, after = this branch; timestamps and ids stripped)

| Suite | Before | After |
|---|---|---|
| Unit (full `vitest run`) | 34 failed / 694 passed | 34 failed / 694 passed, **identical failing set** (pre-existing) |
| F11 targeted (new) | 3/16 | **16/16** |
| `f11-all-businesses` / `f04-evidence-regression` | PASS | PASS |
| Golden scenarios | 10/10 | 10/10, evidence JSON **identical** |
| Seed regression A–F | no failure signals | identical |
| Validation Engine completion pack (mini sandbox, scale ladder, failure mining, calibration) | — | **identical** |
| Before/After mining (`improvement-before-after.json`) | — | **identical** |
| Phase 3 confirm (`cpo-calibration-confirmed.json`) | summary table | summary identical; asked-gap state CONTRADICTED → OPEN in 40 turn states (36 `marketChannel`, 4 `alternativesCompetitors`) |
| Holdout biz-16 / biz-17 | 2 F11 mining hits (turn 5, customerPersona expectation) | same 2 hits; `marketChannel` CONTRADICTED → OPEN in 6 rows (side effect of the general rule; nothing tuned on holdout) |
| Longitudinal pack | — | asked gap CONTRADICTED → OPEN: 36 `alternativesCompetitors`, 24 `differentiationVsAlternatives`; the GT next-priority gap now points to that OPEN gap |
| Longitudinal adjudication | AI_PM 30 / EVAL 30 / GT 10 | **unchanged**. The auto-adjudicator only scores `customerPersona`, see below. |
| `next build` | — | PASS |

All metric changes go in the intended direction, and no Golden, Seed, or Holdout case regressed (STOP C not triggered).

## GT / adjudication reinterpretation (needs CPO confirmation)

The 20 auto `AI_PM_DEFECT` rows for `longitudinal_f11` turns 6–7 score **`customerPersona`**, which the GT expects to stay `CONFLICT` forever. At turn 6 the AI PM asks the A/B question and the user restates B with "이전 정의는 초기 가설", which is an explicit correction. Under the CPO rule this resolution is legitimate.
→ Proposed reclassification: these 20 rows become **GROUND_TRUTH_DEFECT** (the GT transition needs a "resolved by explicit correction" state). The defect that does exist on these turns, the asked gap closing at turn 7, is not measured by the adjudicator. It is now covered by the targeted test.

The holdout and mining F11 hits (`deterministic-evaluator`: contradiction behavior, turn ≥ 4, requires customerPersona CONTRADICTED) have the same cause: the user restates the value after the A/B question. This is an evaluator/GT issue, not an AI PM issue.

## Not changed / follow-up candidates (no fix without CPO confirmation)

1. **Asked-slot force-close (new candidate, not F11):** an OPEN asked gap is CLOSED by a VALID answer about another slot. Examples: `businessOneLiner` closed by "고객은 직장인입니다" at turn 1, `marketChannel` closed by a customer correction at turn 4, `alternativesCompetitors` closed by a customer sentence at turn 7. The same grounding rule applied broadly was measured: Golden, Seed, and Holdout were unchanged, but scale-ladder mining (F13 49 → 45), calibration alignment, and coverage shift, and `phase3-confirm` fails its fixed case-count assertion (50 → 40 cases). It needs its own GT and CPO decision.
2. A bare A/B reply ("B요") is not interpreted as a choice (`resolveContradictionChoice` exists but is unused in the loop). With this fix the conflict is preserved and asked again, where before it was silently lost.
3. Turn 3 "우리 팀은 8명, 본사는 판교" is extracted as `revenue`/`problem`/`buyer` depending on the asked slot (an off-slot extraction issue, related to F13).
