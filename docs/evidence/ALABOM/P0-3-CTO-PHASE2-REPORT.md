# P0-3 Phase 2 — CTO Implementation Report

**Gate:** CEO TEST 🔴 HOLD (await CPO 2nd + Production E2E)  
**Branch:** `cursor/p0-3-phase2-fixes-6423`  
**Scope:** A Demo hydration · B confirm→ask · C customer/problem spine · D auth length trace (deferred)

---

## Changes

### P0-3A — Demo custom input protection

- `resolveDemoGuidedHydration()` — idempotent plan: skip reseed when stored custom canonical exists; never replace with SmartPM when CEO doc in storage/session.
- `shouldWipeDemoClientOnFresh()` — `fresh=1` wipe only without loop progress; preserve custom doc + re-write storage after wipe.
- `syncDemoCustomDocumentKey()` — keeps `DEMO_CUSTOM_DOCUMENT_KEY` aligned with `loadWorkspaceDocumentText`.
- `v2-strategy-workspace.tsx` — demo mount uses hydration plan; **skip path** restores domain from storage instead of sample seed.
- `workspace-ai-pm-main.tsx` — sync custom key on apply/edit/confirm (demo).

### P0-3B — Confirm → next question

- `commitFirstAskAfterUnderstandingConfirm()` — clears stale `lockedAskSurface` / `lastDecision`, resolves next question, commits **atomic** `phase: answer` + new lock.
- Wired from `proceedAfterUnderstandingConfirm()`.

### P0-3C — Customer / problem spine

- `extract-document-entities.ts` — **`대상:`** as customer section; P0-2B guard only when no explicit customer line.
- `build-business-understanding.ts` — labeled **`문제:`** extraction for spine.

### P0-3D — Auth truncation

- **No code change** (per CPO). Pending Supabase/OAuth restore → length trace checklist in Phase 1 report.

---

## Tests (local)

| Suite | Result |
|-------|--------|
| `p0-3-demo-hydration.test.ts` | PASS (6) |
| `p0-3-customer-problem-spine.test.ts` | PASS (2) |
| `p0-3-understanding-confirm-ask.test.ts` | PASS (1) |
| `day8i-fix2-continuity.test.ts` (P0-2B regression) | PASS (5) |
| `pnpm build` | PASS |

---

## Production E2E (CTO)

| Scenario | Status | Notes |
|----------|--------|-------|
| A Demo custom → edit → confirm → next Q | **Pending deploy** | Requires merge + Vercel SHA match |
| B Auth 1k + customer/problem | **BLOCKED** | OAuth / Supabase host |
| C Loop no rollback | **Pending deploy** | Same as A |

Post-deploy: re-run `/demo/start` custom path (not legacy workspace-only s17 entry).

---

## CPO 2nd review ask

- Verify Production SHA after deploy.
- Demo Scenario A + C on Production.
- Auth Scenario B when infra unblocked.
- **Do not** merge with Authenticated Persistence gate — separate track.
