# Releases

Release history for the AI SaaS Starter Kit. Semantic versioning.

---

## [Unreleased]

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
