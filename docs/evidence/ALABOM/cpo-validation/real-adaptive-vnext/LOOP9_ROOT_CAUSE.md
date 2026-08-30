# Loop 9 — Unit PASS / Live FAIL Root Cause (@ a9ebd63 → 0dc4ba9)

## Divergence summary

| Layer | T12 submit | wrong-slot detect | Next Q after T12 |
|-------|------------|-------------------|------------------|
| **Unit (Loop 8)** | `targetGap: customerPersona` | ✓ P0-1 | `customerPersona` re-ask |
| **Live @ a9ebd63** | `targetGap: validationTestability` (poisoned) | ✗ null (same-slot) | `problemJtbd` ❌ |

## Root cause (Loop 9a/9b)

1. **T11** — validation plan on `validationTestability` ask → `interpretAnswerSemantics` returns `mergeable: false`, `quality: PARTIAL`.
2. Panel **non-mergeable path** sets `questionOverride` with `targetGap: validationTestability` and **returns without append**.
3. **T12** — UI re-ranks to `customerPersona`, but stale override / append ordering poisoned `targetGap` on some paths.
4. Loop 9b post-append pin fixed **T11→T12** (first hop) but **React `questionOverride` lifecycle** did not sustain across `finishProcessing` / consecutive appends (T12→T13, T13→T14).

### Loop 9b additional root cause

- **`overrideStale` gate** could discard `wrong_slot` when `base.targetGap !== override.targetGap` and prior persona asks ≥ `MAX_SAME_GAP_ASKS_BEFORE_YIELD` (live BANK prefix includes persona correction @ T10).
- **`setQuestionOverride(null)`** cleared pin before re-resolve on mergeable append; remount/reanalyze dropped state before next display cycle.
- **`finishProcessing`** never re-pinned wrong_slot from persisted turns after phase transition.

## Loop 9c fix (minimal)

| File | Change |
|------|--------|
| `workspace-ai-pm-loop-panel.tsx` | `useEffect` re-sync `questionOverride` from `resolveWrongSlotQuestionOverride(turns)` on every turn change; re-pin in `finishProcessing`; `wrong_slot` exempt from `overrideStale`; defer clear until post-append re-resolve; `wrong_slot` override authoritative on submit |
| `resolve-missing-field-priority.ts` | `answeredGaps.delete('problemJtbd')` + `isGapSatisfiedInMemory` guard for P0-2 wrong-slot persona merge |

## Loop 9d fix (@ ba2b25c live FAIL)

**Root cause:** Append path poisoned `targetGap` with ranked gap (`problemJtbd`/`solution`) while UI showed persona/problem ask. `detectWrongSlotMergeContext` credited wrong-slot delta (closedGap correct) but `resolveWrongSlotQuestionAnchor` required `askedGap === customerPersona|problemJtbd` — anchor returned null → ranked display won post-`finishProcessing`.

| File | Change |
|------|--------|
| `wrong-slot-priority.ts` | `resolveWrongSlotReaskGap()` maps `closedGap → re-ask gap`; anchor uses closed-gap SoT (poisoned askedGap tolerated) |
| `resolve-missing-field-priority.ts` | Unified reask boost + `answeredGaps.delete(reaskGap)` via `resolveWrongSlotReaskGap` |
| `resolve-asked-target-gap.ts` | `inferAskedTargetGapFromTurn` prefers `askedQuestionText` before poisoned `targetGap` |
| `workspace-ai-pm-loop-types.ts` | `askedQuestionText` on turn (display SoT at submit) |
| `workspace-ai-pm-loop-panel.tsx` | Persist `askedQuestionText`; never clear `wrong_slot` override on append; atomic finishProcessing issue patch |

## Panel path (actual next-Q SoT)

```
submitAnswer
  → resolveAskedTargetGapForAppend (questionText first)
  → appendAiPmLoopTurn(targetGap + askedQuestionText)
  → resolveWrongSlotQuestionOverride(projectedTurns) → setQuestionOverride(wrong_slot)
  → startProcessing → finishProcessing
  → resolveWrongSlotQuestionOverride(turns) → re-pin override + currentIssueId (single sync)
finishProcessing → phase issue → whyThisQuestionNow useMemo
  → resolveWrongSlotQuestionOverride(freshTurns) FIRST (turns SoT, not ranked)
  → useEffect sync override from turns (survives remount)
```

## Unit verification

- **54/54 PASS** incl. Loop 9d poisoned `targetGap` (P0-1 problemJtbd→persona, P0-2 solution→problem)

## Live verification

| SHA | P0-1 T12→T13 | P0-2 T13→T14 | reAsk | Notes |
|-----|--------------|--------------|-------|-------|
| `a9ebd63` (baseline) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 2 | pre-Loop 9 |
| `4ad9e76` (Loop 9a) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 0 | append fix alone insufficient |
| `0dc4ba9` (Loop 9b) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 0 | T11→T12 persona pin ✓; multi-hop chain broken |
| `ba2b25c` (Loop 9c) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 0 | 52/52 unit PASS; delta detects wrong-slot but display ranks problem/solution |
| `18c032f` (Loop 9d-a) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 0 | closedGap re-ask anchor; same-slot poison not yet detected |
| `1537c00` (Loop 9d-b) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | 0 | same-slot remap + lastAskSurfaceRef; capture @ 1537c00 still ranked |
| `cbce256` (Loop 9d-c) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | **6** | BANK diffRelevance cues + decideNextQuestion SoT; T11→T12 persona ✓; unit/live gap persists |

## Loop 9e fix (shipped @ `940800e`, live verify Loop 9e-b)

**Root cause confirmed (@ cbce256):** Live turns stored `semanticFactKey: customer` (not `diffRelevance`) when persona ask received BANK.diffRelevance — interpret ran with poisoned `targetGap: problemJtbd`, so `detectWrongSlotMergeContext` saw same-slot merge (`customerPersona` closed) and returned null. Ranked path won post-`finishProcessing`.

| File | Change |
|------|--------|
| `wrong-slot-priority.ts` | Loop 9e — `effectiveAskedGapFromTurn` (question text first); remap stored `customer` + BANK diffRelevance cues → `diffRelevance`; extend poisoned `problemJtbd` same-slot remap |
| `workspace-ai-pm-loop-panel.tsx` | Display SoT canonicalize semantic at submit (persona→diffRelevance, problem→customer, solution→business); finishProcessing skips ranked `issue` phase → `answer` when wrong-slot override active |
| `core-final-stabilization.test.ts` | Loop 9e — cbce256 live shapes (`customer` key + poisoned targetGap, no askedQuestionText) |

## Verdict (@ `cbce256` live capture — Loop 9d-c)

**CPO PASS: No** — P0-1 AND P0-2 remain live FAIL on capture @ `cbce256`.

**Root cause confirmed (unchanged shape):** T12 persona ask + `BANK.diffRelevance` → display ranks `problemJtbd` (not persona re-ask). T13 problem ask + persona wrong-slot → display ranks `solution` (not problem re-ask). Unit tests with constructed poisoned turns PASS; live demo localStorage path still diverges.

**Loop 9d-c shipped:** same-slot poison via BANK answer cues (no `askedQuestionText` required) + `decideNextQuestion` as panel display SoT. **56/56 unit PASS.** Live capture @ `cbce256`: harness PASS · T11→T12 persona pin ✓ · reAsk=6 (solution loop T14–T19) · P0-3/4/5 PASS.

## Loop 9e-b live (@ `940800e`)

| SHA | P0-1 T12→T13 | P0-2 T13→T14 | reAsk | Notes |
|-----|--------------|--------------|-------|-------|
| `940800e` (Loop 9e) | **FAIL** → `problemJtbd` | **FAIL** → `solution` | **6** | Unit 59/59 PASS; canonicalize credits `validationTestability` not `customer` key — wrong-slot anchor still null live |

## Loop 9f fix (@ 940800e live FAIL — append/display path)

**Root cause (@ 940800e):** Unit tests passed cbce256-shaped poison turns but live demo path diverged: `submitAnswer` preferred stale `lastAskSurfaceRef` over `whyThisQuestionNow` for `askedQuestionText`; `finishProcessing` ran `applyLoopProcessingTransition(phase: issue)` before wrong-slot pin, clearing override via ranked display. Same-slot poison (`diffRelevance` + `validationTestability` targetGap) returned null from semantic detection when UI showed persona.

| File | Change |
|------|--------|
| `wrong-slot-priority.ts` | Loop 9f — `resolveNuclearWrongSlotBypass` / `resolveNuclearWrongSlotAtSubmit`; fallback when semantic same-slot; `hasPendingWrongSlotReask` blocks solution |
| `workspace-ai-pm-loop-panel.tsx` | Display SoT: `whyThisQuestionNow` before ref; nuclear canonicalize at submit; persist `askedQuestionText` fallback; wrong-slot before `applyLoopProcessingTransition` |
| `question-decision-engine.ts` | Block `solution` when `hasPendingWrongSlotReask` |
| `core-final-stabilization.test.ts` | Loop 9f — exact @940800e T12/T13 turn shapes |
| `_cpo-real-adaptive-prod-capture.spec.ts` | EPERM-safe persist (write + copy fallback) |

## Loop 9f-b live (@ `b2fc5d9`)

| SHA | P0-1 T12→T13 | P0-2 T13→T14 | reAsk | Gate | Notes |
|-----|--------------|--------------|-------|------|-------|
| `b2fc5d9` | **FAIL** → `problemJtbd` | **FAIL** → `solution` | **0** | PASS | same-slot nuclear + ref sync; journey completes; delayed persona re-ask @ T14→T15 |

## Verdict (@ `b2fc5d9` live capture — Loop 9f)

**CPO PASS: No** — P0-1 AND P0-2 immediate next-Q transitions still FAIL; reAsk=0 + gate probe PASS + unit 64/64 PASS.
