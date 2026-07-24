# Roadmap

> **Active product track:** [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md) (Epic → Sprint → Product QA)  
> **Legacy feature track:** [MASTER_PLAN.md](./MASTER_PLAN.md) (Sprints 0–14, L2–L3.4 ✅)

## Foundation (Sprint 0–6) ✅

| Sprint | Focus | Status |
|--------|-------|--------|
| 0 | Monorepo + Next.js | ✅ |
| 1 | UI Platform (`@repo/ui`) | ✅ |
| 2-1 | Core infrastructure | ✅ |
| 2-2 | AI Project Operating System | ✅ |
| 3 | Database Platform (`@repo/db`) | ✅ |
| 4 | Auth Platform (`@repo/feature-auth`) | ✅ |
| 5 | AI Platform (`@repo/ai`) | ✅ |
| 6 | MCP Runtime (`@repo/mcp`) | ✅ |

---

## Product Platform (Sprint 7+)

> **Principle:** New platforms are added only when validated by real product use.

| Sprint | Focus | Status |
|--------|-------|--------|
| 7 | Automation Platform (`@repo/automation`) | ✅ |
| 8 | Browser Platform — real Playwright (`@repo/browser`) | ✅ |
| 9 | **Naver Commerce MVP** — first production feature | ✅ |
| 10 | Image Pipeline (promote from MVP when needed) | 🔜 |
| 11 | AI Content + Naver Smart Store API | Planned |
| 12 | Admin Console | Planned |
| 13 | Monitoring | Planned |
| 14 | Production Ready | Planned |

---

## Sprint 7 — Automation Platform ✅

- [x] `@repo/automation` package
- [x] Scheduler (cron, once, delayed, recurring)
- [x] Memory Queue + queue/adapter interfaces
- [x] Job system (registry, runner, context, result)
- [x] Pipeline engine
- [x] Execution manager + worker pool
- [x] Retry engine + DLQ interface
- [x] Events, notifications (interfaces), metrics, logging
- [x] Demo jobs + Naver upload pipeline
- [x] Interface tests (9 tests)
- [x] Documentation

## Sprint 8 — Browser Platform ✅

- [x] `@repo/browser` with Playwright (Chromium only in package)
- [x] BrowserManager, BrowserPool, ContextManager, PageManager
- [x] Navigation, Selectors, Download, Cookies, Screenshot, Network
- [x] Replace `browser.crawl` stub with real Playwright
- [x] Integration tests (local HTML fixture)
- [x] Naver pipeline E2E with real browser crawl
- [x] Documentation

## Sprint 9 — Naver Commerce MVP ✅

**Goal:** First production feature — auto product registration using existing platforms.

- [x] `apps/web/modules/naver-commerce` module
- [x] Product import pipeline (URL → crawl → extract → AI → images → draft)
- [x] UI dashboard at `/naver-commerce`
- [x] Module-local `image-service.ts` (Sharp — no platform package)
- [x] AI content via `@repo/ai`
- [x] Product Draft JSON (Naver-compatible)
- [x] Tests (extractor, image, draft, pipeline)
- [x] Documentation

## Sprint 10 — Image Pipeline (Next)

**Goal:** Promote image functions to platform only when reused beyond Naver MVP.

- [ ] Evaluate `packages/image` promotion criteria
- [ ] Hash dedup, background removal if needed by MVP

---

## LaunchLens Product Phase — AI Strategy Consultant (L3.x)

> **Superseded by LaunchLens 2.0 (2026-07-24).** See [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md).  
> L3.4 RC shipped; technical foundation retained. UX pivot starts Sprint 0.

> **PM principle (2026-07-24):** **User journey over feature list** — Epic → Sprint → Product QA → Production.

| Sprint | Focus | Priority | Status |
|--------|-------|----------|--------|
| L3.0 | OpenRouter + Gemini Flash | ★★★★★ | ✅ |
| L3.1 | Research pipeline + Evidence DB + Decision LLM | ★★★★★ | ✅ |
| L3.2 | OpenAI adapter + fallback + Orchestrator RESEARCH | ★★★★ | ✅ |
| L3.3 | Open Beta Ready (UX + ops + funnel) | ★★★★★ | ✅ |
| **L3.4** | **Open Beta QA → RC** | ★★★★★ | ✅ |
| **2.0 Sprint 0** | **Product Constitution** | ★★★★★ | ✅ |
| **Epic 1** | **Goal & Workflow Experience** | ★★★★★ | ✅ Alpha |
| **Epic 2** | **Intelligence Engine** | ★★★★★ | ✅ Closed |
| **Epic 3** | **Project Intelligence Workspace** | ★★★★★ | 🟢 In Progress |
| **Epic 3** | **Decision Engine** | ★★★★★ | Planned |
| **Epic 4** | **Execution Workspace** | ★★★★★ | Planned |
| **Epic 5** | **Living Strategy Platform** | ★★★★★ | Planned |
| L3.6 | MCP Integration | ★★★★★ | Planned |
| L3.7 | Scenario Planning (Best / Base / Worst) | ★★★★★ | Planned |
| L3.8 | Financial Model (ROI, NPV, IRR) | ★★★★★ | Planned |
| L3.9 | Investor Deck (IR PDF/PPT) | ★★★★★ | Planned |

### L3.4 goal

**외부 사용자 100명이 사용 가능한 수준** — Responsive · A11y · Lighthouse · OAuth · Error UX. 새 기능 거의 없음.

### L3.5+ target flow (post-beta)

```
Project → Browser Search → MCP → Evidence Merge → Decision
```

**Leverage:** `@repo/browser`, `@repo/mcp`, `research/providers/` registry

---

## Development process (L3.3+)

| Role | Responsibility |
|------|----------------|
| PM | Strategy, IA/UX, sprint design, PASS/HOLD |
| Senior Developer (Cursor) | Design, implement, refactor, tests |
| Senior QA (Cursor) | Unit/integration/regression, responsive, a11y, Lighthouse, E2E |
| DevOps Reviewer (Cursor) | Git, build, env, deploy `jyp-ai1s-projects`, health smoke, rollback report |

**Deploy report must include:** Commit, branch, prod URL, deployment ID, build/lint results, smoke, known issues, PM manual QA, rollback steps.

---

## Legacy

<details>
<summary>Original Sprint plan (superseded)</summary>

Sprint 6 was originally "MCP Integrations" — replaced by MCP Runtime Platform approach.

</details>
