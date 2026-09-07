# Releases

Release history for the AI SaaS Starter Kit. Semantic versioning.

---

## [Unreleased]

### ALABOM DAY 8-I P0 FIX-10 — CEO Trust Journey + Judgment→Next Q (2026-09-07) ✅ Production

**Production SHA:** `cf180e068a3554828a8f4cd3681569fe44132cf2` · **PR:** #36  
**Prod:** https://ai-startup-validation-tau.vercel.app · **CPO 2nd:** PASS · **CPO Production:** PASS · **CEO TEST:** GO

- P0-FIX-10: project name ≠ business one-liner, initial AI understanding confirm, no unsupported customer inference
- P0-FIX-A-2: canonical judgment → next question binding (T3 problem confirm, not payer)
- FIX-9 / 30-turn regression preserved

Evidence: [`docs/evidence/ALABOM/DAY_8I_PRODUCTION_GATE_REPORT.md`](./evidence/ALABOM/DAY_8I_PRODUCTION_GATE_REPORT.md) · Revalidation: [`DAY_8I_P0_FIX10_REVALIDATION_REPORT.md`](./evidence/ALABOM/DAY_8I_P0_FIX10_REVALIDATION_REPORT.md)

### ALABOM DAY 8-H — Business Review Loop (2026-09-06) ✅ Production

**Production SHA:** `fcc61ddc9061…` · **PR:** #25  
**Prod:** https://ai-startup-validation-tau.vercel.app

- P0: `여기까지 검토하기` → 1-page business review + GO/조건부 GO/NO-GO
- P0: Supplement mode (AI explains + guide, not gap loop)
- Production Browser: H-A~H-E + 8-G/F/D **19/19 PASS**

Evidence: [`docs/evidence/ALABOM/DAY_8H_PRODUCTION_GATE_REPORT.md`](./evidence/ALABOM/DAY_8H_PRODUCTION_GATE_REPORT.md)

### ALABOM DAY 8-G — Judgment Conversation (2026-09-06) ✅ CLOSED

**Production SHA:** `69634a756c4d6f6fde77e442b6ae60f841ff4185` · **Tag:** `alabom-day8g-prod-69634a7` · **PR:** #24  
**Prod:** https://ai-startup-validation-tau.vercel.app · **CPO Sign-off:** 2026-09-06

- G-1 Simple Question UX — one question + answer guide
- G-2 Answer Guide — CEO-friendly input hints
- G-3 Progressive Disclosure — why-question in details
- G-4 Judgment aggregation — 4 CEO dimensions, multi-fact per answer (read-only presentation)
- G-5 Question budget — max 5 questions; Q3 interim / Q5 result judgment view
- Production Browser: G-A~G-E + F-B1~F-B3 + D1–D5 **14/14 PASS**

Evidence: [`docs/evidence/ALABOM/DAY_8G_PRODUCTION_GATE_REPORT.md`](./evidence/ALABOM/DAY_8G_PRODUCTION_GATE_REPORT.md)

### ALABOM DAY 8-F — Question Causality (2026-09-06)

**Production SHA:** `309603730885ac793a3fba1203d84e9e5b795e4f` · **PR:** #23  
**Prod:** https://ai-startup-validation-tau.vercel.app

- F-1 Answer Target Binding — latest CEO answer meaning > memory for confirm
- F-2 Confirm/Open UX — Yes/No on confirm; textarea on open only
- F-3 Previous Answer Edit — binds to last actionable CEO turn
- F-4 Research Delegation — natural-language research cues → ack + question stop
- F-5 Presentation Meta Guard — no internal reasoning leak to CEO UI
- Production Browser: F-B1~F-B3 + D1–D5 **9/9 PASS**

Evidence: [`docs/evidence/ALABOM/DAY_8F_PRODUCTION_GATE_REPORT.md`](./evidence/ALABOM/DAY_8F_PRODUCTION_GATE_REPORT.md)

### Sprint 1.6 — Decision Memory (2026-07-27)

**Commit:** `97e8bd1` · **Route:** `/validation`

- Decision Memory nav below Workflow (no new top menu)
- AI PM confirm-to-save flow (저장 / 나중에)
- Main detail: Decision → Reason → Evidence → Date → Status
- localStorage project-scoped persistence (demo path)

See [releases/sprint-1-6/RELEASE.md](./releases/sprint-1-6/RELEASE.md)

### Day 2 — Analytics & Admin (planned)

---

## [2.1.0-closed-beta] — 2026-07-25 — Closed Beta Core Completion (Day 1)

**Tag:** `closed-beta-v2.1.0`  
**Stage:** LaunchLens Closed Beta  
**Prod:** https://ai-startup-validation-tau.vercel.app

> **이번 Release:** Workspace에서 Evidence·Decision·Confidence·Next Action을 한 화면에서 체감. Admin에서 오늘 Goal/Workspace/GO/Feedback 확인.

### Day 1 Epic

- Workspace Welcome + Intelligence Summary cards
- Analysis Thinking (market → GO/HOLD → evidence)
- Project tab → project management panel
- History → Achievements wired
- Admin today summary (Goal, Workspace, GO, Feedback)
- Landing Closed Beta copy
- Error pages → journey CTA
- Loading messages (VC perspective)

### Docs

- [AUTONOMOUS_REPORT_v2.1.0.md](./sprints/AUTONOMOUS_REPORT_v2.1.0.md)

---

## [2.0.8-alpha] — 2026-07-25 — Product Journey Completion (Sprint 1)

**Tag:** `alpha-v2.0.8-journey`  
**Stage:** LaunchLens Alpha — Epic 4.5  
**Prod:** https://ai-startup-validation-tau.vercel.app

> **이번 Release에서 사용자가 새롭게 얻게 되는 경험:** Workflow는 선택이 아니라 AI 추천 확인. Workspace는 분석 결과 전에 프로젝트 등록 → AI Thinking → 첫 GO/HOLD.

### Epic 4.5 — Product Journey

- Workflow confirmation (checklist + single CTA)
- Project Registration panel + session persistence
- Workspace 3-phase: registration → thinking → active
- Left Journey Guide sidebar
- Landing journey-first (features/pricing removed from page)
- Product Journey Funnel on Operations dashboard
- Select/Theme z-index hotfix (P0)

### Docs

- [EPIC4_5_PRODUCT_JOURNEY_REPORT.md](./sprints/EPIC4_5_PRODUCT_JOURNEY_REPORT.md)
- [AUTONOMOUS_REPORT_v2.0.8.md](./sprints/AUTONOMOUS_REPORT_v2.0.8.md)

---

## [2.0.7-alpha] — 2026-07-25 — P0 Hotfix

**Tag:** `alpha-v2.0.7-hotfix`  
**Fix:** Goal → Workflow infinite loading (analytics ref loop)

---

## [2.0.6-alpha] — 2026-07-25 — Epic 4 Phase 1

**Tag:** `alpha-v2.0.6`  
**Delivered:** Landing polish, workspace UX, analytics interface, Closed Beta feedback

---

## [Unreleased — legacy note]

### Epic 2 — Intelligence Engine (in progress)

See [sprints/EPIC2_SPRINT1_KICKOFF.md](./sprints/EPIC2_SPRINT1_KICKOFF.md)

---

## [2.0.0-alpha] — 2026-07-24 — LaunchLens 2.0 Alpha

**Tag:** `alpha-v2.0.0`  
**Stage:** LaunchLens 2.0 Alpha (Epic 1 complete)  
**Prod:** https://ai-startup-validation-tau.vercel.app · Deploy `dpl_46ZfcJ33BdkFhv4tjnhwQzH9CCLF`

> **이번 Release에서 사용자가 새롭게 얻게 되는 경험:** Goal 하나만 선택하면 AI가 Workflow를 구성하고, Strategy Workspace에서 AI Strategy Coach가 Decision·Confidence·Next Action으로 프로젝트를 이끈다.

### Epic 1 — Goal & Workflow Experience

- Landing Journey strip · `/goal` · Workflow compose animation
- Workflow Guide cards · completion forecast
- **Strategy Workspace** + **AI Strategy Coach**
- Dynamic Decision (HOLD→GO mock) · Confidence Timeline · Decision History
- Health breakdown · Why Drawer (Evidence placeholder)

### Docs

- [EPIC1_CLOSE_REPORT.md](./sprints/EPIC1_CLOSE_REPORT.md)
- Sprint QA reports 1–3

### Not in Alpha

- Real LLM intelligence · Evidence Engine · Export · Epic 2+ features

---

## [Unreleased — legacy note]

### Added

- **Beta v0.9 RC** (Sprint L3.4) — Open Beta QA & stabilization
  - Auth login hotfix: LocaleSwitcher, LoginPanel, lazy Supabase client
  - Error UX, SEO, analytics funnel, RC templates
  - Deploy smoke guide: `docs/DEPLOY_SMOKE.md`
- Sprint 2-2: AI Project Operating System
  - `.cursor/rules/` (10 rule files)
  - Operational docs: DECISIONS, BACKLOG, TASKS, CODING_GUIDE, AI_GUIDE, etc.
  - Document templates and GitHub issue/PR templates
- Sprint 2-1: Backend infrastructure (`@repo/core`, `@repo/types`, `@repo/utils`)
- Sprint 1: UI foundation (`@repo/ui`, shadcn, theme, layout)

---

## [0.1.0] — 2026-07-19

### Added

- Initial monorepo (Sprint 0)
- Next.js 15 + React 19 + TypeScript + Tailwind v4
- pnpm workspace
- Documentation scaffold (PRD, ROADMAP, API, DB)

---

## Release Process

1. Complete sprint tasks in `TASKS.md`
2. Update `CHANGELOG.md` at repo root
3. Add entry here with version and date
4. Tag: `git tag v0.x.0`
5. Push tag (when remote configured)

## Version Policy

| Change | Version bump |
|--------|--------------|
| Breaking API/architecture | Major |
| New package or sprint feature | Minor |
| Docs, fixes, rules | Patch |

Starter Kit is pre-1.0 — minor bumps for each completed sprint milestone.
