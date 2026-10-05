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

## CPO 2-Pass 2 — canonical state (not UI / memory alone)

Independent file: `recovery2-p0-1-2pass2-canonical-state.test.ts`

Asserts `review.extractedFacts`, `gapState.evidence`, `living.spine`, and `snapshot.aiPmLoop` after each action.

| # | Check | Result |
|---|-------|--------|
| 1 | Explicit edit rebuilds gapState and drops prior `방한 외국인` review evidence | PASS |
| 2 | Next payer turn cannot overwrite correction with AI inference | PASS |
| 3 | CLOSED stays CLOSED on next turn; explicit edit is the only reopen | PASS |
| 4 | refresh → snapshot → cache → hydrate keeps gapState/review/living | PASS |
| 5 | Customer correction does not contaminate payer/problem/business | PASS |
| 6 | Golden / F11 / F04 re-run | PASS / PASS / PASS |

F13: no dedicated `f13*.test.ts` on main. core-v4 multi-fact keys PASS. Two wrong-slot tests fail on Production `36b241e` unchanged by this PR.

Browser spec now also reads `aiPmLoop.gapState` evidence, not only `conversationMemory`.

## Production STOP Recovery (f8f13cf)

**Branch:** `cursor/p0-1-business-confirm-slot-e648`

Confirmed first-write path:

```text
handleConfirmYes
  → submitAnswer(confirmKnownValue = clipped source)
  → inferTargetGapFromQuestionText("제가 이해한 사업은 … 맞나요?") = null  (before fix)
  → interpretAnswerSemantics scoreRoutes(관광객) → factKey=customer
  → answer-first skip of business honor
  → buildAnswerReview extractedFacts.customer = source
  → gapVerdicts.customerPersona = CLOSED
```

Fix (no SoT / priority / schema change):

- `isBusinessUnderstandingConfirmQuestion` + infer bind → `businessOneLiner`
- interpret honors asked `businessOneLiner` as `business` (incidental `관광객` does not steal)
- canonicalizeSubmitSemantics keeps Confirm Yes on `businessOneLiner`
- submitAnswer falls back to `confirmGapId` when infer is stale

J6–J8 in `recovery2-p0-1-state-edit-confirm.test.ts`.

## J6 next-question evidence (`d9df613`)

Confirm Yes first write (clipped source / known value):

| Probe | Value |
|-------|--------|
| `askedGap` | `businessOneLiner` |
| `factKey` | `business` |
| `answerKind` | `business_fact` |
| `review.extractedFacts` | `business` only |
| `gapState.businessOneLiner` | CLOSED |
| `gapState.customerPersona` | OPEN (absent from closed set) |

`decideNextQuestionFromReview` already returns `customerPersona` / `이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?`.

Cluster policy had hard-replaced that OPEN Stage A gap with `payer` because both sit in C1. Soft-penalty contract restored for Stage A required OPEN gaps.

After the policy fix, resolved next is `customerPersona`.

## Preview-equivalent E2E (`219007d`)

Local `next start` of branch SHA (Vercel Preview is SSO-walled).

| Spec | Result |
|------|--------|
| J6 business Confirm Yes leaves customerPersona OPEN | PASS 16.7s |
| J1–J5 confirm, remount, CLOSED hold, edit prior | PASS 25.2s |
| J6–J8 on-slot customer write after Confirm Yes | PASS 17.1s |
| **Suite** | **3 passed / 59.6s** |

Forbidden path blocked: 사업 원문 `관광객` is not extracted into `customerPersona` / CLOSED.

## CPO 2-Pass 1

Independent vs `origin/main`: product diff is first-write slot routing + Stage A cluster soft-penalty only.

| Check | Result |
|-------|--------|
| Auth / `update-session` | unchanged |
| DB schema / analytics migration | unchanged |
| V3 SoT / `decideNextQuestionFromReview` | unchanged |
| Post-hoc customer reopen | absent |
| `confirmGapId` authoritative | loop-panel fallback + infer bind to `businessOneLiner` |

## CPO 2-Pass 2

`recovery2-p0-1-2pass2-canonical-state.test.ts` + J1–J8 unit + J6 probe: **14 passed**.

## Events

Existing `recordFunnelEvent()` convention. Added only missing names:

- `business_understanding_confirmed`
- `business_understanding_corrected`
