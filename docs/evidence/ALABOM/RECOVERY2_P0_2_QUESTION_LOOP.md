# Recovery 2 P0-2 — Question Loop

**Branch:** `cursor/recovery2-p0-2-question-loop-e648`  
**Base:** Production `64c8882` (PR #86 P0-1 CLOSED)  
**Isolated from:** P0-1 first-write slot routing · PR #84 no-gap Draft

P0-1 PASS is not question-accuracy PASS. This file records the five CPO gates only.

## Frozen

Auth · DB schema · `buildAnswerReview` meaning · `updateGapStateFromReview` CLOSED monotonicity · Stage ③/④ · PDF · CEO test

## Trace

```text
Answer
 → buildAnswerReview
 → gapVerdicts
 → updateGapStateFromReview
 → gapState
 → evaluateStageReadiness
 → decideNextQuestionFromReview
 → applyQuestionPolicy / No-Ask / anti-repeat
 → lastDecision
```

`decideNextQuestionFromReview` Stage A required order:

`businessOneLiner → customerPersona → payer → problemJtbd`

Missing gap = OPEN (`isGapAskable`). CLOSED is not a candidate.

## Unit J1–J5

`recovery2-p0-2-question-loop.test.ts` on Production path (양조장 source).

| ID | Gate | Result |
|----|------|--------|
| J1 | After Confirm Yes, next = customerPersona | PASS |
| J2 | CLOSED business/customer never retargeted | PASS |
| J3 | Source `관광객` does not close customer; customer write does not close payer/problem | PASS |
| J4 | On-slot 방한→내국인 correction does not reopen customer as next ask | PASS |
| J5 | Longitudinal Stage A walk keeps CLOSED; source never lands in customer evidence | PASS |

No product change required for these five contracts on `64c8882`. This PR is the independent verification harness, not a priority rewrite.

## Preview-equivalent E2E

Local `next start` of branch SHA.

| Spec | Result |
|------|--------|
| J1–J3 priority, no CLOSED re-ask, no multi-fact steal | PASS 23.4s |
