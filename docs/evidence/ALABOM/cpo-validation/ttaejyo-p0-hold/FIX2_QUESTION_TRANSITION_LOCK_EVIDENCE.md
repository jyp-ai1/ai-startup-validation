# FIX 2 — Question Transition Lock Evidence

**Date:** 2026-08-31 KST  
**Scope:** TTAEJYO FIX 2 ONLY — block B→A race during USER_TYPING / submit / processing  
**Production URL:** https://ai-startup-validation-tau.vercel.app

---

## Problem (RCA ref)

After A→B forward path, async `revalidatePath` → `workspaceSnapshotUpdatedAt` change triggers `useLayoutEffect` resync → `whyThisQuestionNow` / `decideNextQuestion` recomputes from stale `sessionStorage` turns while user types on B → Question A reappears.

See: `P0_RACE_CONDITION_REINVESTIGATION.md`

---

## Fix design

| Mechanism | Implementation |
|-----------|----------------|
| **Lock activation** | First keystroke or textarea `onFocus` → `captureLockedAskSurface` pins `{ targetGap, questionText, issueId, whyNow }` |
| **Lock honored** | `whyThisQuestionNow` + `displayQuestionText` return locked surface when `isQuestionTransitionLockActive` |
| **Submit/processing** | Lock retained through `reanalyze` phase until `finishProcessing` commits next question |
| **Next commit** | `finishProcessing` → `commitQuestionLock` with `decideNextQuestion` result (Question B) |
| **Stale writers blocked** | wrong_slot `useEffect` skips when `shouldRejectStaleAskSurfaceUpdate` vs committed lock |
| **No generationId** | Uses existing `targetGap` + `questionText` identity only |

---

## Changed files

| File | Change |
|------|--------|
| `apps/web/features/workflow-journey/lib/business-understanding/question-transition-lock.ts` | **NEW** — pure lock helpers |
| `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx` | Lock state, guarded display SoT, finishProcessing commit |
| `apps/web/features/workflow-journey/lib/business-understanding/__tests__/question-transition-lock.test.ts` | **NEW** — 5 regression cases |

---

## Regression tests

From `apps/web/` @ 2026-08-31T15:00 KST:

| Suite | Result |
|-------|--------|
| `pnpm test ttaejyo-p0-hold` | 10/10 PASS |
| `pnpm test question-transition-lock` | 5/5 PASS |
| `pnpm test ceo-second-loop` | 10/10 PASS |
| `pnpm test ceo-persona-loop` | 1/1 PASS |
| `pnpm test core-final-stabilization` | 78/78 PASS |
| **Total** | **104/104 PASS** |

### FIX 2 cases covered

1. A typing + stale snapshot → A maintained  
2. A typing + revalidate simulation → A maintained  
3. A submit → processing → B transition OK  
4. B rendered + stale A callback → B maintained  
5. Stale engine text does not override committed B lock display  

---

## Out of scope (NOT implemented)

- FIX 3 (edit epoch)
- FIX 4 (commit-ack processing)
- FIX 5 (generationId / loopEpoch)
- Payer/ranking/spine changes
- Fake delay/setTimeout masking
- Input-disabled-only masking

---

## Production verification

| Field | Value |
|-------|-------|
| Fix commit | _(filled after push)_ |
| Live Production SHA | _(filled after poll)_ |
| CEO manual test | **NOT RUN** — deploy SHA documented only |
