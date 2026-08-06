# S16 UX Recovery

**Sprint:** S16 — UX Recovery (NO new features)  
**Status:** Implementation ✅ · Internal QA ✅ · **CPO Review PASS** · RC package submitted  
**CEO Walkthrough:** ⏸ **HOLD** — awaiting CPO open of CEO Gate (RC package ready)  
**Product:** LaunchLens only (CartPilot / Platform SDK docs purged from this repo)

**North star:** Stabilize UX/flow so CEO can use LaunchLens for real startup validation.

**RC package:** `S16_CEO_WALKTHROUGH_GUIDE.md` · `S16_KNOWN_ISSUES.md` · `S16_QA_REPORT.md`  
**Production tip (RC):** `a13accf30776fb94061fcb7b30e255a50fd66222` · deploy `2026-08-06T01:33:58.524Z`

---

## Gate order

```text
Internal QA ✅ → CTO Report ✅ → CPO Review ✅ PASS (impl + QA)
  → RC package ✅ submitted
  → CEO Walkthrough ⏸ HOLD until CPO opens gate
```

---

## P0-1 — Upload → Workspace

| Field | Content |
|-------|---------|
| **Before** | PDF upload could dead-end; filename could surface as business name; AI could claim “read” on placeholders |
| **After** | PDF/placeholder → Workspace → Trust Block (admits unread) → Shared Understanding → first question; filename ≠ business name |
| **Acceptance** | No dead end; Trust shows unknown; Shared Understanding visible; first question reachable |
| **Changed Files** | Existing S15 paths retained: `workspace-document-trust-block.tsx`, `workspace-document-eligibility.ts`, `build-shared-understanding.ts`, `demo-start-view.tsx`. Confirm gate wired in `workspace-ai-pm-main.tsx` + `workspace-ai-pm-loop-panel.tsx` |
| **Known Issues** | Client-side PDF text extraction still placeholder on some browsers — Trust Block must remain honest |

---

## P0-2 — Shared Understanding First

| Field | Content |
|-------|---------|
| **Before** | Reading → auto-open quiz Q→A; 「맞습니까?」 skipped; understanding card only after loop (and often skipped via `review-ready`) |
| **After** | Trust/Reading → AI understanding (사업/고객/문제) → 「맞습니까?」 → edit optional → then first question |
| **Acceptance** | Confirm gate always before first ask; spine always 사업 / 고객 / 문제 |
| **Changed Files** | `workspace-ai-pm-main.tsx`, `workspace-ai-pm-loop-panel.tsx` (`allowAsk`), `ko.json` / `en.json` (`confirmLead`) |
| **Known Issues** | Returning sessions mid-loop with turns already present skip re-confirm (by design) |

---

## P0-3 — Progress redefine

| Field | Content |
|-------|---------|
| **Before** | Loop hid %, then exit flashed topic-based % (easy 0→60) |
| **After** | Stages only until analysis: 사업 이해 → 고객 이해 → 시장 이해 → 검토 준비 → AI 분석 완료; numbers secondary / hidden pre-analysis |
| **Acceptance** | No 0%→60% jump; stage labels primary in sidebar |
| **Changed Files** | `workspace-state.ts`, `workspace-shell-types.ts`, `workspace-state.test.ts`, `ko.json` / `en.json` (`journeyStep`, `stages`) |
| **Known Issues** | Post-analysis score still available as supporting metric (P0-4 / P1-3) |

---

## P0-4 — Hero Action one

| Field | Content |
|-------|---------|
| **Before** | Analysis could feel score-first / multi-CTA |
| **After** | 현재 판단 → 근거 ≤3 → 해야 할 일 1개 = Hero; rest under 더 보기 (S15 presenter retained) |
| **Acceptance** | One Hero action; evidence capped; score supporting |
| **Changed Files** | No S16 delta required — `present-analysis-screen.ts`, `workspace-analysis-result-panel.tsx` verified |
| **Known Issues** | Judgment copy can still read machine-like on some domains |

---

## P0-5 — New project

| Field | Content |
|-------|---------|
| **Before** | Optional description OK, but empty Workspace dead-ended on document intake only |
| **After** | No 8-char description gate; name → create → Workspace; empty create seeds “AI가 모릅니다” conversation OR 「문서 없이 AI에게 바로 시작」 |
| **Acceptance** | Description optional; CEO can reach AI questions without a plan PDF |
| **Changed Files** | `my-project-actions.ts`, `build-empty-project-seed.ts`, `workspace-document-intake.tsx`, `workspace-ai-pm-main.tsx`, `v2-strategy-workspace.tsx`, i18n |
| **Known Issues** | Seed text is structured unknown-admit, not a real business plan — Trust/Reading must not claim false confidence |

---

## P0-6 — Review start

| Field | Content |
|-------|---------|
| **Before** | Silent disabled review possible in older paths |
| **After** | Always Start **or** one-line reason (`reviewBlocked.*`) — S15 gate retained |
| **Acceptance** | Never silent |
| **Changed Files** | Verified: `workspace-state.ts` `deriveReviewGate`, `workspace-next-step-panel.tsx` |
| **Known Issues** | Multiple review CTAs exist by phase; both share the same gate |

---

## P1-1 — 「아직 고민중」

| Field | Content |
|-------|---------|
| **Before** | Risk of wiping customer/progress on thinking |
| **After** | Thinking preserves state; does not reset Progress/Loop (S15 alignment tests) |
| **Acceptance** | Progress/State unchanged when selecting 아직 고민중 |
| **Changed Files** | Verified: `workspace-alignment.ts`, alignment tests — market block only when phase=`aligning` (optional path) |
| **Known Issues** | Aligning UI is no longer on the happy path after confirm (P1-2); reachable via NextStep continue-alignment |

---

## P1-2 — Edit flow

| Field | Content |
|-------|---------|
| **Before** | Edit → confirm Yes → jumped to market alignment |
| **After** | Edit → re-show AI understanding → 맞습니까? → next question (or review-ready if loop done) |
| **Acceptance** | No forced market analysis jump |
| **Changed Files** | `workspace-ai-pm-main.tsx` (`proceedAfterUnderstandingConfirm`) |
| **Known Issues** | None material |

---

## P1-3 — Review surface

| Field | Content |
|-------|---------|
| **Before** | Score-only endings possible |
| **After** | AI judgment → why → next action for CEO; score supporting |
| **Acceptance** | Not score-only end |
| **Changed Files** | Verified: `WorkspaceAnalysisResultPanel` primary; `WorkspaceAiPmScorePanel` `emphasis="supporting"` |
| **Known Issues** | If analysis presenter null, weaker workshop/fallback copy |

---

## CartPilot purge

Deleted from this LaunchLens repo:

- `docs/architecture/PLATFORM_SDK_V1.md`
- `docs/testing/PLATFORM_CONTRACT_TESTS.md`
- `docs/sprints/SPRINT_A_PLAN.md`

`docs/sprints/S15_PROGRESS.md` restored to LaunchLens-only gate language; S16 active; CEO Walkthrough HOLD.
