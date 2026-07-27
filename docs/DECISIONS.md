# Architecture Decision Records (ADR)

Records of significant architectural decisions. New decisions use [ADR_TEMPLATE.md](./templates/ADR_TEMPLATE.md).

---

## ADR-001: pnpm Monorepo with App Router

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 0

### Context

Need a foundation reusable across multiple AI SaaS products with shared UI and backend packages.

### Decision

Use pnpm workspace monorepo with `apps/web` (Next.js 15 App Router) and `packages/*`.

### Consequences

- Shared code via `@repo/*` packages
- Single install/build orchestration from root
- Requires `transpilePackages` for workspace imports in Next.js

---

## ADR-002: UI in `@repo/ui` with shadcn/ui

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 1

### Context

UI components must be shared across future apps without duplication.

### Decision

Install shadcn/ui into `packages/ui`, not individual apps. Tailwind v4 CSS-first config in `packages/ui/src/styles/globals.css`.

### Consequences

- Apps import `@repo/ui` and `@repo/ui/globals.css`
- shadcn CLI runs from `packages/ui` directory
- Design tokens centralized

---

## ADR-003: Database Adapter Pattern (No Direct SDK)

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 2-1

### Context

Most boilerplates embed Supabase SDK throughout the codebase, making DB migration costly.

### Decision

Implement Repository interface in `@repo/core` with no database SDK. Adapters (Supabase, Prisma, Neon) will live in `@repo/db` (Sprint 3+).

```
Application → Service → Repository → Adapter → Database
```

### Consequences

- Slower initial CRUD setup
- Trivial DB provider swap later
- Services and UI remain stable across migrations

---

## ADR-004: AI Project Operating System Before DB

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 2-2

### Context

AI-assisted development degrades without project context (rules, ADRs, sprint state).

### Decision

Build `.cursor/rules/` and operational docs (DECISIONS, TASKS, BACKLOG, templates) **before** connecting Supabase.

### Consequences

- Sprint 3+ AI sessions inherit full context
- Documentation maintenance becomes mandatory
- Differentiator vs typical Next.js starters

---

## ADR-005: T3 Env + Optional Integration Keys

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 2-1

### Context

Build must pass without `.env` until adapters are connected.

### Decision

Use `@t3-oss/env-nextjs` with required app vars and optional `DATABASE_URL`, `SUPABASE_*`, `OPENAI_API_KEY`.

### Consequences

- CI/build works out of the box
- Production deploy must set required keys for connected services

---

## ADR-006: Hexagonal Database Platform (`@repo/db`)

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 3

### Context

Sprint 3 requires Supabase integration without coupling the application to Supabase SDK.

### Decision

Create `@repo/db` with Ports (Auth, Storage, Realtime), Repository implementations, Supabase adapter, and DI container. `@supabase/supabase-js` installed **only** in `@repo/db`. Supabase env vars moved from `@repo/core` to `@repo/db/env`.

### Consequences

- Apps resolve `UserRepository` interface via `DbContainer`
- Swapping to Prisma/Firebase = new adapter package + container registration
- `packages/features/` placeholder for Sprint 4 domain modules

---

## ADR-007: Authentication / Authorization Separation

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 4

### Context

Enterprise SaaS requires flexible RBAC that survives role renames, tenant-specific permission configs, and DB provider changes. Coupling authorization to Supabase Auth or hardcoding role checks in app code creates long-term maintenance risk.

### Decision

Create `@repo/feature-auth` as a dedicated Permission Platform:

- **Authentication** remains in `@repo/db` AuthPort (Supabase)
- **Authorization** is owned by `@repo/feature-auth` (roles, permissions, RBAC, audit)
- Application code uses `PermissionChecker.canUser(user, PERMISSIONS.X)` — never `role === 'admin'`
- Sprint 4 scope excludes login UI and business features

```
User → Authentication (Supabase) → Authorization (@repo/feature-auth) → Application
```

### Consequences

- RBAC changes require editing `ROLE_PERMISSION_MAP`, not app code
- Multi-tenant permission overrides can be added without Supabase config changes
- Login UI deferred to a future sprint — platform is ready before UI
- Audit logger scaffold in place; persistence deferred to Sprint 5+

---

## ADR-008: Provider-Agnostic AI Platform (`@repo/ai`)

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 5

### Context

AI SaaS products need to support multiple LLM providers (OpenAI, Claude, Gemini, etc.) and potentially swap AI frameworks (Vercel AI SDK, LangChain, LlamaIndex) over time. Direct SDK imports in application code create vendor lock-in and make provider migration costly.

### Decision

Create `@repo/ai` as a dedicated AI Platform:

- Applications use `ChatService` — never import LLM SDKs
- `AIProviderPort` interface hides provider implementations
- `adapterFramework` field supports native, ai-sdk, langchain, llamaindex adapters
- Sprint 5 ships stub adapters + full platform interfaces
- RAG, Memory, Embeddings vector DB deferred to interfaces only (Future tier)
- Real SDK adapters added in subsequent sprints without app changes

```
Application → ChatService → ProviderRegistry → AIProviderPort → Adapter → LLM
```

### Consequences

- Provider swap = change adapter registration, not app code
- AI SDK can be replaced without touching services
- Stub adapters enable testing without API keys
- Slightly more indirection than direct SDK usage
- Must maintain pricing tables and model catalog manually until dynamic discovery

---

## ADR-009: MCP Runtime Platform (`@repo/mcp`)

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 6

### Context

Automation projects (Naver store, browser automation, content generation) need a common MCP foundation. Building MCP as a tool collection (Filesystem, Playwright, GitHub) creates tight coupling and no orchestration layer.

### Decision

Create `@repo/mcp` as an **MCP Runtime Platform**:

- Applications communicate only with `MCPGateway`
- `MCPRuntime` orchestrates tool execution and workflows
- Every tool requires full `ToolMetadata` (Zod schemas, permissions, capabilities)
- WorkflowEngine supports sequential, parallel, conditional, retry, timeout, cancellation
- Transport and adapter implementations deferred — interfaces + stubs in Sprint 6
- Real Playwright/browser automation in Sprint 7 Automation Platform

```
Application → Workflow → MCPRuntime → ToolRegistry → Permission → MCPClient → Server
```

### Consequences

- Tools hot-registerable without app restart
- Metadata drives docs, search, AI recommendations, permissions
- Adapter stubs enable testing without real MCP servers
- Sprint 7 can focus 70% on real features (Naver automation)

---

## ADR-010: Automation Platform + Product-First Roadmap

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 7

### Context

Sprints 0–6 built a comprehensive framework (UI, Core, DB, Auth, AI, MCP). The kit exceeds typical SaaS boilerplates but lacks immediately usable product features. PM direction: shift from framework-only to **Product Platform** with real feature validation.

### Decision

1. Create `@repo/automation` as the execution engine for all long-running work
2. Applications never execute background tasks directly — use Automation Platform
3. Include demo jobs validating Naver store flow: scan → crawl → optimize → generate → upload
4. New roadmap: Sprint 7 Automation → 8 Browser → 9 Image → 10 Content → 11 Naver Commerce
5. **Rule:** New platforms (`packages/browser`, `packages/image`, etc.) added only when validated by real project use

### Consequences

- Starter Kit validated by runnable Naver pipeline (stub implementations)
- Sprint 8+ replaces stubs with real Playwright, image, AI integrations
- Avoids over-abstraction — platforms emerge from proven need
- Queue/scheduler start in-memory; Redis/BullMQ adapters deferred

---

## ADR-011: Browser Platform (`@repo/browser`)

**Status:** Accepted  
**Date:** 2026-07-19  
**Sprint:** 8

### Context

Sprint 7's `browser.crawl` job was a stub. Naver store automation, scraping, login flows, and MCP browser tools all require real browser automation. Playwright must not leak into applications — only the browser platform owns the dependency.

### Decision

1. Create `@repo/browser` with Playwright installed **only** in this package
2. Layer: BrowserManager → BrowserPool → ContextManager → PageManager → Playwright Adapter
3. Replace `browser.crawl` stub with real Chromium crawl (HTML, screenshot, image download)
4. Integration tests use local HTML fixtures — no external websites in CI
5. **Rule:** Every platform feature must be validated by at least one real project use case (Naver pipeline)

```
Application → automation.browser.crawl → @repo/browser crawlPages() → Chromium
```

### Consequences

- Apps import `@repo/browser` only in server code; `serverExternalPackages: ['playwright']` in Next.js
- First non-stub step in Naver MVP pipeline
- Remote URL crawling, persistent login sessions, PDF download deferred to Sprint 11
- Sprint 9 (`@repo/image`) follows same product-first pattern

---

## ADR-012: LaunchLens 2.0 — Workflow-Driven Product Pivot

**Status:** Accepted  
**Date:** 2026-07-24  
**Sprint:** 2.0 Sprint 0 (Product Pivot)

### Context

Feature-unit sprints (modules, reports, frameworks) expanded the codebase but diluted product concept. Users faced a menu-heavy workspace rather than a guided decision journey.

### Decision

1. Adopt **Epic → Sprint → Product QA → Production → Feedback** process ([SPRINT_PROCESS.md](./SPRINT_PROCESS.md))
2. Reposition product: **Workflow Driven AI Strategy Workspace** (not report generator)
3. **Sprint 0 = documentation only** — Vision, IA, Workflow, UX before Epic 1 code
4. Mandatory **4 kickoff questions** before any implementation sprint
5. QA primary metric = **UX question per sprint**, not feature checklist alone
6. Legacy L3.4 RC codebase **retained**; Epic sprints reshape entry UX and navigation
7. **Product Constitution** ([PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)) is supreme product law — North Star, Principles, UX Laws, Out of Scope, 5-question Product QA

### Consequences

- [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md) is primary product roadmap
- L3.5 browser agent deferred to Epic 2
- PM (GPT) owns sign-off; Cursor uses role-separated execution
- Git tags per shipped Epic sprint (starting Epic 1 Sprint 1)

---

## ADR-013: LaunchLens 2.0 Alpha — Epic 1 Complete & Intelligence Engine

**Status:** Accepted  
**Date:** 2026-07-24  
**Sprint:** Epic 1 close · Epic 2 kickoff

### Context

Epic 1 delivered Goal → Workflow → Decision Experience with Product QA PASS across three sprints. PM approved ending Private Preview and shipping **LaunchLens 2.0 Alpha** while Epic 2 begins real Intelligence (Evidence, Citation, Confidence rules).

### Decision

1. Tag **`alpha-v2.0.0`** on Epic 1 complete commit — supersedes withheld `epic1-sprint*` tags
2. **Production deploy** approved for Alpha stage (journey entry + Strategy Workspace)
3. Rename Epic 2 to **Intelligence Engine** (Evidence is one pillar among Citation, Confidence, Source, Why, Research)
4. Epic 2 Sprint 1 scope: Mock → Rule-based Intelligence — **Preview only** until Epic 2 QA gate
5. Product label: **AI Strategy Workspace** — not AI Startup Validator

### Consequences

- [EPIC1_CLOSE_REPORT.md](./sprints/EPIC1_CLOSE_REPORT.md) is Epic 1 record
- [EPIC2_SPRINT1_KICKOFF.md](./sprints/EPIC2_SPRINT1_KICKOFF.md) starts Intelligence work
- L3.4 legacy routes remain; primary entry is `/goal` journey

---

## ADR-014: AI Agent Layer — `@repo/agents` over Journey UI

**Status:** Accepted  
**Date:** 2026-07-26  
**Sprint:** Real Intelligence pivot

### Context

LaunchLens reached AI Strategy Platform maturity (Vision 95%, UX 90%) but Real Intelligence ~20%. CPO directive: stop Journey UI work; AI must perform research → strategy → decision → execution.

### Decision

1. New package **`@repo/agents`** — Research, Strategy, Decision, Execution engines + Growth/Memory/Mentor/Knowledge/Learning
2. **Provider ports + mock adapters** — swappable to LLM/RAG without engine changes
3. **`StrategyPlatform`** orchestrates full pipeline; exposed via `POST /api/agents/strategy-run`
4. Workspace analysis calls agent pipeline (not cosmetic timer only)
5. **Freeze** Landing/Goal/Workflow/Workspace UI unless engine-driven

### Consequences

- See [AI_AGENT_LAYER.md](./AI_AGENT_LAYER.md)
- Product OS (`product-os-engine`) remains ops-only; Founder intelligence in `@repo/agents`
- Phase 10: openrouter adapters per engine port

---

## ADR-015: AI Strategy Company — Founder Success Loop over Product PM

**Status:** Accepted  
**Date:** 2026-07-26

### Context

LaunchLens infrastructure is complete (Journey, AI PM, Agent Layer, Product OS, KPI Loop, Analytics, Experiment, Admin Brain). CPO directive: stop treating Cursor as Product Manager building features; LaunchLens becomes an **AI Strategy Company** that grows **intelligence** to raise Founder business success probability.

### Decision

1. **Work unit** = Founder Success Loop (observe → solve → measure → learn), not screens or KPI cards alone
2. **Eight Intelligence layers** — Founder, Business, Strategic, Execution, Learning, Product, Knowledge, Network — documented in `docs/FOUNDER_SUCCESS_LOOP.md`
3. **Implementation gate:** "Does this increase Founder business success probability?" — NO → do not ship
4. **Daily report** format → Daily Founder Success Report (see `docs/templates/DAILY_AUTONOMOUS_REPORT.md`)
5. **Type contracts** in `packages/agents/src/types/intelligence.ts` — map layers to existing Agents; no new Journey structure
6. **Provider swap** remains the path to Real Intelligence; engines frozen

### Consequences

- Cursor role: grow AI intelligence via existing Agent Layer + UX that reduces Founder friction
- Product OS evolves toward AI Product Director (live delta → hypothesis → Adopt/Rollback)
- Network Intelligence deferred until Founder + Business + Learning stable on Production

---

## ADR-016: Platform Phase — Intelligence over UX Sprints

**Status:** Accepted  
**Date:** 2026-07-26

### Context

Sprint 6–20 delivered Founder Experience (Daily Habit, Living Project, AI OS surfaces). CPO assessment: UX ~90%, Real Intelligence ~35–40%, Production Architecture ~30%. Further UI panels have diminishing returns.

### Decision

1. **Stop** new Today-workspace UI sprints; Sprint 1–20 UX track is complete
2. **Start Platform Phase** — five layers: Intelligence Platform → Knowledge Graph → Autonomous Engine → Founder Twin → Operating System
3. **Priority 1:** `@repo/agents/intelligence/platform` — `runIntelligencePlatform()` for 6 domains (competitor, market, pricing, government, customer, investment)
4. **Priority 2:** `BackgroundRunRepository` interface in `@repo/core`; DB adapter + Vercel Cron next
5. Overnight API runs Intelligence Platform + Strategy Pipeline; returns `knowledgeGraph`
6. New API: `POST /api/intelligence/platform-run`

### Consequences

- Competitive moat shifts from screens to real data collection + reasoning + evidence
- UI consumes platform outputs; no mock-only "AI worked" without provider backing
- See `docs/PLATFORM_ROADMAP.md`

---

## ADR-017: AI PM North Star — UI Freeze & Intelligence-First Sprints 21–26

**Status:** Accepted  
**Date:** 2026-07-26  
**Approver:** CPO

### Context

Layer 1 Experience (30/40/30 shell, conclusion-first Executive Decision, chat-only AI PM Office) is complete. Further UI work has diminishing returns. LaunchLens must reposition from "business analysis tool" to **AI PM that runs the company on behalf of the founder**.

### Decision

1. **North Star:** LaunchLens is **not** an AI business analysis tool — it is an **AI PM that operates the company for the founder**
2. **Feature gate:** Every feature must answer *"Does this prepare the founder's decision on their behalf?"* — NO → do not build
3. **UI Freeze:** No new Dashboard, Panel, Tab, Card, Layout, or IA changes. Allowed: intelligence, data quality, reasoning, AI PM memory, CEO Decision quality
4. **Three product layers:** Layer 1 Experience ✅ · Layer 2 Intelligence (next ~2 months) · Layer 3 Autonomous Company (final)
5. **Sprint reorder (21–26):** Company Brain → Real Intelligence → Morning Meeting → Executive Meeting → Founder Twin → Self Improvement
6. **Signature morning copy:** Four fixed lines in AI PM Office center chat; content below varies from overnight data

### Consequences

- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) v1.1 — North Star, UI Freeze, Layers, signature copy
- [TASKS.md](./TASKS.md) Sprint 21–26 track replaces prior P1–P4 ordering
- Sprint 21 starts **backend only** — Background AI + Knowledge Graph + Company Memory
- Center chat opens with signature greeting via `founder-morning-signature.ts`

---

## ADR-018: LaunchLens V2 — Sprint 0 UX Reset (not IA polish)

**Status:** Accepted  
**Date:** 2026-07-26  
**Approver:** CPO

### Context

Dozens of sprints added features, but the product problem was **IA**, not capability. Users encountered AI PM Workspace before understanding validation. The 3-column shell, 8-step rail, and tabbed decision board created dashboard fatigue.

### Decision

1. **Declare Reset** — not feature addition; delete UI, keep engines
2. **New flow:** Landing → Who (4 cards) → Workflow → Validation → AI research → Conclusion → Workspace list → Workspace (2-col)
3. **UX philosophy:** Start as **Validation Tool**; grow into **AI PM** — never start as AI PM
4. **Layout:** Single column for onboarding; **2-col (AI PM | Decision) only in Workspace** — no 3-col shell
5. **Delete:** Left 8-step rail, right 9 tabs, 3-col shell, Sprint 9–20 UI panels
6. **Keep:** Validation Score, AI pipeline, Strategy Engine, OpenRouter, KG, Memory
7. **Entry route:** `/who` replaces `/goal`; legacy `/goal` redirects
8. **Sprint 21–26 intelligence track** resumes **after** Sprint 0 DoD

### Consequences

- [SPRINT_0_V2_UX_RESET.md](./sprints/SPRINT_0_V2_UX_RESET.md) is active sprint law
- ADR-017 UI freeze superseded for Sprint 0 only
- V2 shells: `V2JourneyStack`, `V2WorkspaceShell`, `V2WorkspaceLayout`
- Product success = 3 user sentences (viability · why · what's next)

---

## ADR-019: V2 UX QA before Legacy deletion (Sprint 0-4 reorder)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 0-1 through 0-3 rebuilt the V2 journey (Validation → Investigate → Conclusion → Workspace). The original plan scheduled Legacy UI removal as Sprint 0-4. Product pivot clarified that LaunchLens sells **사업성 검토** first, not AI PM — and the WOW moment (*"좋습니다. 제가 조사하겠습니다."*) is unvalidated.

Deleting Legacy before confirming V2 is correct creates **product risk** (irreversible rebuild cost) greater than **tech debt** (keeping duplicate shells temporarily).

### Decision

1. **Sprint 0-4** becomes **V2 UX QA + user flow validation** — not Legacy removal
2. **Sprint 0-5** becomes Legacy Journey UI removal — **only after 0-4 QA PASS**
3. **Sprint 0-6–0-8:** Landing trim · OpenRouter real data · Background AI
4. **Philosophy locked:** Validation Tool entry → AI PM Workspace continuation; never sell AI PM first
5. Legacy shells remain as rollback until QA sign-off

### Consequences

- [SPRINT_0_4_V2_UX_QA.md](./sprints/SPRINT_0_4_V2_UX_QA.md) is the active QA gate
- [QA_REPORT_V2.md](./QA_REPORT_V2.md) is the **evidence document** for Legacy removal (0-5)
- [TASKS.md](./TASKS.md) sprint table 0-4 through 0-8 updated
- FAIL on QA → fix V2 only; do not delete Legacy

---

## ADR-020: LaunchLens Writing Rule — reveal only what the user has experienced

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 0-4 Product Validation showed Landing failed when Hero sold **AI PM** before the user understood **사업성 검토**. Copy fixes passed Q0/Q1/Q2, but the pattern will recur without a explicit writing law.

### Decision

**LaunchLens Writing Rule:**

> **사용자가 아직 경험하지 않은 것은 먼저 말하지 않는다.**

| Stage | Speak | Do not speak (yet) |
|-------|-------|---------------------|
| **Landing** | 사업 · 아이디어 · 시장 · 될까요? | AI PM · CEO · Workspace · Dashboard · Operating System |
| **Validation** | 사업성 검토 · 정확도 | AI PM · Workspace |
| **Investigate** | AI 등장 — *"좋습니다. 제가 조사하겠습니다."* (first WOW) | AI PM as product name |
| **Conclusion** | GO/HOLD · 왜 · 오늘 · *AI PM이 계속 관리해드릴까요?* (offer) | Full workspace pitch |
| **Workspace** | AI PM is protagonist | Validation onboarding copy |

**Landing banned words (hero + above-fold):** CEO · AI PM · Operating · Workspace · Dashboard · Operating System

**Product sentence (canonical):**

> 사업을 검토해드립니다. 검토가 끝나면 AI PM이 계속 관리해드립니다.

### Consequences

- [QA_REPORT_V2.md](./QA_REPORT_V2.md) STEP 1 PASS gated on this rule
- Landing Hero: minimal copy + flow preview (사업성 → 시장 → 경쟁 → 가격 → GO/HOLD)
- Sprint 0-6 Landing trim must audit full page against banned words
- i18n and marketing copy follow stage table before ship
- **Question-first UI:** questions beat nouns on Landing and Who (STEP 2 QA)

---

## ADR-021: Step-by-step deploy QA — one STEP per cycle

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 0 shipped too much at once without PM product validation between steps. Product risk returned: structure complexity and message drift (e.g. Landing selling AI PM first).

### Decision

**Fixed loop per STEP (30–60 min dev max):**

```text
Develop → pnpm build → commit → push main → Vercel deploy → PM test → PASS/FAIL → next STEP only if PASS
```

**Never:**

- Multiple sprints in one batch
- Many features without PM sign-off between steps
- Next STEP while score &lt; 9.5

**PASS gate (every STEP):**

| # | Question |
|---|----------|
| Q0 | 왜 눌러야 하는가? |
| Q1 | 무엇을 해야 하는가? |
| Q2 | 다음 단계가 명확한가? |

All YES · **Score ≥ 9.5** → proceed. Otherwise fix and redeploy; do not start next STEP.

**`main` rule:** only push testable, build-passing states.

**Commit format:** `feat(v2): <step scope>` — e.g. `feat(v2): improve workflow selection UX`

**V2 QA STEP order (Sprint 0-4):**

1. Landing ✅  
2. Who ✅  
3. Workflow ← current  
4. Validation · 5. Investigate · 6. Conclusion · 7. Workspace

PM receives production URL after each push; Legacy removal (0-5) remains gated on full flow PASS.

### Consequences

- [QA_REPORT_V2.md](./QA_REPORT_V2.md) — universal Q0/Q1/Q2 per STEP
- [TASKS.md](./TASKS.md) — one STEP in flight at a time
- AI/engineering: no parallel STEP implementation without PM PASS

---

## ADR-022: LaunchLens V2 Pivot — Project-based foundation (Sprint 1)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

V2 UX validation (Sprint 0-4) proved messaging and question-first onboarding, but the product cannot deliver **Memory** without authenticated **Project** persistence. LaunchLens is not session/chat AI — it is **생각 → 결정 → 기억 → 다음날 → 계속**.

Payment, teams, export, and advanced AI are out of scope until foundation ships.

### Decision

1. **Priority pivot:** Sprint 1 Foundation over Sprint 0-4 STEP 4–7 and Legacy removal
2. **Product principle (Project-Centric AI):**

```text
LaunchLens is Project-Centric AI.

Every conversation belongs to a project.
Every project owns its context.
Every decision belongs to its history.
```

3. **Architecture:** User → Google Login → **내 프로젝트** → Project → Thinking / Decision / Memory / Journey
4. **Login:** Google only via Supabase Auth
5. **MVP language:** Korean UI only · i18n keys in code · `ko.json` maintained
6. **Sprint 1.1 (Project Foundation):** Login + session + userId-scoped projects + 내 프로젝트 home + empty workspace — **no AI**
7. **Out of Sprint 1:** Payment · Teams · Export · AI Engine polish

**Prior wording:** *LaunchLens는 세션 기반 AI가 아니라 프로젝트 기반 AI다.* — superseded by English canonical above; same meaning.

### Consequences

- [SPRINT_1_FOUNDATION.md](./sprints/SPRINT_1_FOUNDATION.md) is active sprint law
- [QA_REPORT_V2.md](./QA_REPORT_V2.md) V2 flow QA **paused** at STEP 3 (resume after foundation)
- ADR-020/021 still apply to any shipped UX; deploy QA loop unchanged
- Constitution v2.1 — project-based AI principle
- Harden existing auth/project code — do not duplicate login UI

---

## ADR-023: Evidence-driven Validation Loop — no score without evidence

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

CPO QA on V2 validation (`/validation`) exposed a **trust-breaking flow**: one-line idea → fake 41% → AI research → 60% HOLD. Users ask "뭘 보고?" Optional + chips toggled without inputs felt like bugs. "밤새 조사" after immediate click breaks credibility.

Sprint 1.3 originally targeted "Adaptive Thinking Engine." CPO **cancelled score-first AI** in favor of evidence-first loop.

### Decision

1. **Flow order:** Idea → **Evidence collection** → AI research → **Findings** → Opinion → Improve → (loop)
2. **Remove from user-facing validation/conclusion:** arbitrary % scores, GO/HOLD without rationale
3. **Replace with:** information checklist (e.g. 1/5), evidence-aware judgment copy, always-visible research CTA
4. **Evidence UI:** Accordion — each + field opens question + textarea immediately
5. **Copy rule:** describe **actual** action ("현재 입력 내용을 바탕으로") — no fictional overnight narrative in immediate flows
6. **Results order:** findings → AI opinion → why → next input guidance

### Consequences

- [SPRINT_1_3_EVIDENCE_LOOP.md](./sprints/SPRINT_1_3_EVIDENCE_LOOP.md) replaces Adaptive Thinking Engine as Sprint 1.3
- [CPO_REVIEW_EVIDENCE_FLOW.md](./sprints/CPO_REVIEW_EVIDENCE_FLOW.md) is QA authority for this pivot
- Sprint 1.2 interview path remains compatible (question-first, no scores)
- Workspace cards may still show legacy % internally until P1 cleanup

---

## ADR-024: Review Board — process over event, no "Result" vocabulary

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1.3 removed fake scores but still framed research as a one-click **event** ("AI 조사 시작" → "결과"). CPO QA: users ask "AI가 뭘 조사하는데?" — trust requires **review of current input**, not omniscient market scan.

LaunchLens core screen becomes **Review Board**, not validation report.

### Decision

1. **Process flow:** Input → AI understands → what's known → what's missing → review → evidence → judgment → next question
2. **User-facing vocabulary (immutable in MVP flows):**

| Section | Label |
|---------|--------|
| Understanding | AI가 현재 이해한 내용 |
| Confirmed | 이번 검토에서 확인한 내용 |
| Status | 검토 현황 |
| Judgment | 현재 판단 |
| Next | 다음으로 확인하면 좋은 내용 |

3. **Banned in user UI:** "결과", GO/HOLD as verdict, "AI 조사 시작" as primary CTA
4. **Primary CTA:** "현재 내용으로 검토하기" — scopes AI to **current input**
5. **Evidence Strength:** progress + 🟢/🟡/⚪ — not AI quality scores
6. **Research step:** renamed to process language ("검토 진행"), not one-shot investigation event

### Consequences

- [SPRINT_1_3_1_REVIEW_BOARD.md](./sprints/SPRINT_1_3_1_REVIEW_BOARD.md)
- Shared `v2-review-board` components for validation + conclusion routes
- Constitution "Recommendation, Never Judgment" reinforced in copy

---

## ADR-025: UI Quality First — Design Constitution (Sprint 1.3.2)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Features improved but UI polish regressed — temporary layouts, border-heavy cards, AI-wrapper feel. LaunchLens is no longer "demo MVP"; it must read as **premium B2B SaaS** (Notion / Linear / Stripe tier).

### Decision

1. **[DESIGN_CONSTITUTION.md](./DESIGN_CONSTITUTION.md)** is supreme UI law — above sprint scope docs
2. **UI Quality First:** UI Self Review must pass before ship; one NO = block release
3. **Visual hierarchy:** Do now → AI understands → Review → Next action
4. **Editable Review Board:** understanding rows are clickable; save → toast → optional re-review
5. **Ship artifacts:** Before/After screenshots + UI Self Review required (no screenshot = no accept)

### Consequences

- [SPRINT_1_3_2_INTUITIVE_REVIEW_UX.md](./sprints/SPRINT_1_3_2_INTUITIVE_REVIEW_UX.md)
- `V2ReviewBoardWorkspace` replaces split-panel validation layout
- Feature velocity subordinate to UI completion on user-facing flows

---

## Template

See [templates/ADR_TEMPLATE.md](./templates/ADR_TEMPLATE.md) for new entries.
