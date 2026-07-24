# Releases

Release history for the AI SaaS Starter Kit. Semantic versioning.

---

## [Unreleased]

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
