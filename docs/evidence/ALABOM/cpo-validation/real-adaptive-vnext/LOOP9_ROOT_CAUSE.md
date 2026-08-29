# Loop 9 — Unit PASS / Live FAIL Root Cause (@ a9ebd63)

## Divergence summary

| Layer | T12 submit | wrong-slot detect | Next Q after T12 |
|-------|------------|-------------------|------------------|
| **Unit (Loop 8)** | `targetGap: customerPersona` | ✓ P0-1 | `customerPersona` re-ask |
| **Live @ a9ebd63** | `targetGap: validationTestability` (poisoned) | ✗ null (same-slot) | `problemJtbd` ❌ |

## Root cause

1. **T11** — validation plan on `validationTestability` ask → `interpretAnswerSemantics` returns `mergeable: false`, `quality: PARTIAL` (no diff-relevance evidence).
2. Panel **non-mergeable path** sets `questionOverride` with `targetGap: validationTestability` and **returns without append**.
3. **T12** — UI re-ranks to `customerPersona` (display ignores stale override when `override.targetGap !== base.targetGap`), but **`submitAnswer` still passed `questionOverride.targetGap` first** to `resolveAskedTargetGapForAppend`.
4. Loop 8 ordering had **override before questionText** → T12 persisted as `validationTestability` + `diffRelevance` → **same-slot**, not wrong-slot → `resolveWrongSlotQuestionAnchor` never fired.
5. **P0-2 cascade** — engine jumped to `problemJtbd` then `solution` while `problemJtbd` still open.

## Panel path (actual next-Q SoT)

```
submitAnswer
  → resolveAskedTargetGapForAppend (BUG: stale override)
  → appendAiPmLoopTurn(targetGap)
  → startProcessing → runLoopAnswerProcessing
  → resolveNextLoopIssue → resolveNextIssueByMissingField
  → resolveWrongSlotQuestionAnchor (never fired when targetGap poisoned)
finishProcessing → phase issue → whyThisQuestionNow useMemo
  → getWhyThisQuestionNow → resolveWrongSlotQuestionOverride
```

**Not** `decideNextQuestion` on the live panel path.

## Minimal fix (Loop 9)

| File | Change |
|------|--------|
| `resolve-asked-target-gap.ts` | **questionText inference before override** — visible ask is ground truth |
| `workspace-ai-pm-loop-panel.tsx` | Pass only **active** override when `override.targetGap === displayedGap`; use displayed question text |

## Unit verification

- **49/49 PASS** incl. Loop 9 stale-override regression + live-fail reproduction test (`targetGap: validationTestability` → next `problemJtbd`).
- Live capture pending deploy.
