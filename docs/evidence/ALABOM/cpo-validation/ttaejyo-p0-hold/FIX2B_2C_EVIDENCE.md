# TTAEJYO FIX 2b + FIX 2c — Evidence

**Date:** 2026-08-31 KST  
**Scope:** CPO-approved only — durable question lock + post-commit persist  
**Out of scope:** FIX 3/4/5, remount key change, ranking engine, payer skip/delete

---

## Summary

| Fix | Change | Target writers |
|-----|--------|----------------|
| **FIX 2b** | `lockedAskSurface` persisted in `sessionStorage` via `AiPmLoopState`; restore on mount/resync; hydrate merge honors lock | W3, W4, W9, W10, W14 |
| **FIX 2c** | `onDocumentUpdated` / `persistWorkspaceStateDbFirst` deferred until `finishProcessing` after `commitQuestionLock(B)` | W12, W5 |

---

## Code changes

### FIX 2b — Durable lock

1. **`workspace-ai-pm-loop-types.ts`** — added `lockedAskSurface?: LockedAskSurface | null` to `AiPmLoopState`
2. **`question-transition-lock.ts`** — `hasPersistedQuestionTransitionLock`, `mergeAiPmLoopHonoringQuestionLock`
3. **`apply-workspace-snapshot.ts`** — merge + `shouldApplyDbSnapshot` gate when lock active and DB would regress `currentIssueId`
4. **`workspace-ai-pm-loop-panel.tsx`**
   - Initialize lock from sessionStorage on mount
   - `commitQuestionLock` / `clearQuestionLock` write via `patchAiPmLoopState`
   - `useLayoutEffect` resync restores lock after hydrate (replaces mount-time clear)

### FIX 2c — Post-commit persist

1. **`workspace-ai-pm-loop-panel.tsx`**
   - Removed `onDocumentUpdated` from `submitAnswer` (was firing before `finishProcessing`)
   - Added `onDocumentUpdated` at end of `finishProcessing` (after `commitQuestionLock`)
   - Contradiction path also defers persist (uses `startProcessing` → `finishProcessing`)

---

## Integration test (required gate)

**File:** `apps/web/features/workflow-journey/lib/business-understanding/__tests__/question-transition-persist-remount.test.ts`

| Scenario | Assertion |
|----------|-----------|
| A submit → B committed → stale persist/hydrate/remount | Visible question === B (`payer`), not A |
| B visible + typing lock → remount/hydrate | B remains |
| `mergeAiPmLoopForHydrate` equal turns + stale DB | Lock B + `currentIssueId: bm_design` preserved |

---

## Regression

From `apps/web/` @ 2026-08-31T17:26 KST:

| Suite | Result |
|-------|--------|
| `question-transition-lock` | 5/5 PASS |
| `question-transition-persist-remount` | **3/3 PASS** (new) |
| `ttaejyo-p0-hold` | 10/10 PASS |
| `ceo-second-loop` | 10/10 PASS |
| `ceo-persona-loop` | 1/1 PASS |
| `core-final-stabilization` | 78/78 PASS |
| **Total** | **107/107 PASS** |

---

## Production verification

- **Commit SHA:** _(filled after push)_
- **Production SHA:** _(filled after /api/build-info poll)_
- **CEO Production test:** NOT RUN (per gate — document deploy SHA only)

---

## Expected Production behavior

1. User answers A → thinking ~400ms → B renders + lock B persisted to sessionStorage
2. Persist fires **after** finishProcessing → snapshot includes payer `currentIssueId` + lock B
3. Revalidate/remount ~1–2s later → hydrator merge honors lock → B stable (no A regression)
