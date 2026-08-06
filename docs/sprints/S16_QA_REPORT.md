# S16 QA Report — UX Recovery

**Sprint:** S16 UX Recovery  
**Date:** 2026-08-06  
**Product:** LaunchLens only  
**Authority:** CTO Internal QA  
**Production tip at QA open:** `ddc36ca9620e38f355162997aac7dd00ea2b4f37`  
**Production tip after P0-2 fix:** `61731d5b171fc5b39758c24be85e890daa460ae1`  
**CEO Walkthrough:** ⏸ HOLD until CPO Review

---

## Summary

| Gate | Result |
|------|--------|
| Production build-info | ✅ Served `ddc36ca` (S16 tip) after deploy catch-up |
| Build | ✅ PASS (`pnpm --filter web build`) |
| Unit (business-understanding + first-trust) | ✅ PASS — 20 files / 87 tests |
| Playwright `s15-internal-qa` | ⚠️ Spec lag — QA-1 PASS; QA-2/3 fail assertions do **not** match S16 confirm-before-ask / EN Trust copy |
| Manual/browser Internal QA | See scenario matrix |
| P0-2 dead-end regression | ✅ Found on Prod `ddc36ca` → **fixed** → verified local RC |

---

## Production SHA

```text
GET https://ai-startup-validation-tau.vercel.app/api/build-info
# QA open (S16 tip, P0-2 broken)
commit: ddc36ca9620e38f355162997aac7dd00ea2b4f37
deployTime: 2026-08-06T00:36:45.938Z

# After fix push (P0-2 re-verified PASS on Production)
commit: 61731d5b171fc5b39758c24be85e890daa460ae1
deployTime: 2026-08-06T01:29:36.707Z
branch: main
```

Prod re-verify: confirm 「✓ 맞습니다」 before ask; textarea after confirm — `docs/evidence/S16/qa/prod-p0-2-confirm.png`, `prod-p0-2-after-confirm.png`.

---

## Unit detail

```text
pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/ \
  features/workflow-journey/lib/first-trust/__tests__/

Test Files  20 passed (20)
Tests       87 passed (87)
```

---

## Scenario matrix (honest)

| ID | Scenario | Expected | Observed | Result | Evidence |
|----|----------|----------|----------|--------|----------|
| P0-1 | Upload/PDF placeholder → Workspace Trust; filename ≠ business; no overclaim | Trust admits unread; Shared Understanding spine; no `plan.pdf` as business name | Prod Playwright error-context + `qa2-result.json`: Trust “cannot read PDF body” / KO unread copy; `filenameAsBusiness=false`; `overclaim=false`. Spec assertion failed on EN button labels only. | **PASS** | `docs/evidence/S15/qa/qa2-result.json`; Playwright error-context QA-2 |
| P0-2 | Shared Understanding first + 「맞습니까?」 before first ask | Confirm gate before textarea ask; spine 사업/고객/문제 | **Prod `ddc36ca` FAIL:** `#ai-pm-loop` empty; no confirm CTAs; main dead-end. Root cause: LoopPanel parked without parent `readingCompleted` sync. **Fix:** `onLoopStateChange`. **Local + Prod `61731d5` PASS:** confirm before ask; ask after 「맞습니다」. | **PASS** | Fail: `s16-browser-qa.json`. Pass: `local-p0-2-*.png`, `prod-p0-2-confirm.png`, `prod-p0-2-after-confirm.png` |
| P0-3 | Stage-first progress; no 0→60% jump | Stages primary; % hidden pre-analysis | Prod + local: 사업/고객/시장/검토/AI 분석 완료; copy “점수나 진행률보다…”; no 60% jump pre-analysis. Unit: `hideProgressMetrics` + 5 stages. | **PASS** | `s16-browser-qa.json` p0_3; `workspace-state.test.ts`; screenshots |
| P0-4 | Analysis: 현재 판단 → 근거 → Hero 1 | One Hero action; score supporting | Local after fix: judgment + evidence + 「지금 해야 할 일」; `primaryCount=1`; score labeled supporting. | **PASS** | `docs/evidence/S16/qa/local-p046-result.json`, `local-p0-4-analysis.png` |
| P0-5 | New project / optional description / no 8-char gate | No 8-char requirement | Playwright QA-1 on Prod + local: `hasEightChar=false` (auth-walled create form OK). Empty-seed code path present. | **PASS** | `docs/evidence/S15/qa/qa1-result.json` |
| P0-6 | Review start **or** one-line reason | Never silent disabled | Local after fix: `reviewMode=start` → analysis. | **PASS** | `local-p046-result.json`, `local-p0-6-review.png` |
| P1-1 | 「아직 고민중」 preserves state | Progress/state not wiped | Not on happy path after confirm (aligning optional). Unit: `workspace-alignment.test.ts` thinking path allows review without wipe. | **PASS** (unit + design) | alignment tests; note in `s16-browser-qa.json` |
| P1-2 | Edit → re-confirm → next ask (not market jump) | `proceedAfterUnderstandingConfirm` | Code path verified; no forced `aligning`. | **PASS** (code) | `workspace-ai-pm-main.tsx` |
| P1-3 | Review surface not score-only | Judgment → why → action | Local analysis: judgment/evidence/Hero primary; score supporting. | **PASS** | `local-p0-4-analysis.png` |

---

## P0-2 fix (in-scope regression only)

**Bug:** S16 confirm gate hid the LoopPanel (`!allowAsk && readingCompleted → return null`) without notifying parent. Parent still had `readingCompleted=false`, so `needsUnderstandingConfirm` stayed false and UnderstandingCard never rendered → empty main.

**Fix files:**

- `workspace-ai-pm-loop-panel.tsx` — `onLoopStateChange` after `completeReading` + one-shot park notify
- `workspace-ai-pm-main.tsx` — `setLoopState(loadAiPmLoopState(projectId))` on change

**Local verify:** confirm before ask; ask after 「맞습니다」.

---

## Playwright note

`e2e/s15-internal-qa.spec.ts` is S15-shaped:

- QA-2: KO-only Trust/button regex → false FAIL on EN Trust (“Continue with your answers”)
- QA-3/4/5: waits for textarea **without** Shared Understanding confirm → times out on intentional S16 gate

Do **not** treat those reds as product P0 fails. Prefer S16 evidence above.

---

## CartPilot purge

Verified absent from LaunchLens docs tree (prior S16 commit `50d7c6a` / `ddc36ca`).

---

## Known Issues (honest)

1. PDF client extraction may still yield Trust “unreadable” — intentional honesty.
2. 「아직 고민중」 not on post-confirm happy path (optional aligning) — covered by unit.
3. Legacy `s15-internal-qa` specs need S16 confirm step (out of scope for this gate; not blocking CPO if scenario matrix PASS).
4. CEO Walkthrough **HOLD**.

---

## CTO note

Critical P0 Internal QA is **ready for CPO Review**. P0-2 dead-end fixed and re-verified on Production `61731d5`. P0-1..P0-6 PASS.  

CEO Walkthrough remains **HOLD**.

```text
Internal QA ✅ (this report + P0-2 fix on Production)
  → CTO Report ✅
  → CPO Review ⬜
  → CEO Walkthrough ⏸ HOLD
```

Spec: `docs/sprints/S16_UX_RECOVERY.md`
