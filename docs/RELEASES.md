# Releases

Release history for the AI SaaS Starter Kit. Semantic versioning.

---

## [Unreleased]

### Added

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
