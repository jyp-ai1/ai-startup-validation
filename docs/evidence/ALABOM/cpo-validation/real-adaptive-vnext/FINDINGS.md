# ALABOM Real Adaptive vNext — FINDINGS (Loop 8)

## Deploy status

| Item | Value |
|------|-------|
| Loop 7b baseline SHA | `9fa5248` — targetGap persist LIVE; P0-1/P0-2 FIX |
| **Loop 8 fix SHA** | `4769f4f` — wrong-slot override on live panel path |
| Loop 8 push | **SUCCESS** @ 2026-08-30T05:02 KST |
| Loop 8 Vercel deploy | **PENDING** — prod still @ `9fa5248` as of poll timeout |
| Live capture @ `4769f4f` | **PENDING deploy** |

## Loop 8 root cause (traced T12–T14 @ `9fa5248`)

| Layer | Finding |
|-------|---------|
| **T12 append** | `resolveAskedTargetGapForAppend` preferred stale `whyTargetGap=problemJtbd` over `overrideTargetGap=customerPersona` and visible persona question text → turn persisted with wrong asked gap → `detectWrongSlotMergeContext` null or mis-anchored |
| **T12→T13 next Q** | `resolveNextIssueByMissingField` yielded to ranked `problemJtbd` (lines 698–705) despite wrong-slot persona still open |
| **Panel gap pick** | `getTopGapPriority` bypassed `resolveWrongSlotQuestionOverride`; used in nonsense/reframe + append fallback paths |
| **Engine gap** | `decideNextQuestion` ranked before wrong-slot anchor (unit passed via adaptive boost only; live doc-memory path excluded persona from ranked[]) |

## Loop 8 fix (commit `4769f4f`)

1. **`resolveWrongSlotQuestionAnchor`** — shared SoT in `wrong-slot-priority.ts`
2. **`resolveAskedTargetGapForAppend`** — priority: override → questionText → whyTargetGap
3. **`decideNextQuestion` / `getTopGapPriority` / `resolveNextIssueByMissingField`** — wrong-slot anchor BEFORE ranked selection
4. **Panel** — all gap picks use `getWhyThisQuestionNow`; append uses `questionOverride?.questionText`
5. **Tests** — 45/45 PASS including Loop 8 @ 9fa5248 T12/T13 integration

## P0 causality verdicts

| P0 | Transition | Unit @ `4769f4f` | Live @ `4769f4f` |
|----|------------|------------------|------------------|
| **P0-1** | T12→T13 | **PASS** | **PENDING deploy** |
| **P0-2** | T13→T14 | **PASS** | **PENDING deploy** |
| **P0-3** | T16→T22 | PASS (regression) | prior PASS @ `9fa5248` |
| **P0-4** | Analysis gate | PASS (regression) | prior PASS @ `9fa5248` |
| **P0-5** | Final GO | PASS (regression) | prior PASS @ `9fa5248` |

**CPO PASS declared:** **No** — live capture on `4769f4f` pending Vercel deploy.

## Next step

Poll deploy → ONE live capture @ `4769f4f` → re-evaluate P0-1 AND P0-2 live.
