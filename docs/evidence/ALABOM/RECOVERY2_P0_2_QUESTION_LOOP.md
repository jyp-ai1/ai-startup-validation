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
| J1–J3 + J5 longitudinal after customer CLOSED | PASS 25.4s (`ca703fa`) |

Forbidden path blocked: after customer CLOSED, next Stage A write does not retarget `customerPersona` / `businessOneLiner` and does not write 사업 원문 into customer evidence.

## CPO 2-Pass 1

Independent vs `origin/main` @ `ca703fa`. Product files unchanged.

| Check | Result |
|-------|--------|
| Auth / `update-session` | unchanged |
| DB schema / analytics migration | unchanged |
| V3 SoT / `decideNextQuestionFromReview` | unchanged |
| Product first-write / cluster policy | unchanged (P0-1 closed) |
| Product files in PR | none — tests + evidence only |

## CPO 2-Pass 2

Independent file: `recovery2-p0-2-2pass2-canonical-state.test.ts` — **5 passed**.

Asserts `review.askedGapId`, `semanticFactKey` / `intent`, `gapState`, `lastDecision.targetGapId`, and `snapshot.aiPmLoop` — not `conversationMemory` or UI copy.

| # | Check | Result |
|---|-------|--------|
| 1 | Confirm Yes review/gapState/lastDecision stay on business → customer | PASS |
| 2 | customer CLOSED then lastDecision = first remaining OPEN Stage A | PASS |
| 3 | next Stage A write cannot reopen CLOSED customer or rewrite source | PASS |
| 4 | snapshot → hydrate keeps lastDecision and CLOSED | PASS |
| 5 | on-slot correction does not retarget lastDecision to CLOSED customer | PASS |

Also re-ran P0-2 J1–J5 unit + P0-1 J1–J8 + 2-Pass 2 + J6 probe: **24 passed**.

## Production SHA triangle + J1–J5 (`1394a8d`)

| Source | SHA |
|--------|-----|
| Git `origin/main` | `1394a8d4403ebb9d2eeba443e5b05e29ae8364ae` |
| Vercel Production deploy | `1394a8d4403ebb9d2eeba443e5b05e29ae8364ae` |
| `GET /api/build-info` | `1394a8d4403ebb9d2eeba443e5b05e29ae8364ae` |

Production E2E against https://ai-startup-validation-tau.vercel.app:

| Spec | Result |
|------|--------|
| J1–J3 + J5 + remount hydrate after customer CLOSED | PASS 30.7s |

Production hydrate contract:

```text
Confirm Yes → lastDecision = customerPersona · customer OPEN
방한 외국인 → customerPersona CLOSED
lastDecision = remaining OPEN Stage A (payer | problemJtbd)
reload → snapshot.aiPmLoop hydrate
customerPersona stays CLOSED
lastDecision unchanged
customer evidence = 방한 외국인
사업 원문 관광객 not in customer evidence
```

CEO test stays closed until CPO Production Acceptance.
