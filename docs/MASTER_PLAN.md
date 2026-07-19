# AI Startup Validation Framework — Master Development Plan

> **Purpose:** Cursor / Claude Code에 한 번 전달하는 전체 개발 마스터 작업지시서.  
> 이후 세션에서는 `"Sprint N 실행"` 또는 `"다음 Sprint 실행"`만 요청하면 됩니다.

**Last updated:** 2026-07-19

---

## Product Vision

아이디어 입력부터 시장 검증, 사업계획서 작성, 제품 개발 명세 생성까지 지원하는 **AI 기반 Startup Operating System** 구축.

---

## Core User Flow

```text
Startup Idea
    ↓
Project Workspace
    ↓
Research Planning → Evidence Collection → Customer Validation
    ↓
Competitor Analysis → Government Support Analysis
    ↓
GO / NO GO Evaluation → Validation Report
    ↓
Business Plan → PRD → Development Specification
    ↓
AI Startup Agent
```

---

## Development Principles

1. MVP 우선
2. 데이터 구조 먼저 구축
3. AI 기능은 데이터 기반으로 확장
4. 모든 Module은 독립 Feature 구조 (`apps/web/features/*`)
5. 추후 SaaS 확장 고려

---

## Tech Stack (Implementation Reality)

| Layer | Master Plan | Actual Implementation |
|-------|-------------|----------------------|
| Frontend | Next.js, TypeScript, Tailwind, shadcn | ✅ `apps/web` + `@repo/ui` |
| Backend | Next.js Server Actions | ✅ Server Actions in features |
| Database | Supabase PostgreSQL | ✅ `@repo/db` Supabase adapters |
| ORM | Prisma | ⚠️ **Repository pattern** (`@repo/db`) — no Prisma in apps |
| AI | Provider Interface | ✅ `@repo/ai` (OpenAI / Anthropic HTTP) |
| Auth | MVP: 없음 (Local User) | ✅ No auth in MVP |
| Deployment | Vercel | Planned |

**Architecture:** Application → Service → Repository (interface) → Adapter → Supabase.  
See `docs/ARCHITECTURE.md`, `docs/BACKEND_ARCHITECTURE.md`.

---

## Authentication

- **MVP:** 로그인 없음, Local User 기준
- **Phase 2:** Auth Module (`@repo/feature-auth` platform exists)

---

## Sprint Roadmap & Status

| Sprint | Focus | MVP Tier | Status |
|--------|-------|----------|--------|
| 0 | Foundation — Next.js, UI, Supabase, Layout | Infra | ✅ Complete |
| 1 | Startup Project Workspace | **MVP** | ✅ Complete |
| 2 | Research Master Plan | **MVP** | ✅ Complete |
| 3 | Evidence Database | **MVP** | ✅ Complete |
| 4 | Competitor Intelligence | **MVP** | ✅ Complete |
| 5 | VOC Analysis System | **MVP** | ✅ Complete |
| 6 | Government Support Intelligence | **MVP** | ✅ Complete |
| 7 | GO / NO GO Validation Engine | **MVP** | ✅ Complete |
| 8 | Validation Report Framework | **MVP** | ✅ Complete |
| 9 | AI Validation Report Generator | Premium | ✅ Complete |
| 10 | AI Business Plan Generator | Premium | ✅ Complete |
| 11 | AI PRD Generator | Premium | ✅ Complete |
| 12 | AI Development Specification Generator | Premium | ✅ Complete |
| 13 | AI Knowledge Base | Differentiation | ✅ Complete |
| 14 | AI Startup Validation Agent | Differentiation | ✅ Complete |

**Master Plan Sprints 0–14: Complete**

### PM Release Tiers

| Tier | Sprints | Outcome |
|------|---------|---------|
| **1차 MVP 출시** | 0–8 | 창업 아이디어 검증 SaaS — 사용자 테스트 가능 |
| **사용자 확보** | 9–12 | AI Premium — Report, Business Plan, PRD, Dev Spec |
| **AI 차별화** | 13–14 | Knowledge Base + Validation Agent |

**MVP minimum:** Project + Research + Evidence + VOC + Competitor + Validation Score + Report

---

## Sprint Specifications

### Sprint 0 — Foundation

- Next.js Setup, Tailwind, UI System, Supabase, Layout, Dashboard Shell
- **Done:** Monorepo, `@repo/ui`, `@repo/core`, `@repo/db` platform

### Sprint 1 — Startup Project Workspace

- Entity: `StartupProject` — CRUD, List, Detail, Edit, Delete
- Route: `/projects`

### Sprint 2 — Research Master Plan

- Entity: `ResearchPlan` — Type, Priority, Status
- Types: Market, Customer, Trend, Competitor, Business Model, Technology, Regulation

### Sprint 3 — Evidence Database

- Entity: `Evidence` — CRUD, Category, Source, Confidence

### Sprint 4 — Competitor Intelligence

- Entity: `Competitor` — Matrix, SWOT

### Sprint 5 — VOC Analysis System

- Entity: `VOC` — Pain Point, Severity, Payment Intent, Dashboard

### Sprint 6 — Government Support Intelligence

- Entity: `GovernmentGrant` — 적합도 Score, Deadline Dashboard

### Sprint 7 — GO / NO GO Validation Engine

- Entity: `ValidationScore` — Market, Problem, Competition, BM, Execution, Founder Fit
- Output: GO | CONDITIONAL GO | NO GO

### Sprint 8 — Validation Report Framework

- Entities: `ValidationReport`, `ReportSection`
- Sections: Executive Summary, Problem, Market, Customer, Competition, BM, Government, Validation, Risk, Next Action

### Sprint 9 — AI Validation Report Generator

- Context Builder → AI Provider → Validation Report sections
- `@repo/ai/validation`

### Sprint 10 — AI Business Plan Generator

- Entity: `BusinessPlan` + 16 sections
- Route: `/projects/[id]/business-plan`

### Sprint 11 — AI PRD Generator

- Entity: `PRD` + 14 sections
- Route: `/projects/[id]/prd`

### Sprint 12 — AI Development Specification Generator

- Entity: `DevelopmentSpec` + 13 sections (linked to PRD)
- Route: `/projects/[id]/development-spec`

### Sprint 13 — AI Knowledge Base

- Evidence → KnowledgeDocument → KnowledgeChunk → VectorStore (Mock)
- Routes: `/projects/[id]/knowledge`, `/knowledge/query`
- `@repo/ai/knowledge`

### Sprint 14 — AI Startup Validation Agent ✅

- User Question → Agent → Research + Evidence + VOC + Competitor + Knowledge → Recommendation
- Route: `/projects/[id]/agent`
- `@repo/ai/validation` agent generator

---

## Feature Structure

```text
apps/web/features/
├── projects/
├── research/
├── evidence/
├── competitors/
├── voc/
├── grants/
├── validation/
├── reports/
├── business-plan/
├── prd/
├── development-spec/
└── knowledge/
└── validation-agent/
```

---

## Global Quality Requirements (Every Sprint)

- [ ] TypeScript errors 없음
- [ ] ESLint pass (`pnpm lint`)
- [ ] Build 성공 (`pnpm --filter web build`)
- [ ] DB migration 추가 시 `packages/db/src/migration/` 순서 유지
- [ ] Seed data (실버 세대 매칭 서비스) 유지
- [ ] `docs/TASKS.md` 업데이트
- [ ] `SPRINT_RESULT.md` 작성

---

## Cursor Execution Workflow

```text
1. Read docs/MASTER_PLAN.md (this file)
2. Read docs/TASKS.md — confirm last completed sprint
3. Read SPRINT_RESULT.md — prior sprint handoff
4. Execute next sprint per spec
5. Verify: lint + build
6. Update TASKS.md + SPRINT_RESULT.md
```

**Prompt template for next session:**

```markdown
docs/MASTER_PLAN.md 기준으로 Sprint 14 실행.

완료 조건: MASTER_PLAN Quality Requirements + Sprint 14 spec.
```

---

## Future Expansion (Phase 2+)

- Authentication & Team Workspace
- Collaboration
- Web Research / Browser Agent
- Government API integration
- Investor Matching
- Market Monitoring
- Real Vector DB + Embedding API
- RAG Answer Generation

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [TASKS.md](./TASKS.md) | Sprint task checklist (source of truth for done/pending) |
| [ROADMAP.md](./ROADMAP.md) | Platform infrastructure track (monorepo packages) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layered architecture rules |
| [SPRINT_RESULT.md](../SPRINT_RESULT.md) | Latest sprint handoff (repo root) |
