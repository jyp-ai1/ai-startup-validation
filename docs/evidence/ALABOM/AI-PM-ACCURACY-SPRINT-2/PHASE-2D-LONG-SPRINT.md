# Phase 2-D — Longitudinal stress and A–D candidate fixes

Draft PR: #78 (`cursor/sprint2-phase2d-long-sprint-e648` → `#77` / `cursor/sprint2-phase2c-repro-e648`).

CTO does not merge. Production is not deployed. CPO review is the merge gate. #73 Project Brief stays a separate stack.

## 1. PR stack

```
#74 F11
  → #75 Phase 2-A GT/Evaluator
    → #76 Phase 2-B F13
      → #77 Phase 2-C A–D reproduction
        → #78 Phase 2-D (this PR)
#73 Project Brief — separate
```

## 2. Commit SHAs (this branch)

See `git log cursor/sprint2-phase2c-repro-e648..HEAD`. Logical bundles:

| Bundle | Commit subject |
| --- | --- |
| Harness | longitudinal stress runner + User Agent / sandbox docs |
| C | full corrected value in X-not-Y |
| B | slot-aware repetition vs contradiction |
| A | asked gap unresolved without slot evidence |
| D2 | internal claim text out of questions |
| F16 | evaluator intent check (AI PM unchanged) |
| Pack | empty mining / F08 sample count contracts |

## 4. Unchanged V3 SoT

`buildAnswerReview` → `gapVerdicts` → `updateGapStateFromReview` → `decideNextQuestionFromReview` structure is unchanged. Production wrapper remains `resolveNextQuestionDecision`. No auth change.

## 5–6. Longitudinal scale

- Universe: 10 archetypes × 2 document styles (`st-*-1` structured, `st-*-2` prose).
- Behaviors mixed by the adaptive User Agent: sparse, normal, multi_fact, contradiction, correction, repetition, repetition_paraphrase, off_slot, uncertainty, overclaim, partial.
- Question order is the AI PM's actual next question (production `resolveNextQuestionDecision`).
- Lengths: 10 / 20 / 30 / 40. Some sessions end earlier when every Stage A+B required gap is CLOSED (`completed`).
- After A: 80 sessions, 1499 turns, 35 completed, 57 `L4_PREMATURE_STOP` (production path ended with a required gap still open — defect E, reproduce only).

## 7. AI PM defects (fixed this sprint)

| Code | Fix |
| --- | --- |
| C | Multi-token correction value (`중소 제조 CEO`); prefix stripped |
| B | Same-slot repetition / paraphrase is reinforcement; A/B still CONTRADICTED |
| A | No CLOSE/CONTRADICT of the asked gap without direct slot evidence |
| D2 | Questions never quote placeholder / field labels / field keys |

## 8. GT defects

Official `applyGroundTruthAnswer` no longer `closeSlot(asked)` on a customer-field correction or a no-slot-content answer (team size / HQ / "아직 대략적으로"). Same meaning as A.

## 9. Evaluator defects

F16 judged the next question by exact keywords (`검증|인터뷰|실험|증거`). The production validation ask has none of those words. Evaluator now matches slot meaning. Golden / longitudinal-pack AI fields identical vs D2. Holdout diffs are evaluator labels only (`question: PARTIAL → PASS`). F16 18→0 is **not** used as PASS evidence.

## 10. Harness defects

| Item | Change | Same-runtime 60-turn snap |
| --- | --- | --- |
| `구매 decision maker` | `구매를 결정하는 사람` | userInput 30/60 |
| `분산를` | `eulReul` | particle tests |
| Short sandbox docs | two-line readable prose, same facts | readable 12→60; question path 51/60 (document now readable — not AI PM tuning) |

`팀이 매일 사용`: user claim = 팀, `usageFrequency` = 매일. No `dailyUsage` gap.

## 11. Holdout (biz-16 / biz-17)

Holdout test EXIT=0 on every A–D / F16 bundle. No rule was written from a holdout row.

## 12. F11 / F13 / F04 / F16

- F11 all-businesses: EXIT=0
- F04 evidence: EXIT=0
- F13 claim tests: pass (particle string updated with harness)
- F16: evaluator-only; AI output identical on golden + long-pack vs D2

## 13. A–D

| Candidate | Result |
| --- | --- |
| C | PASS — Phase 2-C pin is `it` |
| B | PASS — A/A/A, A/A′, A/B |
| A | PASS — Phase 2-C pins are `it`; GT aligned |
| D2 | PASS — pins are `it` |
| D1 | HOLD — question leak is D2; whether a Production document stores the unreadable claim is harness investigation, not asserted as a Production AI PM defect |

## 14. Production

Not deployed. SHA alignment gate is not opened.

## 15. Remaining known defects

- **E — premature stop:** `applyNoGapTermination` / `hasNoAskableGap` ignores never-asked required gaps. Stress records `L4_PREMATURE_STOP` and continues via the raw V3 decider. Not patched (new high-impact stop; CPO approval required).
- D1 HOLD (short-doc placeholder as a living claim).
- Pre-existing unit pin set: 34 failures, same titles as the F13 baseline.
- Stress L4_PRIORITY_SKIP / residual L2 findings: mix of alias-gap asks (pricingHint/solution while Stage A open) and remaining evaluator/harness disagreement — adjudicate, do not auto-patch.

## 16. CEO review items

None until CPO Review 1–3. CEO use-test is after Production Gate, not this PR.
