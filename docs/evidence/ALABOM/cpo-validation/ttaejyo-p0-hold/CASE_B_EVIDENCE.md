# TTAEJYO — CASE B Evidence (Resume Payer Repeat)

**Environment:** Login → resume existing workspace  
**Question:** `누가 비용을 지불합니까?` repeats after answer  
**Fresh session:** PASS (`고객이요` → `semanticFactKey=buyer` → payer CLOSED)  
**Resume path:** FAIL (suspected hydration / cache authority)

---

## Causal chain — fresh path (PASS)

| Step | State | Result |
|------|-------|--------|
| 1 | `askedTargetGap: 'payer'`, Q text inferred | `interpretAnswerSemantics` → `factKey: buyer` |
| 2 | Turn appended with `targetGap: 'payer'` | `getAnsweredTargetGaps` includes `payer` |
| 3 | `decideNextQuestion` | payer excluded → next gap (not payer repeat) |

Verified: `ceo-second-loop-repro.test.ts` (10/10 PASS).

---

## Causal chain — resume path (FAIL hypothesis)

| Step | State | Result |
|------|-------|--------|
| 1 | User answered payer in prior session; DB snapshot has buyer turn | Server `persistedWorkspace.aiPmLoop` correct |
| 2 | Stale `sessionStorage` has newer `dbUpdatedAt` cache marker | `shouldApplyDbSnapshot` returned **false** |
| 3 | `WorkspacePersistedHydrator` skips DB apply | sessionStorage keeps **open payer** loop |
| 4 | `WorkspaceAiPmLoopPanel` mounts; `useState(loadAiPmLoopState)` | React state frozen to stale turns |
| 5 | Engine re-selects payer gap | **Repeat question** despite prior answer in DB |

### Secondary factor

Loop panel had **no reload** after hydrator wrote sessionStorage — even when DB eventually applied, in-memory `loopState` could lag.

---

## Root cause

**Independent from CASE A — persistence / hydration authority, not semantic routing.**

1. **`shouldApplyDbSnapshot`** — timestamp-only gate allowed stale sessionStorage to override DB loop state when cache marker was newer but content was wrong.  
2. **`workspace-ai-pm-loop-panel.tsx`** — no `projectId` hydration resync after DB → sessionStorage mirror.

Fresh demo path never hits (1) because `fresh=1` clears sessionStorage first.

---

## Fix (minimal)

| File | Change |
|------|--------|
| `apply-workspace-snapshot.ts` | If `snapshot.aiPmLoop.turns.length > 0`, always apply (server loop authoritative on resume) |
| `workspace-ai-pm-loop-panel.tsx` | `useLayoutEffect([projectId])` → `syncState(loadAiPmLoopState)` + `recognitionDismissed(true)` |

**NOT changed:** payer question deletion, forced gap close, competitor semantic assumptions.

---

## AFTER (expected)

```
Login → workspace entry
  → shouldApplyDbSnapshot true (DB turns present)
  → sessionStorage aiPmLoop matches DB (buyer turn, payer closed)
  → loop panel reloads from sessionStorage
  → decideNextQuestion skips payer
```

---

## Tests

- `ceo-second-loop-repro.test.ts` — payer closure fresh path (PASS)
- `ttaejyo-p0-hold.test.ts` — payer gap inference + stale empty turns re-open payer
- Resume e2e: requires QA auth storage (`.qa-auth/storageState.json` via `scripts/_export-qa-storage-state.mjs`) — not run in this pass

---

## Production note

Fresh-demo payer smoke in `_ttaejyo-p0-hold-capture.spec.ts` timed out waiting for `s11-surface` on Production `44f6940` (confirm flow drift). Engine unit path remains authoritative for fresh PASS; resume fix is code-proven via hydration chain.
