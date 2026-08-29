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
| Loop 9d | pending capture | pending capture | — | poisoned-targetGap anchor + askedQuestionText SoT |

## Verdict (@ `ba2b25c` live — Loop 9c)

**CPO PASS: No** — P0-1 AND P0-2 remain live FAIL.

**Loop 9d shipped:** closed-gap re-ask anchor bypasses poisoned `targetGap`; display SoT from turns on every render. **Pending:** one live capture post-deploy.
