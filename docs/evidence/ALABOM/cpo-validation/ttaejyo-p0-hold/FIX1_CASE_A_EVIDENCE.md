# FIX 1 CASE A — Payer Infinite Loop (Hydration Authority)

**Date:** 2026-08-31 KST  
**Scope:** FIX 1 ONLY — hydration / persistence authority for payer repeat on resume/revalidate  
**Production:** NOT VERIFIED (no deploy in this pass)

---

## Problem (RCA summary)

After `고객이요` at payer ask on **resume**, `getAnsweredTargetGaps(turns)` lacked `payer` because post-answer `revalidatePath` / ungated `bootstrapWorkspaceFromDb` overwrote sessionStorage `aiPmLoop.turns` with a stale DB snapshot missing the buyer-closing turn. Loop panel resync ran only on `[projectId]`, so React state could lag overwritten sessionStorage.

**First divergence:** Step ③ — gap CLOSED false (`payer` ∉ answered set)  
**Root layer:** Step ⑧ — persistence authority (multiple ungated writers)

---

## FIX 1 principles applied

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | DB durable state authoritative on resume | `shouldApplyDbSnapshot` applies DB when client cache empty |
| 2 | Stale sessionStorage cannot overwrite DB | Timestamp + turn-count gate on apply |
| 3 | After hydration, sync loop once authoritatively | Loop panel `useLayoutEffect` deps include `workspaceSnapshotUpdatedAt` |
| 4 | After revalidate, maintain same authority | `mergeAiPmLoopForHydrate` + `shouldApplyDbSnapshot` blocks stale DB |
| 5 | Post-answer hydration must NOT restore payer-open | `isClientLoopAheadOfDb` — client wins when more turns or newer `appliedAt` |

---

## Changed files

| File | Change |
|------|--------|
| `apps/web/features/workspace/lib/apply-workspace-snapshot.ts` | Added `isClientLoopAheadOfDb`, `mergeAiPmLoopForHydrate`; gated `shouldApplyDbSnapshot`; merge on apply; avoid heavy import chain for tests |
| `apps/web/features/workspace/lib/bootstrap-workspace-from-db.ts` | Route through `shouldApplyDbSnapshot` before cache write |
| `apps/web/features/workspace/components/workspace-persisted-hydrator.tsx` | (unchanged — already gated) |
| `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx` | Resync deps: `workspaceSnapshotUpdatedAt` |
| `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx` | Pass `workspaceSnapshotUpdatedAt` prop |
| `apps/web/features/workflow-journey/components/v2/v2-strategy-workspace.tsx` | Pass `initialWorkspaceSnapshot?.updatedAt` |
| `apps/web/features/workflow-journey/lib/business-understanding/__tests__/ttaejyo-p0-hold.test.ts` | +4 FIX 1 regression tests |

**NOT changed (FIX 2–5 out of scope):** edit epoch, question lock, processing gate, generation tokens, payer skip/forced close.

---

## State trace — BEFORE / ACTION / AFTER

### Scenario: Resume → payer Q → submit `고객이요` → revalidate with stale DB

#### BEFORE (client after submit, pre-revalidate)

| Field | Value |
|-------|-------|
| `aiPmLoop.turns.length` | 3 (includes buyer @ payer) |
| Last turn `semanticFactKey` | `buyer` |
| Last turn `targetGap` | `payer` |
| `getAnsweredTargetGaps` | includes `payer` |
| `currentQuestion` (engine) | ≠ payer |

#### ACTION

1. User submits `고객이요` → `appendAiPmLoopTurn` (buyer, targetGap=payer)
2. `persistWorkspaceStateDbFirst` → `revalidatePath('/workspace')`
3. Server returns stale snapshot (2 turns, no buyer) — simulates race / lagging DB
4. `WorkspacePersistedHydrator` / `bootstrapWorkspaceFromDb` receive stale snapshot

#### AFTER (pre-fix — FAIL)

| Field | Value |
|-------|-------|
| `aiPmLoop.turns.length` | 2 (buyer turn lost) |
| `getAnsweredTargetGaps` | **`payer` absent** |
| `decideNextQuestion` | re-selects payer |
| `currentQuestion` | `누가 비용을 지불합니까?` again |

#### AFTER (post-fix — PASS in unit simulation)

| Field | Value |
|-------|-------|
| `shouldApplyDbSnapshot(stale)` | `false` |
| `mergeAiPmLoopForHydrate` | keeps client 3-turn loop |
| `aiPmLoop.turns.length` | 3 |
| `getAnsweredTargetGaps` | includes `payer` |
| Last turn `semanticFactKey` | `buyer` |

---

## Test results

From `apps/web/` @ 2026-08-31T12:32 KST:

| Suite | Result |
|-------|--------|
| `pnpm test ttaejyo-p0-hold` | **10/10 PASS** (+4 FIX 1 tests) |
| `pnpm test ceo-second-loop` | **10/10 PASS** |
| `pnpm test ceo-persona-loop` | **1/1 PASS** |
| `pnpm test core-final-stabilization` | **78/78 PASS** |
| **Total** | **99/99 PASS** |

### New regression tests (FIX 1)

- `post-answer revalidate: stale DB snapshot does not restore payer-open turns`
- `resume hydrate: empty client cache accepts DB turns with payer still open`
- `bootstrapWorkspaceFromDb respects shouldApplyDbSnapshot gate when client is ahead`
- `고객이요 at payer closes payer before and after simulated revalidate`

---

## Production verification

| Check | Status |
|-------|--------|
| Deploy fix to Production | **NOT DONE** (this pass) |
| Resume auth QA storage refresh | **NOT VERIFIED** |
| CASE A: payer repeat = 0 on Production resume | **NOT VERIFIED** |
| `/api/build-info` SHA match | **NOT VERIFIED** |
| sessionStorage dump before/after submit + revalidate | **NOT VERIFIED** |

**CPO gate:** **HOLD** — unit/regression PASS; Production resume capture pending deploy + CEO verification.

---

## What remains for Production verify

1. Deploy this commit to Production
2. Refresh QA auth (`scripts/_export-qa-storage-state.mjs`)
3. Resume journey → payer Q → `고객이요`
4. Capture sessionStorage `aiPmLoop` BEFORE submit, AFTER submit, AFTER revalidate
5. Assert: `semanticFactKey=buyer`, `getAnsweredTargetGaps` has `payer`, next Q ≠ payer, repeat count = 0
6. Confirm `/api/build-info` matches fix SHA

---

## Cross-links

- RCA: `P0_REINVESTIGATION_CASES_A-E.md` §2 (Case A)
- Fresh vs resume diff: `FRESH_VS_RESUME_STATE_DIFF.md`
- FIX 2–5: deferred (edit epoch, question lock, processing gate, generation token)
