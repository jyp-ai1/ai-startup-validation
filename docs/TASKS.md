# Tasks

Current and recent sprint tasks. Update at sprint start and completion.

> **Master plan:** [MASTER_PLAN.md](./MASTER_PLAN.md) · **Status:** Sprint 0–14 ✅ Complete  
> **Product Experience:** [LAUNCHLENS_PRODUCT_EXPERIENCE.md](./LAUNCHLENS_PRODUCT_EXPERIENCE.md) v1.0 (primary)  
> **Design System:** [LAUNCHLENS_DESIGN_SYSTEM.md](./LAUNCHLENS_DESIGN_SYSTEM.md) v1.0 (secondary)

---

## Sprint L2.4.1 — Global UX Stabilization & Beta Quality ✅

**Status:** Complete ✅ (deployed 2026-07-24, commit `392b6cd`)

---

## Sprint L2.5 — Quality & International Launch ✅

**Status:** Complete ✅ (deployed 2026-07-24, commit `7f684a1`)

| EPIC | Status |
|------|--------|
| E1 실제 다국어 (KO/EN/JA/zh-CN landing) | 🔄 Partial |
| E2 Language switch (🌐 KO/EN/JP/CN) | ✅ Done |
| E3 Theme Light/Dark/System | ✅ Done |
| E4 SEO (manifest, og:image, icons) | ✅ Done |
| E5 Error pages (404/503/401) | ✅ Done |
| E6 Loading skeletons | ✅ Done (landing/dashboard/projects) |
| E7 Empty UX 전 페이지 | ⏳ → L2.6 |
| E8–9 Responsive/A11y QA | ⏳ PM manual |
| E10 Playwright smoke | ✅ Scaffold |

---

## Sprint L2.6 — Product Polish ✅

**Status:** Complete ✅ (deployed 2026-07-24, commit `d28a795`)  
**Goal:** 기능 추가 없음 — Empty/Loading/Toast/AI Status/Notification/Health/Keyboard/Micro-interaction polish

| EPIC | Status |
|------|--------|
| E1 Dashboard Empty UX (Research/Evidence/Competitor/Government/Decision/Report/Memory/Notification) | ✅ Done |
| E2 Loading skeletons (Dashboard/Workspace/Research/Decision/Report) | ✅ Done |
| E3 Toast system (success/error/warning/loading/undo) | ✅ Done |
| E4 AI Status indicator (header) | ✅ Done |
| E5 Notification Center workspace events (mock defaults removed) | ✅ Done |
| E6 Workspace Health (Research/Evidence/VOC/Decision/Report) | ✅ Done |
| E7 Keyboard UX (⌘K, /, Esc, G D, G P) | ✅ Done |
| E8 Micro-interaction (cards/buttons/hover) | ✅ Partial |
| E9 Responsive QA (390–1920) | ⏳ PM manual |
| E10 Accessibility QA | ⏳ PM manual |

**Verify:** `pnpm build && pnpm lint && pnpm audit:i18n`

---

## Sprint L3.0 — Real AI Integration (Phase 1) ✅

**Status:** Complete ✅ (prod: https://ai-startup-validation-tau.vercel.app, commit `b6c76cb`)  
**Goal:** Mock → OpenRouter + Gemini Flash real responses (Claude deferred)

| EPIC | Status |
|------|--------|
| E1 AI Provider Layer (port + registry) | ✅ Done |
| E2 OpenRouter + `google/gemini-2.5-flash` | ✅ Done |
| E3 Prompt Builder + context compression | ✅ Done |
| E4 AI Consultant Gemini chat + streaming | ✅ Done |
| E5 Research Agent → Gemini → evidence | ✅ Done |
| E6 Streaming UI | ✅ Done |
| E7 Token usage dashboard | ✅ Done |
| E8 Error/retry/fallback (429/401/500/timeout) | ✅ Done |
| E9 Prompt registry v1–v3 | ✅ Done |
| E10 AI Playground (`/admin/ai-playground`) | ✅ Done |

**Env:** `OPENROUTER_API_KEY`, `AI_DEFAULT_PROVIDER=openrouter`, `AI_DEFAULT_MODEL=google/gemini-2.5-flash`  
**Deploy target:** `jyp-ai1s-projects/ai-startup-validation`

---

## Sprint L3.1 — AI Research Pipeline (Phase 2) ✅

**Status:** Complete ✅ (prod: https://ai-startup-validation-tau.vercel.app, commit `0ac804f`)  
**Goal:** Research → Gemini → Evidence DB + Decision LLM + citable sources

| EPIC | Status |
|------|--------|
| E1 Research approve → Evidence DB persistence | ✅ Done |
| E2 Decision Engine OpenRouter/Gemini provider | ✅ Done |
| E3 Research prompt v2 with source URLs | ✅ Done |
| E4 Prod URL migration (tau.vercel.app) | ✅ Done |
| E5 Build/test/deploy + smoke | ✅ Done |

**Verify:** Research approve → Evidence list · Decision Center live summary · `/api/ai/health`

---

## Sprint L3.2 — OpenAI Provider + Fallback (Phase 3) ✅

**Status:** Complete ✅ (prod: https://ai-startup-validation-tau.vercel.app, commit `d89eeb0`)  
**Goal:** Direct OpenAI adapter + OpenRouter→OpenAI fallback + Orchestrator RESEARCH real worker

| EPIC | Status |
|------|--------|
| E1 OpenAI HTTP adapter + tests | ✅ Done |
| E2 Provider fallback chain (consultant + decision) | ✅ Done |
| E3 Orchestrator RESEARCH real worker | ✅ Done |
| E4 Health API + ops dashboard + env docs | ✅ Done |
| E5 Build/test/deploy + smoke | ✅ Done |

**Env:** `OPENAI_API_KEY` (fallback), optional `AI_FALLBACK_MODEL=gpt-4o-mini`  
**Verify:** `/api/ai/health` shows `openaiConfigured` · Orchestrator RESEARCH uses Gemini · fallback on 429/5xx

**PM note:** `OPENAI_API_KEY` on Vercel 권장 — OpenRouter 장애 시 서비스 연속성 (현 prod: `openaiConfigured: false`)

---

## Sprint L3.3 — Open Beta Ready ✅

**Status:** Complete ✅ (prod: https://ai-startup-validation-tau.vercel.app, commit `5663c39`, deploy `dpl_EViPKgJLsNSAfiQAS8JmKhjz3Voy`)  
**Goal:** 오픈베타 공개 가능 — UX·안정성·운영 준비 (기능 추가 아님)

| EPIC | Scope | Status |
|------|-------|--------|
| E1 Google Login QA | 가입·로그인·로그아웃·세션 | ⏳ PM checklist |
| E2 Wizard UX | 3분 온보딩, optional 필드 | ✅ Done |
| E3 Demo UX | DemoWelcomeCard 체험형 | ✅ Done |
| E4 Project Home | Today's Focus 상단 | ✅ Done |
| E5 Loading UX | Skeleton/spinner (기존) | ✅ Done |
| E6 Error UX | AI 실패 재시도 | ✅ Done |
| E7 Feedback | Footer 버그/기능 제안 | ✅ Done |
| E8 Contact | Footer 문의·Discord·GitHub·About | ✅ Done |
| E9 Analytics | Ops 퍼널 (가입→리포트) | ✅ Done |
| E10 Beta Badge | PRIVATE BETA v0.9 | ✅ Done |
| E11 Build/deploy/QA | lint/build/smoke/prod | ✅ Done |

**DoD:** 5분 내 첫 프로젝트+리포트 · E2E PASS · Lighthouse · prod deploy · PM QA PASS

**PM note:** OpenAI 키 불필요 (OpenRouter ONLY). Browser/MCP → **L3.4/L3.5** (오픈베타 후).

**Config:** `NEXT_PUBLIC_FEEDBACK_BUG_URL`, `NEXT_PUBLIC_FEEDBACK_IDEA_URL`, optional `NEXT_PUBLIC_DISCORD_URL`

---

## Sprint L3.4 — Browser Research Agent 🔜

**Status:** Planned (after open beta)  
**Goal:** Mock 조사 탈출 — Playwright 웹 검색 + Evidence → Decision

| EPIC | Scope |
|------|-------|
| E1 Browser Agent | `@repo/browser` Playwright 검색·크롤 |
| E2 Evidence Engine | URL·Confidence·dedup |
| E3 Research Workflow | Browser → Merge → Decision |
| E4 UI | 진행률·출처·Evidence 리스트 |

**Leverage:** `packages/browser`, `research/providers/` registry

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

**Status:** Complete  
**Goal:** Fix i18n bug — translation keys must never appear in UI. Korean + English fully supported with en fallback chain.

| Task | Status | Owner |
|------|--------|-------|
| Merge en fallback in loadMessages | ✅ Done | AI |
| Complete ko.json (867 keys) | ✅ Done | AI |
| getMessageFallback + humanize | ✅ Done | AI |
| PM terminology glossary (common.terminology) | ✅ Done | AI |
| Locale date/number formatters | ✅ Done | AI |
| Language test page (/dev/localization) | ✅ Done | AI |
| Hardcoded PageHeader fixes | ✅ Done | AI |
| Project status badge i18n | ✅ Done | AI |
| Intelligence ko translations (198 keys) | ✅ Done | AI |
| Locale switcher + NextIntlClientProvider locale | ✅ Done | AI |
| VOC summary + navLinks back navigation | ✅ Done | AI |

---

## Sprint 5.9b — Screen i18n Gate (Pre–Sprint 7) ✅

**Status:** Complete  
**Goal:** All feature detail/preview/form screens localized before next sprint. No hardcoded English in user-visible copy when locale=ko.

| Task | Status | Owner |
|------|--------|-------|
| common.fields / placeholders / actions keys | ✅ Done | AI |
| Feature detail + preview + form i18n (29 components) | ✅ Done | AI |
| Locale-aware dates (useLocalizedFormatters) | ✅ Done | AI |
| Sync keys to all 11 locales | ✅ Done | AI |
| Build verify | ✅ Done | AI |

**Gate:** Sprint 7+ feature work may proceed.

---

## Sprint 7.0 — Product Analytics & Operations 🔄

**Status:** Complete  
**Goal:** Operable SaaS foundation — analytics, consent, ops dashboard, health endpoints, SEO, error tracking.

| EPIC | Task | Status | Owner |
|------|------|--------|-------|
| 1 | GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) + provider | ✅ Done | AI |
| 2 | `lib/analytics` trackPage/Event/Error/Timing + useAnalytics | ✅ Done | AI |
| 3 | Required product events (dashboard, CRUD, AI generate, locale, theme) | ✅ Done | AI |
| 4 | Cookie consent banner (localStorage, accept/reject) | ✅ Done | AI |
| 5 | Admin → Operations dashboard (mock + live event store) | ✅ Done | AI |
| 6 | `/health`, `/version`, `/build-info` endpoints | ✅ Done | AI |
| 7 | Core Web Vitals (LCP, CLS, INP) | ✅ Done | AI |
| 8 | DEV analytics console logging | ✅ Done | AI |
| 9 | Global error boundary + 404/500 tracking | ✅ Done | AI |
| 10 | SEO (OG, robots, sitemap, canonical) | ✅ Done | AI |
| — | Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

**Next:** Sprint L2.2 Project Workspace Home (migration gate PASS)

---

## Sprint L2.0.1 — Production Gate ⛔ PM ACTION

**Status:** Migration PASS — remaining OAuth QA + merge/deploy
**Goal:** Migration + OAuth + merge/deploy before production E2E.

| Gate | Status | Owner |
|------|--------|-------|
| Run `016_user_workspace.sql` + `017_onboarding_context.sql` | ✅ Done | PM |
| `node scripts/verify-supabase-migrations.mjs` → PASS | ✅ PASS | PM |
| Google OAuth redirect + login/logout/session QA | ⛔ Pending | PM |
| Merge `sprint-L2.1/ai-onboarding-consultant` → `main` + deploy | ⛔ Pending | PM |

**Verify command:** `node scripts/verify-supabase-migrations.mjs`

---

## Sprint L2 — Google Auth & First Project Experience ✅

**Status:** Complete (branch `sprint-L2/auth-first-project`, commit `6477fdc`)  
**Goal:** Landing → Google Login → Project Wizard → Dashboard activation path.

---

## Sprint L2.1 — AI Onboarding Consultant ✅

**Status:** Complete (branch `sprint-L2.1/ai-onboarding-consultant`, commit `c282db0`)  
**Goal:** Wizard → AI 5-question interview → Research Plan → Orchestrator start.

| EPIC | Status |
|------|--------|
| Welcome Consultant modal | ✅ Done |
| 5-step interview + summary | ✅ Done |
| Auto research plan + Start AI | ✅ Done |
| Consultant memory/context | ✅ Done |
| Analytics + i18n (ko/en) | ✅ Done |

**Note:** Conversational follow-up (answer → feedback → next Q) deferred to L3 (real LLM).

**Next:** L2.0.1 gate PASS → merge → deploy → Sprint L2.2

---

## Sprint L2.2 — Project Workspace Home 🚧 IN PROGRESS

**Status:** In progress (branch `sprint-L2.2/project-workspace-home`)
**Goal:** Expand existing `ProjectWorkspaceOverview` into a Notion-like Project Home (not a new route).
**Base:** `apps/web/features/workspace-home/` + `project-workspace-overview.tsx`
**Roles:** Dashboard = project list · Project Home = single-project workspace

| EPIC | Scope | Status |
|------|-------|--------|
| 1 | Project Hero (name, desc, progress, decision, confidence, updated) | ✅ Done |
| 2 | Today's Focus — AI Top 3 recommended tasks | ✅ Done |
| 3 | Project Progress steps (Research → Report) | ✅ Done |
| 4 | Recent Activity timeline | ✅ Done |
| 5 | AI Consultant Summary — right panel always visible | ✅ Done |
| 6 | Knowledge Snapshot counts | ✅ Done |
| 7 | Recent Reports | ✅ Done |
| 8 | Workspace tabs (Overview, Research, Decision, Report, Activity) | ✅ Done |
| 9 | Quick Actions (+ Research, Run AI, Decision, Report) | ✅ Done |
| 10 | Empty UX — AI suggests first market research | ✅ Done |
| — | Analytics: workspace_open, workspace_continue, workspace_action, workspace_tab | ✅ Done |
| — | i18n: `workspace.home.*` (en/ko + 11 locales) | ✅ Done |

**Completion:** Build ✅ · push + deploy + `/health` + E2E pending

---

**Next:** Sprint L2 — Google Login + Supabase Auth

---

## Sprint L1 — Landing Page & First Experience ✅

**Status:** Complete  
**Goal:** SaaS launch foundation — Landing as service face, Demo → Dashboard without login.

| Task | Status | Owner |
|------|--------|-------|
| Landing page at `/` (Hero, Trusted, How it Works, Features) | ✅ Done | AI |
| AI Consultant Demo section + Hero preview mock | ✅ Done | AI |
| Use Cases, Pricing Preview, FAQ (10), Footer | ✅ Done | AI |
| AppShell bypass on `/` via AppShellGate + AppShellWrapper | ✅ Done | AI |
| Landing analytics (landing_view, cta_start, cta_demo, pricing_view, faq_expand) | ✅ Done | AI |
| SEO metadata + OpenGraph + Twitter + JSON-LD schema | ✅ Done | AI |
| Privacy / Terms placeholder pages | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint L2 — Google Login + Supabase Auth + User Workspace

---

## Sprint 8.9 — AI Strategy Consultant ✅

**Status:** Complete  
**Goal:** Project-aware AI Consultant panel on Dashboard — not ChatGPT UI, but consultant that speaks first with analysis, recommendations, and actions.

| EPIC | Task | Status | Owner |
|------|------|--------|-------|
| 1 | Consultant Overview — module progress analysis | ✅ Done | AI |
| 2 | Top 5 Recommendations (priority, impact, time) | ✅ Done | AI |
| 3 | Project Context (industry, stage, target, score, decision) | ✅ Done | AI |
| 4 | AI Questions — proactive gaps (target, market, grants) | ✅ Done | AI |
| 5 | AI Memory — recent executions, analyses, reports | ✅ Done | AI |
| 6 | Action Buttons — AI investigate, Decision, Report, Research | ✅ Done | AI |
| 7 | Suggested Prompts — market, competitors, grants, risks, GO | ✅ Done | AI |
| 8 | Consultant Feed — activity log | ✅ Done | AI |
| — | Analytics: consultant_open/action/question/prompt/report | ✅ Done | AI |
| — | Dashboard right panel integration | ✅ Done | AI |
| — | i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| — | Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.8 — Guided Strategy Workspace ✅

**Status:** Complete  
**Goal:** UX Flow — AI가 사용자를 끝까지 안내하는 Guided Strategy Workspace (기능 추가 아님, 진행 흐름 구축).

| EPIC | Task | Status | Owner |
|------|------|--------|-------|
| 1 | Strategy Progress Hero (0–100%, stage, ETA, remaining tasks) | ✅ Done | AI |
| 2 | Next Best Action — single AI-recommended CTA | ✅ Done | AI |
| 3 | Project Checklist (Research → Report, auto-check) | ✅ Done | AI |
| 4 | Workspace Timeline (chronological flow) | ✅ Done | AI |
| 5 | Module completion badges (per-stage %) | ✅ Done | AI |
| 6 | Project Health (AI Score, Progress, Risk, Confidence) | ✅ Done | AI |
| 7 | Quick Actions bar (Research, Decision, Report, Run AI) | ✅ Done | AI |
| 8 | StrategyEmptyState + existing ConsultingEmptyState on list pages | ✅ Done | AI |
| — | Analytics: strategy_start/continue/complete, next_action_click, timeline_click | ✅ Done | AI |
| — | i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| — | Dashboard integration | ✅ Done | AI |
| — | Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.7 — Executive Report Engine ✅

**Status:** Complete  
**Goal:** Executive Report Platform — Report Builder, Template Engine, slide Preview, Export Queue, Version + Reviewer workflow models.

| Task | Status | Owner |
|------|--------|-------|
| `features/report-engine/` — types, builder, sections, templates | ✅ Done | AI |
| Story-driven section order (consulting report flow) | ✅ Done | AI |
| Report Version model (Draft → Internal Review → Approved) | ✅ Done | AI |
| Reviewer Workflow model + placeholder UI | ✅ Done | AI |
| Export Queue (REQUESTED → GENERATING → COMPLETED) | ✅ Done | AI |
| Mock ExportProvider — PDF / PPTX / DOCX | ✅ Done | AI |
| Executive Report Preview (section list + slide preview) | ✅ Done | AI |
| Dashboard Export → Preview wiring | ✅ Done | AI |
| Analytics: report_preview/generate/export/template_change | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.6 — Executive Decision Workspace ✅

**Status:** Complete  
**Goal:** Rebuild Dashboard as Executive Decision Workspace — CEO/CFO-ready single screen integrating Decision, Market, Framework, Agent, Orchestrator outputs.

| Task | Status | Owner |
|------|--------|-------|
| `features/executive/` — workspace service, KPI registry, inbox mock | ✅ Done | AI |
| Executive Dashboard (new — not legacy Intelligence Dashboard) | ✅ Done | AI |
| Executive Hero, Summary, Decision Status, Key Metrics | ✅ Done | AI |
| Strategic Risks + Opportunities + Risk Matrix | ✅ Done | AI |
| Execution Status (Orchestrator timeline) | ✅ Done | AI |
| Decision Drivers + Confidence Lineage (reuse) | ✅ Done | AI |
| Recommended Actions + Supporting Evidence | ✅ Done | AI |
| Scenario Planning + Executive Inbox placeholders | ✅ Done | AI |
| Export bar placeholder (PDF/PPT/DOCX — Sprint 8.7) | ✅ Done | AI |
| Analytics: dashboard_open, executive_summary_view, risk_view, action_click, export_click | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.5 — AI Strategy Orchestrator ✅

**Status:** Complete  
**Goal:** AI Strategy OS — Orchestrator plans tasks, schedules agents, merges knowledge/evidence, triggers Decision (orchestrator-only); human-in-the-loop controls.

| Task | Status | Owner |
|------|--------|-------|
| `features/agents/orchestrator/` — types, planner, registry, scheduler | ✅ Done | AI |
| Agent Registry — 9 agents with common `StrategyAgentWorker` interface | ✅ Done | AI |
| Strategy Planner — task trees (Startup / Enterprise / AI Initiative) | ✅ Done | AI |
| Agent Scheduler — dependency graph, parallel execution, retry 3x | ✅ Done | AI |
| Knowledge Merge + Evidence Merge + Confidence Lineage | ✅ Done | AI |
| Decision Trigger — orchestrator-only Decision call after approval | ✅ Done | AI |
| Cost tracking (provider, duration, tokens, cost, retries) | ✅ Done | AI |
| Human-in-the-loop — rerun / pause / resume per agent | ✅ Done | AI |
| Dashboard AI Execution Center + Execution Graph | ✅ Done | AI |
| Analytics: planner_start/complete, agent_schedule/retry, knowledge_merge | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Rule:** Only Orchestrator may call Decision Engine — agents produce evidence/knowledge only.

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.4 — AI Research Agent Foundation ✅

**Status:** Complete  
**Goal:** Provider-based research agent architecture — job queue, state machine, evidence builder, approval workflow; Mock active.

| Task | Status | Owner |
|------|--------|-------|
| `features/agents/research/` provider pattern (Mock + stubs) | ✅ Done | AI |
| Task planner + state machine + async job queue | ✅ Done | AI |
| Mock knowledge store + execution history | ✅ Done | AI |
| Approval workflow (Review → Approve/Reject) | ✅ Done | AI |
| Research tab — AI result + Agent Timeline | ✅ Done | AI |
| Dashboard AI Activity panel | ✅ Done | AI |
| Analytics: agent_start/complete/failed, research_execute/review | ✅ Done | AI |
| Prompt templates + i18n | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Rule:** Research Agent never calls Decision Engine — evidence only.

**Next:** Sprint 9.0 — Real LLM (Claude API)

---

## Sprint 8.3 — AI Market Intelligence Engine ✅

**Status:** Complete  
**Goal:** AI-performed market analysis as Decision input module — TAM/SAM/SOM, growth, competition, demand, trends; no standalone menu.

| Task | Status | Owner |
|------|--------|-------|
| `features/market-intelligence/` service layer (engine, selector, provider) | ✅ Done | AI |
| Mock provider — TAM, SAM, SOM, CAGR, maturity, trends, players, opportunities/threats | ✅ Done | AI |
| Decision integration (market score, drivers, explain mode) | ✅ Done | AI |
| Framework integration (PESTEL, Porter, SWOT use market intel) | ✅ Done | AI |
| Dashboard Market Snapshot below Decision Summary | ✅ Done | AI |
| Analytics: market_analysis_execute, market_snapshot_view, market_detail_view | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Architecture:** `MarketEngine` → `MarketSelector` → `MarketProvider` → `MarketResult` — runs before Framework and Decision scoring.

**Next:** Sprint 8.4 — AI Research Agent ✅

---

## Sprint 8.2 — AI Strategy Framework Engine ✅

**Status:** Complete  
**Goal:** Frameworks as Decision analysis modules (not standalone menus) — orchestrator, selector, 11 frameworks, Decision score integration, accordion UI, analytics, locale.

| Task | Status | Owner |
|------|--------|-------|
| `features/framework/` service layer (engine, selector, provider) | ✅ Done | AI |
| Mock provider — 11 frameworks (SWOT, PESTEL, Porter, 3C, STP, BCG, Ansoff, Value Chain, BMC, Lean Canvas, JTBD) | ✅ Done | AI |
| Decision integration (score impact, drivers, explain mode) | ✅ Done | AI |
| Framework Summary accordion in Decision Center + Dashboard badges | ✅ Done | AI |
| Analytics: framework_execute, framework_view, framework_detail | ✅ Done | AI |
| i18n (en/ko + sync 11 locales) + LLM prompt stubs | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Architecture:** `FrameworkEngine` → `FrameworkSelector` → `FrameworkProvider` → `FrameworkResult[]` — invoked from `generateProjectDecision()` before Decision scoring.

**Next:** Sprint 8.3 — Market Intelligence Engine ✅

---

## Sprint 8.1 — Explainable Decision Engine (XAI) ✅

**Status:** Complete  
**Goal:** Transparent decision-making — drivers, evidence coverage, explain score, supporting evidence, Why? explain mode.

| Task | Status | Owner |
|------|--------|-------|
| `decision-explainer.ts` XAI layer | ✅ Done | AI |
| Enhanced confidence (volume, quality, recency, trust) | ✅ Done | AI |
| Decision Center restructure (CEO Summary → Drivers → Evidence) | ✅ Done | AI |
| Why? Explain Mode + Decision Logic dialog | ✅ Done | AI |
| Analytics: explain_view, driver_click, missing_data_click | ✅ Done | AI |
| Build + deploy + verify | ✅ Done | AI |

**Next:** Sprint 8.2 — Strategy Framework Engine ✅

---

## Sprint 8.0 — AI Decision Center ✅

**Status:** Complete  
**Goal:** Conclusion-first UX — Decision Center as top-level menu; mock Decision Engine with swappable providers; Dashboard Decision Summary above AI summary.

| Task | Status | Owner |
|------|--------|-------|
| Decision service layer (types, score, mock provider, engine) | ✅ Done | AI |
| Provider pattern (Mock, OpenAI, Anthropic, Gemini, Ollama stubs) | ✅ Done | AI |
| Decision Center page (`/decision-center`, `/projects/[id]/decision`) | ✅ Done | AI |
| Dashboard Decision Summary (Hero → Decision → AI Summary) | ✅ Done | AI |
| Sidebar IA: Decision Center after Dashboard | ✅ Done | AI |
| i18n `decision.*` keys (en/ko + sync 11 locales) | ✅ Done | AI |
| Analytics: `decision_view`, `decision_generate`, `decision_action_click` | ✅ Done | AI |
| Build + lint + deploy + verify | ✅ Done | AI |

**Architecture:** `DecisionService` → `getDecisionProvider()` → `MockDecisionProvider` (default). LLM providers stubbed for Sprint 8.2+.

**Next:** Sprint 8.1 — Explainable Decision Engine ✅

---

## Sprint 6.0 — Product Pivot (AI Strategy Consultant) ✅
**Goal:** Reposition LaunchLens from startup-only validation to **AI Strategy Consultant** platform. Minimal DB change; reuse existing engines.

| Task | Status | Owner |
|------|--------|-------|
| Brand: AI Strategy Consultant tagline | ✅ Done | AI |
| Sidebar: Workspace / Strategy / Analysis / AI Studio / Knowledge | ✅ Done | AI |
| Project type enum + migration 015 | ✅ Done | AI |
| Project create wizard (type selection) | ✅ Done | AI |
| Project type badge on cards | ✅ Done | AI |
| Rename Validation → Decision Engine (labels) | ✅ Done | AI |
| Rename Reports → Decision Report, Business Plan → Strategy Report | ✅ Done | AI |
| Placeholder: Business Strategy, Market Intelligence | ✅ Done | AI |
| Build + lint + deploy + verify | ✅ Done | AI |

**Migration:** Run `packages/db/src/migration/015_project_type.sql` in Supabase before creating non-STARTUP projects.

**Out of scope (Sprint 6.1+):** Full project wizard UX, SWOT/PEST frameworks, executive dashboard, Decision AI personas.

---

## Sprint PX 1.0 — Product Experience Bible 🔄

**Status:** Draft complete — awaiting PM Design Review  
**Goal:** Define *why* LaunchLens exists and how it should feel. **No code.**  
**Design 5.0 / 5.1 implementation:** ❌ **Blocked** until PX Review sign-off

| Task | Status | Owner |
|------|--------|-------|
| Product Philosophy & positioning | ✅ Draft | PM/AI |
| Brand Voice | ✅ Draft | PM/AI |
| AI + Expert Personas (VC, PM, CTO, Marketing) | ✅ Draft | PM/AI |
| Information Hierarchy (Decision → Evidence → Documents) | ✅ Draft | PM/AI |
| Decision First Principle | ✅ Draft | PM/AI |
| User Journey + Success Moment | ✅ Draft | PM/AI |
| Empty State / Micro Copy / Motion / Accessibility | ✅ Draft | PM/AI |
| AI Summary / Action Center / Dashboard Rules | ✅ Draft | PM/AI |
| Future Vision | ✅ Draft | PM/AI |
| PM Design Review sign-off | ⏳ Pending | PM |

**Deliverable:** [docs/LAUNCHLENS_PRODUCT_EXPERIENCE.md](./LAUNCHLENS_PRODUCT_EXPERIENCE.md)

**Roadmap after review:**
1. PX 1.0 Review
2. Design 5.1 — Shell + Dashboard
3. Design 5.2 — Project + Evidence + Research
4. Design 5.3 — AI Studio + AI Consultant

---

## Sprint Design 5.0A — Design System (companion) ✅ Draft

**Status:** Draft — subordinate to Product Experience Bible  
**Deliverable:** [docs/LAUNCHLENS_DESIGN_SYSTEM.md](./LAUNCHLENS_DESIGN_SYSTEM.md)

---

## Sprint 14 — AI Startup Validation Agent ✅

**Status:** Complete  
**Goal:** Knowledge + Validation 통합 AI 창업 컨설턴트 Agent.

| Task | Status | Owner |
|------|--------|-------|
| `@repo/ai` validation-agent prompt + generator | ✅ Done | AI |
| Agent context (Validation + Knowledge search) | ✅ Done | AI |
| `askValidationAgent()` server action | ✅ Done | AI |
| `/projects/[id]/agent` UI | ✅ Done | AI |
| Project Detail → Agent CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 13 — AI Knowledge Base & Evidence Intelligence ✅

**Status:** Complete  
**Goal:** Evidence 기반 Knowledge Base 구조 — Chunk, Mock Vector Search, Query API.

| Task | Status | Owner |
|------|--------|-------|
| `knowledge_documents` + `knowledge_chunks` migration + seed | ✅ Done | AI |
| KnowledgeDocument + Chunk repositories | ✅ Done | AI |
| `@repo/ai/knowledge` chunker + vector-store + retriever | ✅ Done | AI |
| `processEvidence()` / `queryKnowledge()` actions | ✅ Done | AI |
| `/projects/[id]/knowledge` list + process button | ✅ Done | AI |
| `/projects/[id]/knowledge/query` search UI | ✅ Done | AI |
| VectorStore interface + MockVectorStore | ✅ Done | AI |
| Project Detail → Knowledge CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 12 — AI Development Specification Generator ✅

**Status:** Complete  
**Goal:** PRD 기반 개발팀이 바로 사용할 수 있는 Technical Specification 자동 생성.

| Task | Status | Owner |
|------|--------|-------|
| `development_specs` + `development_spec_sections` migration + seed | ✅ Done | AI |
| DevelopmentSpecRepository + SectionRepository | ✅ Done | AI |
| `@repo/ai` development-spec prompt + generator | ✅ Done | AI |
| Context collector (+ PRD + Validation Report) | ✅ Done | AI |
| generateDevelopmentSpec / CRUD actions | ✅ Done | AI |
| `/projects/[id]/development-spec` list + AI generate | ✅ Done | AI |
| Editor + Preview | ✅ Done | AI |
| PRD relation (prdId FK) | ✅ Done | AI |
| Project Detail → Dev Spec CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 11 — AI PRD Generator ✅

**Status:** Complete  
**Goal:** 검증 완료된 Startup Project 기반 개발 가능 PRD 자동 생성.

| Task | Status | Owner |
|------|--------|-------|
| `prd_documents` + `prd_sections` migration + seed | ✅ Done | AI |
| PRDRepository + PRDSectionRepository | ✅ Done | AI |
| `@repo/ai` prd-generator prompt + generator | ✅ Done | AI |
| Context collector (+ Validation Report + Business Plan) | ✅ Done | AI |
| generatePRD / CRUD actions | ✅ Done | AI |
| `/projects/[id]/prd` list + AI generate | ✅ Done | AI |
| Editor (Edit/Save/Delete) + Preview | ✅ Done | AI |
| Project Detail → PRD CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 10 — AI Business Plan Generator ✅

**Status:** Complete  
**Goal:** AI 기반 Business Plan 생성 — 정부지원/투자용 (PDF Export 없음).

| Task | Status | Owner |
|------|--------|-------|
| `business_plans` + `business_plan_sections` migration + seed | ✅ Done | AI |
| BusinessPlanRepository + SectionRepository | ✅ Done | AI |
| `@repo/ai` business-plan prompt + generator | ✅ Done | AI |
| Context collector (+ Validation Report) | ✅ Done | AI |
| generateBusinessPlan / CRUD actions | ✅ Done | AI |
| `/projects/[id]/business-plan` list + AI generate | ✅ Done | AI |
| Editor + Preview | ✅ Done | AI |
| Project Detail → Business Plan CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 9 — AI Validation Report Generator ✅

**Status:** Complete  
**Goal:** Project 데이터 기반 AI Report 초안 생성 — Prompt pipeline (RAG/Agent 없음).

| Task | Status | Owner |
|------|--------|-------|
| `@repo/ai` validation module (client, context, prompt, generator) | ✅ Done | AI |
| OpenAI + Anthropic HTTP provider | ✅ Done | AI |
| `ai_report_generations` migration | ✅ Done | AI |
| Context collector (7 data sources) | ✅ Done | AI |
| generateValidationReport / getGenerationStatus | ✅ Done | AI |
| Report Detail → AI Report 생성 버튼 | ✅ Done | AI |
| JSON Zod validation + retry | ✅ Done | AI |
| Mock fallback (no API key) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 8 — Validation Report Framework ✅

**Status:** Complete  
**Goal:** Report + Section CRUD, Markdown editor, Preview (AI 생성/PDF Export 없음).

| Task | Status | Owner |
|------|--------|-------|
| `validation_reports` + `report_sections` migration + seed | ✅ Done | AI |
| ValidationReportRepository + ReportSectionRepository | ✅ Done | AI |
| Server Actions (create/update/delete/reorder) | ✅ Done | AI |
| `/projects/[id]/reports` card list | ✅ Done | AI |
| `/projects/[id]/reports/new` + 10 default sections | ✅ Done | AI |
| `/projects/[id]/reports/[reportId]` detail + section edit | ✅ Done | AI |
| `/projects/[id]/reports/[reportId]/preview` read-only | ✅ Done | AI |
| Markdown editor + preview | ✅ Done | AI |
| Section order (up/down) | ✅ Done | AI |
| Project Detail → Reports CTA | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 7 — Validation Score Engine ✅

**Status:** Complete  
**Goal:** GO / NO GO 평가 Score Engine — 수동 입력 기반 점수화 (AI/LLM 자동 판단 없음).

| Task | Status | Owner |
|------|--------|-------|
| `validation_scores` DB migration + seed | ✅ Done | AI |
| ValidationScoreRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/get/getHistory) | ✅ Done | AI |
| `/projects/[id]/validation` Score Dashboard | ✅ Done | AI |
| `/projects/[id]/validation/new` create form | ✅ Done | AI |
| `/projects/[id]/validation/history` history table | ✅ Done | AI |
| `/projects/[id]/validation/summary` strength/risk | ✅ Done | AI |
| Radar Chart + Progress Circle | ✅ Done | AI |
| Project Detail → Validation CTA | ✅ Done | AI |
| Zod validation (0–20 / 0–15 per category) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 6 — Government Support Intelligence ✅

**Status:** Complete  
**Goal:** 정부지원사업 CRUD + Filtering + Dashboard (자동 검색/AI 추천 없음).

| Task | Status | Owner |
|------|--------|-------|
| `government_grants` DB migration + seed | ✅ Done | AI |
| GovernmentGrantRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/getList/getDashboard) | ✅ Done | AI |
| `/projects/[id]/grants` card list + filters | ✅ Done | AI |
| `/projects/[id]/grants/new` create form | ✅ Done | AI |
| `/projects/[id]/grants/[grantId]` detail + edit + delete | ✅ Done | AI |
| `/projects/[id]/grants/dashboard` stats + chart + calendar | ✅ Done | AI |
| Project Detail → Grants CTA | ✅ Done | AI |
| Zod validation (name, organization required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 5 — VOC Analysis System ✅

**Status:** Complete  
**Goal:** VOC CRUD + Filtering + Summary Dashboard (AI 감성 분석/자동 수집 없음).

| Task | Status | Owner |
|------|--------|-------|
| `voc_entries` DB migration + seed | ✅ Done | AI |
| VOCRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/getList/getSummary) | ✅ Done | AI |
| `/projects/[id]/voc` card list + filters | ✅ Done | AI |
| `/projects/[id]/voc/new` create form | ✅ Done | AI |
| `/projects/[id]/voc/[vocId]` detail + edit + delete | ✅ Done | AI |
| `/projects/[id]/voc/summary` dashboard + Recharts | ✅ Done | AI |
| Project Detail → VOC CTA | ✅ Done | AI |
| Zod validation (title, content, painPoint required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 4 — Competitor Intelligence ✅

**Status:** Complete  
**Goal:** Startup Project별 경쟁사 CRUD + Comparison Matrix (AI 자동 분석 없음).

| Task | Status | Owner |
|------|--------|-------|
| `competitors` DB migration + seed | ✅ Done | AI |
| CompetitorRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/get/compare) | ✅ Done | AI |
| `/projects/[id]/competitors` card list | ✅ Done | AI |
| `/projects/[id]/competitors/new` create form | ✅ Done | AI |
| `/projects/[id]/competitors/[competitorId]` detail + edit + delete | ✅ Done | AI |
| `/projects/[id]/competitors/compare` matrix | ✅ Done | AI |
| Project Detail → Competitors CTA | ✅ Done | AI |
| Zod validation (name, category required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 3 — Evidence Database ✅

**Status:** Complete  
**Goal:** Research 결과를 뒷받침하는 Evidence CRUD — 근거 저장 Framework (AI 자동 수집 없음).

| Task | Status | Owner |
|------|--------|-------|
| `evidence` DB migration + seed | ✅ Done | AI |
| EvidenceRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/getList/getDetail) | ✅ Done | AI |
| `/projects/[id]/evidence` list + filters | ✅ Done | AI |
| `/projects/[id]/evidence/new` create form | ✅ Done | AI |
| `/projects/[id]/evidence/[evidenceId]` detail + edit + delete | ✅ Done | AI |
| Research Plan optional link | ✅ Done | AI |
| Project Detail → Evidence CTA | ✅ Done | AI |
| Zod validation (title, category, summary required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 2 — Research Master Plan ✅

**Status:** Complete  
**Goal:** Startup Project별 Research Plan CRUD — 검증 항목 설계 Framework (AI 실행 없음).

| Task | Status | Owner |
|------|--------|-------|
| `research_plans` DB migration + seed | ✅ Done | AI |
| ResearchPlanRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/get) | ✅ Done | AI |
| `/projects/[id]/research` list page | ✅ Done | AI |
| `/projects/[id]/research/new` create form | ✅ Done | AI |
| `/projects/[id]/research/[researchId]` detail + edit + delete | ✅ Done | AI |
| Project Detail → Research Plans CTA | ✅ Done | AI |
| Zod validation (title, researchType required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 1 — Startup Project Workspace ✅

**Status:** Complete  
**Goal:** 창업 아이디어 Project CRUD — 입력, 저장, 목록, 상세, 수정, 삭제.

| Task | Status | Owner |
|------|--------|-------|
| `startup_projects` DB migration + seed | ✅ Done | AI |
| StartupProjectRepository (@repo/db) | ✅ Done | AI |
| Server Actions (create/update/delete/get) | ✅ Done | AI |
| `/projects` list page | ✅ Done | AI |
| `/projects/new` create form | ✅ Done | AI |
| `/projects/[id]` detail + edit + delete | ✅ Done | AI |
| Zod validation (title, summary required) | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 0 — Project Foundation ✅

**Status:** Complete  
**Goal:** AI Startup Validation Framework 개발 기반 구축. 기능 개발 없음.

| Task | Status | Owner |
|------|--------|-------|
| Rebrand to AI Startup Validation Framework | ✅ Done | AI |
| Sidebar navigation (10 menus) | ✅ Done | AI |
| Route pages with Empty State | ✅ Done | AI |
| Select, Table components in @repo/ui | ✅ Done | AI |
| Validation domain types in @repo/types | ✅ Done | AI |
| Placeholder packages (research, evidence) | ✅ Done | AI |
| Theme (Light/Dark) + Global Layout | ✅ Done | AI |
| Mobile responsive navigation | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |
| SPRINT_RESULT.md | ✅ Done | AI |

---

## Sprint 2-2 — AI Project Operating System ✅

**Status:** Complete  
**Goal:** Build AI-first project management system (rules + docs). No feature code.

| Task | Status | Owner |
|------|--------|-------|
| Create `.cursor/rules/*.mdc` (10 rules) | ✅ Done | AI |
| Create operational docs (DECISIONS, BACKLOG, etc.) | ✅ Done | AI |
| Create `docs/templates/` | ✅ Done | AI |
| Create GitHub issue/PR templates | ✅ Done | AI |
| Update README with architecture diagram | ✅ Done | AI |
| Create PROJECT_STRUCTURE.md | ✅ Done | AI |
| Create DEVELOPMENT_WORKFLOW.md | ✅ Done | AI |
| Create AI_WORKFLOW.md | ✅ Done | AI |
| Verify pnpm lint && pnpm build | ✅ Done | AI |

---

## Sprint 2-1 — Backend Infrastructure ✅

**Status:** Complete

| Task | Status |
|------|--------|
| `@repo/core` (env, logger, errors, response, validation) | ✅ |
| `@repo/types` | ✅ |
| `@repo/utils` | ✅ |
| Repository/Service interfaces | ✅ |
| `docs/BACKEND_ARCHITECTURE.md` | ✅ |
| `/api/health` demo route | ✅ |

---

## Sprint 1 — UI Foundation ✅

**Status:** Complete

| Task | Status |
|------|--------|
| shadcn/ui in `@repo/ui` | ✅ |
| Theme provider + dark mode | ✅ |
| App shell layout | ✅ |
| `docs/ARCHITECTURE.md` | ✅ |

---

## Sprint 3 — Database Platform ✅

**Status:** Complete  
**Goal:** Hexagonal database platform — Supabase adapter only in `@repo/db`.

| Task | Status |
|------|--------|
| `@repo/db` package | ✅ |
| SupabaseClientFactory (browser/server/admin/service) | ✅ |
| UserRepository, OrganizationRepository, ProjectRepository | ✅ |
| Auth, Storage, Realtime ports + adapters | ✅ |
| DI container (DbContainer, DbTokens) | ✅ |
| Env in `@repo/db/env` | ✅ |
| Migration SQL + seed placeholder | ✅ |
| `packages/features/` placeholder | ✅ |
| Documentation + `apps/web/lib/db/platform.ts` | ✅ |

---

## Sprint 4 — Enterprise Auth & Authorization Platform ✅

**Status:** Complete  
**Goal:** Permission Platform — Authentication (Supabase) and Authorization (owned) fully separated. No login UI.

| Task | Status |
|------|--------|
| `@repo/feature-auth` package structure | ✅ |
| Domain models (User, Organization, Role, Permission, Session, AuditLog) | ✅ |
| Permission Engine (Registry, Resolver, Checker, Guard, Provider) | ✅ |
| RBAC — 6 roles, 12 permissions | ✅ |
| Middleware (requireLogin, requireRole, requirePermission, requireOrganization) | ✅ |
| Hooks (useSession, useUser, usePermission, useRole) | ✅ |
| Components (Protected, PermissionGate, RoleGate, SessionProvider) | ✅ |
| Audit logger | ✅ |
| `apps/web/lib/auth/platform.ts` | ✅ |
| `docs/AUTH_PLATFORM.md`, `docs/RBAC.md`, `docs/SECURITY_MODEL.md` | ✅ |
| Quality docs (QUALITY_REPORT, TECH_DEBT, TEST_COVERAGE) | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Sprint 5 — AI Platform (Core) ✅

**Status:** Complete  
**Goal:** Provider-agnostic AI Platform — no LLM SDK in applications.

| Task | Status |
|------|--------|
| `@repo/ai` package structure | ✅ |
| Provider Registry (6 providers) | ✅ |
| Model Registry (6 model kinds) | ✅ |
| Chat API (chat, stream, complete, generateJSON, generateObject) | ✅ |
| Prompt Manager with versioning | ✅ |
| Unified streaming interface | ✅ |
| Tool Calling (Registry, Executor) | ✅ |
| Embeddings/RAG/Memory interfaces | ✅ |
| Observability + Token Manager + Cache | ✅ |
| Error hierarchy | ✅ |
| Interface tests (Vitest, 20 tests) | ✅ |
| `apps/web/lib/ai/platform.ts` | ✅ |
| AI documentation (5 docs) | ✅ |
| Quality docs updated | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Sprint 6 — MCP Runtime Platform ✅

**Status:** Complete  
**Goal:** Provider-agnostic MCP Runtime — not a tool collection.

| Task | Status |
|------|--------|
| `@repo/mcp` package structure | ✅ |
| MCPRuntime (initialize, register, execute, shutdown) | ✅ |
| ToolRegistry with ToolMetadata (Zod) | ✅ |
| WorkflowEngine (sequential, parallel, conditional, retry, timeout) | ✅ |
| ExecutionContext + PermissionResolver | ✅ |
| Transport interfaces (STDIO, HTTP, WebSocket, SSE) | ✅ |
| Discovery (Server, Tool, Capability) | ✅ |
| MCPGateway | ✅ |
| 10 adapter stubs | ✅ |
| Metrics + Logging | ✅ |
| Interface tests (16 tests) | ✅ |
| `apps/web/lib/mcp/platform.ts` | ✅ |
| MCP documentation (5 docs) | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Sprint 7 — Automation Platform ✅

**Status:** Complete  
**Goal:** Real automation engine — scheduled jobs, queue, pipelines. Demo Naver flow.

| Task | Status |
|------|--------|
| `@repo/automation` package | ✅ |
| Scheduler (cron, once, delayed, recurring) | ✅ |
| Queue (Memory + interfaces) | ✅ |
| Job system (registry, runner) | ✅ |
| Pipeline engine | ✅ |
| Execution manager + worker pool | ✅ |
| Retry engine + DLQ interface | ✅ |
| Events, notifications, metrics, logging | ✅ |
| Demo jobs + Naver pipeline | ✅ |
| Interface tests (9 tests) | ✅ |
| Documentation (5 docs) | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Sprint 8 — Browser Platform ✅

**Status:** Complete  
**Goal:** Replace `browser.crawl` stub with production Playwright. Playwright only in `@repo/browser`.

| Task | Status |
|------|--------|
| `@repo/browser` package structure | ✅ |
| BrowserManager, BrowserPool, ContextManager, PageManager | ✅ |
| Navigation, Selectors, Download, Cookies, Screenshot, Network | ✅ |
| Events, Metrics, Logging, Errors | ✅ |
| PlaywrightCrawler + crawlPages API | ✅ |
| Replace `browser.crawl` job with real implementation | ✅ |
| Integration tests (local HTML fixture, no external sites) | ✅ |
| Naver pipeline E2E with real browser crawl | ✅ |
| `apps/web/lib/browser/platform.ts` | ✅ |
| Documentation (4 docs) | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Sprint 9 — Naver Commerce MVP ✅

**Status:** Complete  
**Goal:** First production feature — Naver auto product registration. No new platform packages.

| Task | Status |
|------|--------|
| `apps/web/modules/naver-commerce` module | ✅ |
| Pipeline service (crawl → extract → AI → images → draft) | ✅ |
| Module-local image-service (Sharp) | ✅ |
| AI content via `@repo/ai` | ✅ |
| UI dashboard + preview + pipeline status | ✅ |
| API routes (`/api/naver-commerce/*`) | ✅ |
| Product Draft JSON | ✅ |
| Tests (extractor, image, draft, pipeline) | ✅ |
| Documentation (3 docs) | ✅ |
| Verify pnpm lint && pnpm build | ✅ |

---

## Task Lifecycle

```
BACKLOG → TASKS (scheduled) → In Progress → Review → Done → RELEASES
```

When starting work, mark task **In Progress**. When merged, mark **Done** and update ROADMAP checkboxes.
