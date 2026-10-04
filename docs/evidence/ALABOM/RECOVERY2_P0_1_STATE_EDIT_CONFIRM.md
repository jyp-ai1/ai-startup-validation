# Recovery 2 P0-1 — State / Edit / Confirm

**Branch:** `cursor/product-journey-recovery2-p0-1-e648`  
**Base:** Production `36b241e`  
**Isolated from:** PR #84 Draft (`cursor/production-j3-question-loop-rca-e648`)

## Trace (no SoT redesign)

Confirmed Production path:

```text
Answer
 → buildAnswerReview
 → gapVerdicts
 → updateGapStateFromReview
 → gapState
 → evaluateStageReadiness
 → decideNextQuestionFromReview
 → lastDecision
 → CEO 6 Surfaces
 → hydrate/remount
```

Auth, V3 SoT, Gap/Readiness/Question-priority semantics, and DB schema were not changed.

## Minimal reuse

| Need | Existing function reused |
|------|--------------------------|
| Correction parse | `parseNotXButYCorrection`, `extractCorrectedFactValue` |
| Confirm → first ask | `commitFirstAskAfterUnderstandingConfirm` |
| Review + gap | `appendLoopTurnWithReview` → `updateGapStateFromReview` |
| Memory | `buildConversationMemoryFromSources`, `applyUserCorrection` |
| Hydrate | `hydrateAiPmLoopState` (now wired in `applyWorkspaceSnapshotToCache`) |
| Edit prior | `supersedeTurnAndInvalidateDownstream` + gap replay via `aggregateGapState` |

## J1–J5

Automated in `recovery2-p0-1-state-edit-confirm.test.ts` (engine) and `e2e/recovery2-p0-1-state-edit-confirm.spec.ts` (browser).

| ID | Result |
|----|--------|
| J1 Source ≠ AI interpretation, confirm → next question | PASS (unit) |
| J2 `방한 외국인` → `내국인·외국인` | PASS (unit) |
| J3 refresh keeps the same value | PASS (unit) |
| J4 next turn cannot reopen CLOSED | PASS (unit) |
| J5 edit prior saves and remounts the new value | PASS (unit) |

## Events

Existing `recordFunnelEvent()` convention. Added only missing names:

- `business_understanding_confirmed`
- `business_understanding_corrected`
