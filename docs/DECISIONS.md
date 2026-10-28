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

## ADR-026: Continuous Strategy Loop — One Workspace, One Thought (Sprint 1.4)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1.3.x improved evidence and Review Board vocabulary but flow still split across `/validation`, `/investigate`, `/conclusion`. Users experience page hops and form-filling. CPO: LaunchLens is not a validation report tool — it is an **AI Strategy Workspace** where thinking continues after the first review.

### Decision

1. **Single workspace route:** `/validation` hosts the full loop; legacy investigate/conclusion routes redirect (no removal yet for bookmarks)
2. **Continuous loop:** Input → Review → Follow-up question → Input → Board update → Review again — not a terminal "result" screen
3. **Conversational input:** Idea first; optional context via chips (+ 문제, + 고객, …) and AI PM confirm dialog — not a vertical form list
4. **Meeting-notes board:** "이번 검토에서 확인한 내용" renders as scannable sections (시장 · 고객 · 가격 · 차별성) with 더보기 / 입력하기 — not report cards
5. **Product Rule — One Screen, One Thought:** At any moment the user has one cognitive job — input OR review loading OR board reading OR answering follow-up OR field dialog. Mixed-purpose layouts are blocked in P0 flows.
6. **Motion baseline:** State changes use subtle fade/slide + toast + scroll-to-board — polish without decoration

### Consequences

- [SPRINT_1_4_CONTINUOUS_LOOP.md](./sprints/SPRINT_1_4_CONTINUOUS_LOOP.md)
- `V2StrategyWorkspaceView` replaces split validation/investigate/conclusion journey for V2 demo path
- DESIGN_CONSTITUTION gains One Screen, One Thought rule
- Real AI pipeline + Context Memory wiring deferred to P1 within Sprint 1.x

---

## ADR-027: Strategy Workspace IA — Navigation-first 3-column layout (Sprint 1.5)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1.4 unified the review loop on one screen but CPO QA found: duplicated input display, vertical report feel, no navigation role for review sections, narrow desktop width, and no clear next action after review. LaunchLens must feel like an **AI strategy meeting workspace**, not a form + report generator.

### Decision

1. **Width unification:** Home + Workspace use `max-w-7xl` via `JourneyLayout width="workspace"`
2. **3-column IA:** Workflow (nav) · Main (selected step only) · AI Summary (status + one next CTA)
3. **No duplicate content:** Input appears once in Main when step selected; nav shows status only; snippet shows 3-line AI summary
4. **Review = meeting bullets:** Compact summary on Review step; detail via nav (market, competition, etc.)
5. **Field actions:** Edit · Delete (confirm dialog) · Re-input
6. **One next recommendation** always visible in AI Summary panel
7. **No new AI features** in this sprint — layout and IA only

### Consequences

- [SPRINT_1_5_WORKSPACE_IA.md](./sprints/SPRINT_1_5_WORKSPACE_IA.md)
- `V2WorkflowNav`, `V2MainWorkspacePanel`, `V2AiSummaryPanel` replace single-column stack
- Legacy `V2ReviewMeetingBoard` retained but not used in primary flow

---

## ADR-028: LaunchLens Roadmap v1.0 — Sprint Reboot (Product over features)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1.5 proved Workspace IA can expand (Landing, Admin, Project mgmt) without breaking product philosophy — if sequenced correctly. CPO: adding **SaaS IA** is not feature sprawl; it is minimum structure to test MVP. Multiple roadmap docs caused drift.

### Decision

1. **[LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md)** is the **only active product sequence** — Sprint 0–7
2. **Sprint order (immutable):** 0 Foundation → 1 Core Experience → 2 Landing → 3 Projects → 4 Context → 5 Team → 6 Billing → 7 Admin
3. **Sprint 1 exit** = product philosophy complete (Workspace · Loop · Review · AI PM · Decision Memory)
4. **IA separation:** 비로그인 (Product/Pricing/Resources) vs 로그인 (Workspace/Projects/Profile) — never mix headers
5. **Success gates:** 30s Landing · 5min first review · 1-week decision continuity
6. **Admin (Sprint 7)** is operations tooling, not user product — may start early for Closed Beta
7. **Release Rule** unchanged — no "done" report without Preview + CPO QA

### Consequences

- [SPRINT_2_LANDING.md](./sprints/SPRINT_2_LANDING.md) queued after Sprint 1 CPO PASS
- [ROADMAP.md](./ROADMAP.md) · [TASKS.md](./TASKS.md) point to v1.0 track
- LAUNCHLENS_2.0_ROADMAP · MASTER_PLAN infra track frozen for product priority

---

## ADR-029: Roadmap v1.1 — Sprint reorder & identity lock

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Roadmap v1.0 sequenced Project Management (S3) and Context Intelligence (S4) before real AI and Landing product polish. CPO v1.1: identity is **Thinking Workspace for Founders**; Sprint 1 ends with Decision Memory only; real AI moves to Sprint 3; Artifacts (menu-free propose UX) to Sprint 4.

### Decision

1. **Sprint 1 exit:** Thinking Flow + Review Board + Decision Memory — mock AI acceptable; no AI engine sprint work in S1
2. **Sprint 2:** Landing product (Hero copy locked · 3-card Product · 3-step How · Demo)
3. **Sprint 3:** Thinking Engine — Adaptive Question · Evidence · Reasoning · Recommendation
4. **Sprint 4:** Artifacts — PRD/SWOT/etc. via **"지금 생성하시겠습니까?"** — never menu-first
5. **Sprint 5–7:** Collaboration · Billing · Admin (ops dashboard, not Workspace clone)
6. **One sprint question** per sprint — documented in [LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md)
7. **3-second next-action rule** added to Constitution v2.2

### Consequences

- [SPRINT_1_6_DECISION_MEMORY.md](./sprints/SPRINT_1_6_DECISION_MEMORY.md) is sole active Sprint 1 work
- [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md) · [SPRINT_4_ARTIFACTS.md](./sprints/SPRINT_4_ARTIFACTS.md) replace old S3/S4 scope
- Project Management features fold into existing Projects + future sprints as needed — not a standalone sprint gate

---

## ADR-030: Decision Memory — project remembers, user confirms (Sprint 1.6)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1.5 completed Workspace IA but LaunchLens still felt like session AI without persistent **project context**. CPO: largest asset is not AI but **project memory**. Sprint 1.6 is not AI engine work — it is Decision Memory with explicit user save.

### Decision

1. **Structure:** Decision → Reason → Evidence → Date → Status (`current` | `superseded`, never delete)
2. **UI:** Decision Memory section below Workflow nav — click shows Main detail (not timeline, not new top menu)
3. **Save flow:** AI asks "저장할까요?" — user confirms — **no auto-save**
4. **Storage:** Project-scoped `localStorage` for V2 demo path (`ll_journey_project_id`); server wiring follows project CRUD
5. **Sprint 1.6 Principle:** Memory continues **thinking context**, not history browsing

### Consequences

- [SPRINT_1_6_DECISION_MEMORY.md](./sprints/SPRINT_1_6_DECISION_MEMORY.md)
- `v2-decision-memory-store.ts` + nav/detail/save-prompt components
- [LAUNCHLENS_DESIGN_SYSTEM_1_0.md](./LAUNCHLENS_DESIGN_SYSTEM_1_0.md) mandated pre-Sprint 2

---

## ADR-031: Sprint 2 GTM Foundation & Evidence-driven Engine (CPO direction)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1 SHIPPED with clear product identity: Thinking → Decision → Memory. CPO review: direction refined from "AI startup validation" to **Thinking Workspace**. Sprint 2+ must shift from **product features** to **business, brand, and experience**.

### Decision

1. **Sprint 2 rename:** Landing → **Go To Market Foundation** — brand · first impression · signup · first project (Landing is one piece)
2. **Sprint 2 question:** "Why should someone use LaunchLens?" — not just 30-second comprehension
3. **Sprint 2 North Star KPI:** Visitor thinks *"나도 한번 써봐야겠다"* **before login**
4. **Why LaunchLens** narrative before Hero — problem empathy over feature list
5. **Live Demo:** readonly Workspace on click — not video/GIF
6. **Tagline:** *Think Better. Decide Better.*
7. **Sprint 3 rename:** Real AI → **Evidence-driven Thinking Engine**
8. **Evidence Engine** foundation doc before Sprint 3 — AI must not judge without evidence; ChatGPT ✗ · Thinking Workspace ✓
9. **Sprint nature:** S1 = product · S2 = brand · S3 = competitive moat

### Consequences

- [SPRINT_2_PRINCIPLES.md](./SPRINT_2_PRINCIPLES.md) · [SPRINT_2_LANDING.md](./sprints/SPRINT_2_LANDING.md) updated
- [EVIDENCE_ENGINE.md](./EVIDENCE_ENGINE.md) · [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md) updated
- [LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md) · [TASKS.md](./TASKS.md) · [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

---

## ADR-032: Rule #0 & Implementation gate (CPO final)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 1 SHIPPED. Product identity crystallized: **Thinking Workspace**, not Startup Validation Tool. CPO final review locks supreme rule and implementation gate for Sprint 2+.

### Decision

1. **Rule #0:** LaunchLens는 사용자의 생각을 대신하지 않는다. 더 좋은 생각을 하도록 돕는다. — above all features
2. **Implementation gate (3 questions):** deeper thinking · better decisions · context accumulation — fail any → do not build
3. **Sprint 2 single goal:** *"이거 그냥 AI가 문서 써주는 게 아니네"* in 30 seconds
4. **Live Demo P0:** readonly Workspace with full flow visible — not video
5. **Header IA:** Why LaunchLens in nav; logged-in = Workspace · Projects · Profile only; Admin separate
6. **Priority:** Sprint 2 GTM before `/validation` feature work
7. **Canonical flow:** Landing → Demo → Login → Workspace → Question → Evidence → Decision → Memory → Artifact (last)

### Consequences

- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) v2.3
- [SPRINT_2_PRINCIPLES.md](./SPRINT_2_PRINCIPLES.md) · [LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md)

---

## ADR-033: Evidence Engine Foundation & Rule #1 (Sprint 3.1)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 2 QA (8.8/10): MVP-level features exist but product is still a "good prototype." Users watch AI, they don't think *with* AI. CPO direction: Sprint 3 competitive moat is **Evidence quality**, not LLM choice.

### Decision

1. **Rule #1:** LaunchLens never answers first — `Evidence → Thinking → Decision`
2. **`@repo/evidence` pipeline:** Collector → Store → Interpreter (strict separation)
3. **LLM role:** Interpret stored evidence only — never generate evidence signals
4. **Judgment contract:** `JudgmentWithEvidence.evidenceIds` required — enforced by `assertJudgmentHasEvidence()`
5. **Sprint 3 sub-phases:** 3.1 Evidence · 3.2 Thinking · 3.3 Decision · 3.4 Memory · 3.5 Consulting
6. **Sprint 3.1 scope:** Foundation + mock providers — no new UI, no real API keys yet

### Consequences

- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) v2.4 — Rule #1
- [EVIDENCE_ENGINE.md](./EVIDENCE_ENGINE.md) — pipeline architecture
- [SPRINT_3_1_EVIDENCE_ENGINE.md](./sprints/SPRINT_3_1_EVIDENCE_ENGINE.md)
- `packages/evidence/` — interfaces, mock sources, pipeline, tests

---

## ADR-034: AI PM Personality & Consulting Experience (Sprint 4)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 3 closed with fixed Product DNA: LaunchLens is a Thinking Workspace, not an answer engine. Users still perceive AI PM as a reporter ("보고 → 회의록") rather than a colleague who **leads the meeting**.

### Decision

1. **Sprint 4 is an experience sprint** — no new dashboard UI; content and dialogue only.
2. **AI PM Personality rules:** brief-first · question-before-answer · evidence-before-confidence · founder-decides · one-CTA.
3. **Consulting conversation** lives inside existing Inbox — not a new page or panel.
4. **Artifacts** are offered by AI PM at the right moment — never from a menu.
5. **Resume flow** must include a new lead topic (e.g. new competitor) after founder memo recall.

### Consequences

- [SPRINT_4_AI_PM_EXPERIENCE.md](./sprints/SPRINT_4_AI_PM_EXPERIENCE.md)
- `v2-ai-pm-personality.ts` · `v2-ai-pm-consulting-dialogue.ts`
- Inbox embeds consulting thread; artifact offers keyed by dialogue context

---

## ADR-035: Sprint 4 Reset — AI PM Working Experience

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 4 kickoff (Consulting Experience) improved dialogue copy but CPO validation found the core gap unchanged: AI PM **reports** like GPT sections (market · price · evidence · next action) instead of feeling like a PM who **works, reports completed tasks, gives opinion, and pulls the founder to the next decision**.

### Decision

1. **Pause feature expansion** — validate product experience before Real Evidence / LLM layers.
2. **Rename Sprint 4** to **AI PM Working Experience**.
3. **P0 = six Inbox blocks:** task status · completed work · opinion · why · founder decision · next work (single CTA).
4. **Post-review loop** must answer "이제 뭐하지?" — AI PM proposes next work with ETA.
5. **No new UI sections** — restructure existing Inbox content only.

### Consequences

- [SPRINT_4_AI_PM_EXPERIENCE.md](./sprints/SPRINT_4_AI_PM_EXPERIENCE.md) rewritten
- `v2-ai-pm-work-engine.ts` · `v2-ai-pm-working-experience.tsx`
- Standalone artifact trigger removed from workspace main — offer lives in block ⑥

---

## ADR-036: Decision Workspace — Morning Brief First (Sprint 4.1)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Sprint 4.0 six-block Inbox was HOLD: still AI-centric information consumption. CEO asks *"오늘 뭐 결정하지?"* not *"what did AI research?"*

### Decision

1. **Inbox = Morning Brief first** — one approval item, recommendation, confidence, ETA, single `[결정 시작]`.
2. **Decision Session** opens only after CTA — activity summary (collapsed details), AI PM 권고, proceed/hold/re-research.
3. **Meeting Closed** ends every session — today's decision ✓, next meeting scheduled.
4. **One Agenda Rule** — one meeting topic at a time.
5. **Language shift (P1):** 회의 · 업무 · 권고 · 승인 · 결정 — not 검토/Review/Evidence in user-facing copy.

### Consequences

- [SPRINT_4_1_DECISION_WORKSPACE.md](./sprints/SPRINT_4_1_DECISION_WORKSPACE.md)
- `v2-ai-pm-decision-session-store.ts` — brief → session → closed
- Inbox title → **AI PM Morning Brief**

---

## ADR-037: Decision First & Morning Brief v2 (Sprint 4.2)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO (PASS WITH CHANGES on 4.1)

### Context

4.1 moved the axis to "what must the founder decide?" but Morning Brief still lacked *why today*, Decision Session was explanation-heavy, and Meeting Closed didn't answer *what changed today*.

### Decision

1. **Morning Brief v2** — one paragraph why this agenda now + checkmarks linking to next step unlock.
2. **Decision First** — session order: recommendation → proceed/hold/re-research → rationale after choice.
3. **Discoveries over task completion** — PM reports what was newly learned.
4. **Meeting Closed** — "오늘 변경된 내용" + "다음 회의는 ○○ 이후".
5. **Sprint 5 frame:** Workspace = meeting room (Agenda → Discussion → Decision → Action → Minutes).

### Consequences

- [SPRINT_4_2_MEETING_UX_POLISH.md](./sprints/SPRINT_4_2_MEETING_UX_POLISH.md)
- Session store: `saveDecisionChoice` → rationale → `finalizeMeetingClosed`

---

## ADR-038: Demo Experience 2.0 — Value Not Features (Sprint 4.3)

**Status:** Accepted  
**Date:** 2026-07-27  
**Approver:** CPO

### Context

Guided demo (`?demo=guided`) walked users through idea input → review → customer change — a **feature tutorial**. CPO: *"그래서?"* remains. LaunchLens sells **AI PM continuously managing the founder's business**, not one-shot analysis.

### Decision

1. **Rename demo:** "Live Demo" → **"AI PM과 함께하는 첫 번째 전략 검토 (약 3분)"**
2. **Sample project only** — LaunchLens pre-filled; user selects, never types.
3. **Scripted 9-step narrative:** AI works → founder judges → evidence → change detected → strategy improved → continuous monitoring → Google Login.
4. **Evidence in demo** = data → AI interpretation → impact (not source list).
5. **Demo replaces guided workspace UI** — dedicated `V2DemoExperience` component, not coach overlay on full workspace.

### Consequences

- [SPRINT_4_3_DEMO_EXPERIENCE_2.md](./sprints/SPRINT_4_3_DEMO_EXPERIENCE_2.md)
- `v2-demo-experience.tsx` · `v2-demo-experience-types.ts`
- Legacy `V2GuidedDemoCoach` retained for reference; no longer shown in guided mode

---

## ADR-039: Epic 2 Workspace IA + Product Principles (CPO Sign-off)

**Status:** Accepted  
**Date:** 2026-07-29  
**Approver:** CPO

### Context

Epic 1 fixed routes and redirects. Epic 2 defined Workspace structure but initial blueprint read as **report IA** (static Overview / Insights / Recommendations / Next Actions). CPO required **process-first IA**: AI PM leads; Overview is generated output; Sidebar shows ○ ● ✔ lifecycle.

### Decision

1. **Epic 2 Blueprint APPROVED** — [`WORKSPACE_IA.md`](./WORKSPACE_IA.md), [`WORKSPACE_FLOW.md`](./WORKSPACE_FLOW.md).
2. **User-facing section names:** Overview · Insights · Recommendations · Next Actions (internal: review / evidence / strategy / execution).
3. **Entry flow:** Workspace → **AI PM first** → Overview emerges (not Overview-first).
4. **Overview blocks:** Business Score → Summary → Recommended Next Step (inline) → Risk → Recommendation; progressive reveal.
5. **Product Principles ratified** — [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md): AI PM > Report; alive reports; one screen; action as behavior; 3-second rule; four implementation rules (no empty screens, dead ends, long reports; everything alive).
6. **Epic 3 scope:** Layout shell (Phases 0–5) — **Phase 0 HTML prototype mandatory** before React; dummy progressive Overview; no real LLM. See [`sprints/EPIC3_WORKSPACE_LAYOUT.md`](./sprints/EPIC3_WORKSPACE_LAYOUT.md).
7. **Stop Rule:** cramped layout → stop implementation, screenshot, fix prototype first.
8. **Pre-implementation review:** Legacy root cause + Founder/Business/Customer separation — [`EPIC3_PRE_IMPLEMENTATION_REVIEW.md`](./sprints/EPIC3_PRE_IMPLEMENTATION_REVIEW.md).

### Consequences

- UI implementation gate **open for Phase 0 prototype only**; Phase 1 React blocked until P0 domain plan + founder prototype re-review
- Cursor must read PRODUCT_PRINCIPLES + EPIC3_PRE_IMPLEMENTATION_REVIEW before Workspace PR
- Old tab-based Epic 3 kickoff ([`EPIC3_KICKOFF.md`](./sprints/EPIC3_KICKOFF.md)) superseded for layout work — do not extend intelligence tabs for this sprint

---

## ADR-040: Core Domain + AI PM Personality (Epic 2.5)

**Status:** Accepted  
**Date:** 2026-07-29  
**Approver:** Co-founder direction

### Context

AI PM conflates Founder, Business, and Customer (e.g. B2C "취향저격컴퍼니" with 대표 treated as customer). Status Strip read as ticket labels, not PM dialogue — product drift toward ChatGPT report bot.

### Decision

1. **Core Domain chain:** Founder → Business → Customer → Market → Competitor — canonical in [`DOMAIN_MODEL.md`](./DOMAIN_MODEL.md).
2. **Epic 2.5:** [`AI_PM_PERSONALITY.md`](./AI_PM_PERSONALITY.md) — PM not analyst; **ORDA** (Observation → Reasoning → Decision → Next Action); conversational Status Strip; Sidebar "AI Updated" freshness.
3. **React Layout demoted to P2** — after Epic 2.5 sign-off + prototype r3 review.
4. **B2C rule:** Founder ≠ Customer unless Business sells to founders.

### Consequences

- [`sprints/EPIC2_5_AI_PM_PERSONALITY.md`](./sprints/EPIC2_5_AI_PM_PERSONALITY.md)
- Prompt + store migration sprint before accuracy claims
- Prototype r3: rotating dialogue Strip (~10s)

---

## ADR-041: First Trust Experience — Baseline `9f267b7` (CPO)

**Status:** Accepted  
**Date:** 2026-07-30  
**Approver:** CPO  
**Baseline commit:** `9f267b7` — `fix(trust): Zero Lie stabilization`

### Context

Architecture and route structure are strong, but Product Trust (~4/10) and real UX (~5/10) lag. Auto QA PASS does not mean the CEO trusts AI PM in the first five minutes. Unsupported claims (e.g. "예상 서비스 사용자는 개인 창업자") destroy trust faster than any feature adds value.

### Decision

1. **Fix `9f267b7` as the trust-recovery baseline.** No new features until Sprint A completes.
2. **Sprint A name:** **First Trust Experience** (not "Trust Polish") — scope is the **first 5 minutes**, not UI polish.
3. **Merge gate question:** *Does the user trust AI PM within the first 5 minutes?* If no → do not implement.
4. **Sprint A scope (copy only):** shorter first message · evidence on every claim · questions over monologue · no unsupported conclusions · customer definition flow. **Not in scope:** Sidebar design, animation, ORDA expansion, AI Agent, new cards/scores/screens.
5. **Sprint B (after A PASS):** AI PM Presence — Strip, Sidebar, Overview, Next Action.
6. **Acceptance:** CEO/representative criteria — never "why did AI say that?" / never "what's the evidence?" — not technical QA alone.

### Consequences

- PR review adds trust checks (see `.cursor/rules/review-checklist.mdc`).
- Epic 3 React layout, new agents, dashboards remain **STOP** until Sprint A PASS.
- CTO reviews **sentences** before code in Sprint A PRs.

---

## ADR-042: Shared Understanding — internal term, simple UI (CPO)

**Status:** Accepted  
**Date:** 2026-07-30  
**Approver:** CPO

### Context

Product philosophy (understand → align → review) is clear internally, but too many concepts (Trust, Shared Understanding, Business Understanding) leak into UX. Founders need a **30-second** read, not vocabulary.

### Decision

1. **Shared Understanding** — team/ADR/sprint name only. **Never in product UI.**
2. User copy examples: *"검토 전에 사업 이해를 함께 확인하겠습니다."* · Card zones: **문서에서 확인한 내용** → **함께 결정해야 할 내용** → **대표님의 판단**.
3. **Validation:** one question — *"평가하려는 것 같나요, 이해하려는 것 같나요?"* Ladder: CEO (1) → pre-founders (3) → users (10).
4. **Sprint sequence (user-facing):** (1) Business Understanding → (2) Business Review → (3) AI PM Presence.
5. **Stop:** no new philosophy docs; post-validation work = **sentence polish only**.

### Consequences

- [`SHARED_UNDERSTANDING.md`](./sprints/SHARED_UNDERSTANDING.md) — internal validation playbook
- Vision one-liner: evaluate-after-shared-understanding, not report generator
- UI Review CTA: **검토 시작** after founder-confirmed context

---

## ADR-043: Product Freeze v1 + Product Fit Sprint (CPO)

**Status:** Accepted  
**Date:** 2026-07-30  
**Approver:** CPO

### Context

Two–three weeks of internal concepts (ORDA, Zero Lie, Shared Understanding, Domain Model, …) — **users perceive <5%.** LaunchLens enters **polish / product-fit**, not build.

### Decision

1. **Product Freeze v1** — locked: Architecture, Route, Workspace IA, AI PM Concept, Business Flow.
2. **Allowed changes:** copy, spacing, interaction polish only — in order: Observation → Copy (≤5 lines) → Interaction → Presence.
3. **Sprint 1 name:** **Product Fit Observation** — observe only, **no fixes** in session. Facilitator: *"PDF 올려보세요."*
4. **KPI:** unprompted *"평가부터 하지 않고 먼저 이해하려고 하네"* vs *"잠깐."* — not technical PASS/FAIL.
5. **Forbidden until Sprint 2+:** new screens, components, domains, AI, prompts, flows.
6. **Validation sheet:** time-bucket observation (0–5s / 5–15s / 15–30s / 30s+) — see [`PRODUCT_FIT_OBSERVATION.md`](./sprints/PRODUCT_FIT_OBSERVATION.md).

### Consequences

- CTO work unit: **Observation → hypothesis → copy delete/edit** — not feature tickets.
- Sprint 2: Copy Polish (max 5 jarring sentences). Sprint 3: Interaction. Sprint 4: AI PM Presence.
- No new philosophy docs. Internal terms stay in ADR only.

---

## ADR-044: Sprint 3 Align Before Review — Product identity lock (CPO)

**Status:** Accepted  
**Date:** 2026-07-30  
**Approver:** CPO

### Context

Sprint 3 completes the pre-review trust loop. LaunchLens identity shifts from *"AI understands your business"* to **structuring founder thinking so they can choose better strategy**.

### Decision

1. **Product one-liner:** *대표가 더 좋은 전략을 결정할 수 있도록 사고를 구조화하는 AI PM*
2. **Internal spine:** `Understand Reality → Evaluate → Explore Options → Decide` (not Read/Understand/Align/Review user-facing labels alone).
3. **Align Before Review:** max 1–2 questions; no strategy completion pre-review; three low-pressure direction options.
4. **Review-ready copy (Zero Lie):** AI must **not** claim document is *sufficient* — only *start review on current document* and flag gaps / unknowns without guessing.
5. **Sprint 4 name:** **Strategic Options** — PM presents Option A/B/C with trade-offs; founder decides; AI re-evaluates.
6. **Principle (immutable):** **AI does not decide for the founder** — reads, structures, proposes options; founder decides.

### Consequences

- Review is the start of the loop, not the end.
- Sprint 4 builds Strategic Options (trade-off workshop), not recommendation dumps or score-only reports.
- Copy gate: any "충분히 확인" / "예상됩니다" phrasing in pre-review UI is a regression.

---

## ADR-045: Sprint 4 P0 Validation gate — no P1 until Insight → Candidate proven (CPO)

**Status:** Accepted  
**Date:** 2026-07-31  
**Approver:** CPO

### Context

Sprint 4 P0 ships Insight → Candidate → Agreement after Review. Product identity is now **"AI PM that structures founder decisions"** — not score-only analysis. CPO observed founders after Review ask *"왜 이런 결과?"* (**Review Debrief**) before wanting Workshop. Building Option A/B/C before validating the Insight → Candidate connection risks Workshop feeling like AI instruction.

### Decision

1. **P1 Workshop blocked** until Validation yields CPO **Product Response** consensus (not PASS/FAIL).
2. **LaunchLens Validation methodology (rev. 4):** Observation (Pause · Sentence · Question) → **Thinking Shift** (what changed in founder's mind) → **Product Response** (AI PM's next move matched to thinking stage).
3. **Thinking Shift** is the core layer — not UI interpretation. Example: Insight success = founder holds new thought (*"시장 진입이 중요하구나"*) before *"그럼 어떻게?"*
4. **Product Response mapping:** importance not yet accepted → Insight/Debrief · accepted + solution-seeking → Workshop · comparison wanted → Option compare · execution wanted → Action Plan (later).
5. **Differentiation:** measures **founder thinking change** and designs **PM's next action** — not generic UX PASS/FAIL.

### Consequences

- [`sprints/SPRINT_4_P0_VALIDATION.md`](./sprints/SPRINT_4_P0_VALIDATION.md) — Thinking Shift validation methodology (rev. 4)
- CTO: no P1 implementation tickets until CPO records PASS
- LaunchLens core: **show thinking connections**, not deliver answers

---

## ADR-046: S.I. Core V1 — judgment before questions

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. V1  
**Authors:** CTO (autonomous)

### Context

The first founder path after business input was interpretation + question generation, not a viability judgment. Design-only S.I. docs did not change the product. Question-engine work (including PR #89) stays frozen.

### Decision

1. Ship an independent Strategic Intelligence analyzer that recomputes from existing business input. No new persist SoT.
2. First workspace surface after document input is S.I. Review: current judgment, why possible, why fail, evidence classes (FACT / CLAIM / INFERENCE / ASSUMPTION / VALIDATED), Critical Unknown, decision-changing evidence, next one validation.
3. Five axes A–E and stages S0–S4 inform the prose. Scores are not shown first.
4. AI PM questions remain a later layer (Phase 3). This PR does not edit the question engine.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Improve question engine first | Existing path | Repeats the wrong product |
| Persist a new SI SoT | Stable history | Premature; Phase 1 is recomputed |
| Score-first viability | Easy UI | Hides the actual judgment |

### Consequences

- Calibration cases 주인집 / LMULM / RIDM AI lock quality before more UI or AI PM bind.
- PR #89 is not modified.

---

## ADR-047: S.I. Phase 2 — founder evidence updates the judgment

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. V1 Phase 2  
**Authors:** CTO (autonomous)

### Context

Calibration Gate is CONDITIONAL PASS on PR #92. The remaining product question is not C4/C5 prose. It is whether one founder answer can reclassify evidence and move Critical Unknown, judgment, and Validation Priority. Intent must stay CLAIM, not VALIDATED.

### Decision

1. Keep PR #92 Core/Review Surface as the frozen first-judgment baseline. Phase 2 ships on a separate branch.
2. `updateStrategicIntelligence()` recomputes from `documentText + [Founder evidence]` plus the previous judgment. No new persist SoT.
3. Quantified completed action (count + 등록/거래/재구매) is VALIDATED and can lift stage / unknown / next validation. Intent-without-action stays CLAIM.
4. Analyzer generalization only: quantified completion vs intent. No brand-name branches, scores, question-engine bind, AI PM, or UI.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Patch C4/C5 sentences on #92 | Looks complete | Misses the actual product loop |
| Merge Phase 2 into #92 | One PR | Mixes a locked gate with new behavior |
| Treat any founder answer as FACT | Simple | Collapses CLAIM/INTENT into VALIDATED |

### Consequences

- First-path judgments on the five calibration cases stay identical to the #92 lock.
- Question engine and PR #89 remain untouched.
- Phase 3 (AI PM bind) waits until this update loop is proven.

---

## ADR-048: S.I. Phase 3 — AI PM binds to the S.I. validation ask

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. V1 Phase 3  
**Authors:** CTO (autonomous)

### Context

Phase 2 PASS proved one founder answer can move the judgment. The missing product structure is who chooses the next ask. The gap engine (`decideNextQuestionFromReview`) must not be rewritten to fit S.I.

### Decision

1. S.I. decides the validation ask from Critical Unknown + Decision Evidence + Validation Priority.
2. AI PM is the execution layer: it presents one executable question for that ask. It does not pick the topic.
3. The founder answer re-enters `updateStrategicIntelligence()` (PR #93). No new persist SoT.
4. The question is composed from the ask kind, not copied from Critical Unknown, and not hardcoded to a business name.
5. PR #93 stays frozen. This ships on a separate branch. PR #89 and P0-1/P0-2 paths are not edited.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Rewrite `decideNextQuestionFromReview` | One question source | Breaks P0-1/P0-2 and PR #89 |
| Copy Critical Unknown as the question | Fast | Not a verification ask |
| Full AI PM replacement | Clean IA | Out of Phase 3 scope |

### Consequences

- First AI PM question after S.I. Review is the S.I. validation ask.
- The existing gap loop remains for P0 paths; it is not the source of this ask.
- Phase 3 success is the closed loop, not question count.

---

## ADR-049: S.I. is the judgment owner in the Founder Journey

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. Integration Gate  
**Authors:** CTO (autonomous)

### Context

Phase 3 PASS proved S.I. → AI PM bind. The next risk is not missing questions. It is the existing gap loop taking the journey back to a non-S.I. ask and overwriting the judgment. CPO forbids rewriting `decideNextQuestionFromReview` until this gate is measured.

### Decision

1. Lock the product layering: S.I. judges, AI PM executes one validation, evidence returns to S.I.
2. S.I. reads the original business input. Gap-loop document rewrites are ignored as S.I. source.
3. Keep the gap loop mounted. Do not delete or retarget `decideNextQuestionFromReview`.
4. Integration Gate measures five calibration businesses against six acceptances. Gap-loop overwrite is P0.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Replace gap loop now | One question source | Unmeasured P0-1/P0-2 risk |
| Let gap loop rewrite the SI document | Simple state | Overwrites the judgment owner |
| Copy Critical Unknown as the ask | Fast | Already rejected in Phase 3 |

### Consequences

- Replacement of the gap engine is a later CPO decision, not this PR.
- PR #89, P0-1/P0-2, and Production stay untouched.

---

## ADR-050: ADAPT — S.I. Validation Priority sits above the gap engine

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. Validation Priority Adapter  
**Authors:** CTO (autonomous)

### Context

PR #96 classified 5/5 as B. CPO chose ADAPT: do not KEEP the dual path, do not REPLACE the gap engine. S.I. Validation Priority must win when it exists.

### Decision

1. `resolveSiV1ValidationPriority()` is an independent adapter. It does not edit `decideNextQuestionFromReview`.
2. Final ask: SI priority present → SI validation question; else existing gap-loop question.
3. Business-understanding confirm is not stolen. SI errors fall back to the gap loop.
4. Founder answers enter `updateStrategicIntelligence()` (`si-v1-update`).

### Consequences

- Gap loop remains mounted as fallback/state.
- Long-term KEEP/ADAPT/REPLACE of the engine waits for this adapter's evidence.

---

## ADR-051: S.I. V1 Founder Journey is a two-turn evidence loop

**Status:** Accepted  
**Date:** 2026-10-06  
**Sprint:** S.I. Founder Journey E2E Gate  
**Authors:** CTO (autonomous)

### Context

PR #92–#97 built judgment, evidence update, AI PM bind, journey integration, and the ADAPT adapter. CPO required the product loop to run twice before Production.

### Decision

1. A Founder Journey E2E Gate proves: input → judgment → ask → answer → `si-v1-update` → re-judgment → next ask → second answer → re-judgment.
2. No new product capability. Founder answers accumulate on the original business document via the existing `[Founder evidence]` append.
3. Gap Loop remains fallback. The question engine is not edited.

### Consequences

- LMULM/클리닉/핏브릿지 move Critical Unknown and Validation Priority on the first validated answer.
- 주인집/RIDM can change stage/verdict while the original unverified sentence still holds CU. That is recorded, not patched here.

---

## ADR-052: Execution ledger file is local SQLite, not the production database

**Status:** Accepted  
**Date:** 2026-10-15  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

CPO approved a server execution ledger and real process-restart checks. Production schema and deploy stay locked at `0b465226`. The published privacy text does not define an erasure window.

### Decision

1. The ledger adapter is a local SQLite file opened with Node's `node:sqlite`. It is not a Supabase or Prisma migration and it is not mounted on an HTTP route.
2. An acceptance commit is one transaction: the `accepted` event and the seal. A killed process or a thrown error before `COMMIT` leaves neither row.
3. `event_id` is unique. Replaying it does not add a row. An illegal later phase for the same execution id stays in the file and is ignored by the fold.
4. Recovery of `in_progress` appends `unconfirmed` and does not open another execution. `networkCalled=false` is not treated as proof that no request was sent.
5. The 30-day erasure proposal stays unconfirmed until a published privacy policy states a window. This adapter does not delete on a timer.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Local SQLite file | Transactions, unique keys, survives process death, no production schema change | Not the production database. Node marks `node:sqlite` experimental on v22.14.0 |
| Production Supabase migration | Shared server database | Touches the locked production schema and needs a deploy |
| Conditional row update | One row per execution | A bad update can replace the first failure |

### Consequences

**Positive:**

- Restart checks can kill a process and read the same file from a new process.
- Acceptance cannot be counted from a phase row or a seal alone.

**Negative:**

- The live journey screen still has no ledger. Connecting this file to a request path is a later change.
- Filesystem mode `0600` is the access control. There is no separate authz service.

**Neutral:**

- Model calls, API keys, and automatic retries stay out of this adapter.

---

## ADR-053: Limited model call waits on a trace contract

**Status:** Proposed  
**Date:** 2026-10-15  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

Local SQLite restart checks do not show that a model improved a business judgment. The published privacy text has no erasure window. A live Gemini or GPT call is not approved.

### Decision

1. The next review artifact is `docs/evidence/ALABOM/AI-PM/LIMITED-MODEL-CALL-CONTRACT.md`.
2. A later call must trace execution, hypothesis, stored source, and model excerpt separately. Agreement does not set `verifiedFact`.
3. Caps stay at one Gemini slot, one GPT slot, 1024 output tokens, and 30 seconds. Those caps are not a live client yet. Automatic retry stays off.
4. No erasure period is promised. The older 30-day sentence is an unadopted proposal.
5. This ADR does not approve a model call, a route, a UI binding, or a deploy.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Write the contract before any call | CPO can approve a bounded call later | No new evidence about judgment quality |
| Call the models now | Would produce real text | Outside the approved scope |

### Consequences

**Positive:**

- Fixture results stay labeled as fixture results.
- Privacy copy cannot be read as a 30-day deletion promise.

**Negative:**

- The product screen still has no ledger and no model analysis.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-054: External AI text stays a user paste until a path is confirmed

**Status:** Proposed  
**Date:** 2026-10-15  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

The no-API constraint rules out a live model call. Reading ChatGPT, Claude, or Gemini web pages is not an allowed automation. Chrome's built-in Prompt API was absent in this environment, and no local model runtime was installed. The product still needs a place to hold an outside sentence without treating it as a verified fact.

### Decision

1. The comparison and local proof are `docs/evidence/ALABOM/AI-PM/AI-CONNECTION-ARCHITECTURE.txt`.
2. ALABOM keeps the judgment. A pasted sentence is a reference: `verifiedFact` is false, `liveModelCall` is false, and a failed or duplicate paste does not replace the prior judgment.
3. Do not add a content script, host permission, API key, or model HTTP client for this path.
4. Browser-builtin and local models stay unverified. They are not selected.
5. This ADR does not confirm the architecture, merge, or production deploy.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Extension reads the AI page | Fewer manual steps if it worked | Terms and robots block it. No live proof. UI breakage is ongoing cost |
| Chrome Prompt API or a local model | No separate model API fee | Not available in this environment. Korean Prompt API support is not in the published language list. Quality unmeasured |
| User pastes the result | No model call, no page scraping, execution id stays with the note | User labor is not zero. No real model text has returned. Judgment text stays deferred |

### Consequences

**Positive:**

- The screen can hold a reference and the next prompt can include a founder's later answer.
- Empty collection does not overwrite the deferred judgment.

**Negative:**

- A real AI round trip is still not demonstrated. The paste tested here was typed locally.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-055: A pasted analysis can change the deferred judgment only with a recorded reason

**Status:** Proposed  
**Date:** 2026-10-15  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

A stored paste is not evidence that the business judgment improved. The next check is whether a brought sentence changes the deferred judgment, which hypothesis it touches, and why the next question was chosen. No live model response is available.

### Decision

1. The trace is `docs/evidence/ALABOM/AI-PM/JUDGMENT-DEVELOPMENT.txt`.
2. Every comparison stores the previous judgment, the next judgment, the affected hypotheses, and the reason. `verifiedFact` and `validated` stay false. `realAnalysisSuccess` stays false because this path does not observe a model.
3. A test sentence and a user declaration are different labels. A declaration is not a live success.
4. Missing original text or a missing source leaves the previous journey state in place.
5. This ADR does not confirm the connection architecture, a Chrome extension, a merge, or a deploy.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Leave the judgment sentence frozen for every paste | Protects the deferred status | Hides whether a new sentence changed the hypothesis |
| Promote agreement to VALIDATED | Would look like a finished judgment | Breaks the product contract |

### Consequences

**Positive:**

- Scenarios A through E show the judgment before and after, with the execution id when a sentence was stored.
- A founder answer can be recorded without changing the judgment sentence.

**Negative:**

- The readings use test sentences. They do not measure a live model's judgment quality.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-056: A user declaration is not a system-verified analysis

**Status:** Proposed  
**Date:** 2026-10-15  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

The judgment trace can store a pasted sentence. No founder has brought a sentence from their own AI session. A changed judgment sentence can be mistaken for an improvement.

### Decision

1. The intake check is `docs/evidence/ALABOM/AI-PM/REAL-ANALYSIS-INTAKE.txt`.
2. `userDeclaredReal` records only the user's label. `systemVerified` stays false. `realAnalysisSuccess` stays false until a model response is observed, which this path does not do.
3. A missing original, execution id, or source is listed and the previous journey state stays in place.
4. `improvementAssessed` and `linkJustified` stay false. A different sentence is not an improved judgment.
5. This ADR does not confirm the architecture, a merge, or a deploy. No real external analysis was obtained.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Treat a user declaration as a live success | The field would look complete | The system did not see the model |
| Add more test sentences | More green tests | Does not measure judgment quality |

### Consequences

**Positive:**

- The screen and the stored note use the same labels for a test sentence and a user declaration.
- Empty intake does not replace the deferred judgment.

**Negative:**

- Model quality and judgment accuracy remain unverified.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-057: Forecast sentences stay assumptions, and a repeated open gap yields

**Status:** Proposed  
**Date:** 2026-10-16  
**Sprint:** ALABOM validation journey  
**Authors:** CTO (autonomous)

### Context

External models were not adopted as the judgment engine. The remaining question is whether the TypeScript rule engine can move Claim, Assumption, and the next question without a model. V3 question selection did not apply the existing cap of two unclosed asks on the same gap. A partial gap such as `problemJtbd` could stay selected. Forecast sentences in a plan could be read as received revenue.

### Decision

1. The trace is `docs/evidence/ALABOM/AI-PM/RULE-ENGINE-AC16-AC5.txt`. The captured run is `experiments/rule-engine-ac/trace.json`.
2. `decideNextQuestionFromReview` yields after `MAX_SAME_GAP_ASKS_BEFORE_YIELD` unclosed asks on a probe or clarify. The stored gap completeness stays partial. A first ask still probes the same gap. A closed payer stays excluded.
3. `PlanClaim.claimStatus` is `CLAIM` or `ASSUMPTION`. There is no Fact status. `ledgerChecked` stays false. Four exact LMULM forecast sentences become assumptions only when they appear in the source text.
4. Founder choices, an edited customer, an unknown mix, and a counter-claim change or end the next question. They do not promote a claim to a verified fact.
5. This ADR does not adopt a model, a score, a merge, or a Production deploy. `liveModelCall` stays false. Production SHA `0b465226` stays the lock.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Leave the V3 decider without the ask cap | First partial probe stays simple | The same open gap can be selected again |
| Add a Fact status for document numbers | Looks closer to a finished ledger | A sentence in a plan is not a checked transaction |

### Consequences

**Positive:**

- Two unclosed asks on `problemJtbd`, with payer already closed, select `businessOneLiner`.
- S3–S6 stay assumptions. The parent-company answer path does not repeat the mix question.

**Negative:**

- The conversion-rate sentence is not its own state node. The engine does not write a business judgment at the level of a manual GPT reading.
- Three older tests already failed on the previous decider. This ADR does not mark that suite as passing.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-058: Google chat uses Gemini generateContent HTTP

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** ALABOM Gemini call path  
**Authors:** CTO (autonomous)

### Context

`GoogleProviderAdapter.chat` inherited the base stub. A configured key returned `[Google Gemini stub]` and estimated tokens. That response could be read as a successful model call. The business-review screen still prepares a paste handoff and does not select this adapter.

### Decision

1. `GoogleProviderAdapter.chat` calls `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with header `x-goog-api-key`. The key is not placed in the query string.
2. A missing `GOOGLE_AI_API_KEY` throws a configuration error. The base stub does not run for Google chat, stream, complete, or embed.
3. A request is refused before fetch when `GOOGLE_AI_MAX_OUTPUT_TOKENS` is unset or `request.maxTokens` exceeds it. This adapter does not set `costUsd` to 0. Missing `usageMetadata` sets `usageKnown` false and does not estimate tokens.
4. The request body does not include a search or grounding tool. `groundingUsed` is false and `sourceUrls` is empty.
5. `runPreservedGeminiPasses` keeps round 1 and round 2 as separate objects. The journey screen and the database do not call it. Wiring them is a later change.
6. This ADR does not approve a live paid call, a Production deploy, or a PR merge. Anthropic, Azure, and Ollama keep their existing stub behavior.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Leave the Google stub until a key exists | No network code | A present key still looks like success |
| Send `google_search` in the same change | Citations could appear | Search has a separate quota and price and was not implemented |
| Point `getResearchProvider('gemini')` at this client | One id would look connected | That id is the OpenRouter research provider, and the screen does not call `execute()` |

### Consequences

**Positive:**

- Tests can prove the HTTP request, auth failure, server error, timeout, and the two-pass body with an injected fetch.
- A stub string is rejected as an analysis round.

**Negative:**

- The business-review screen still has `liveModelCall: false` on the paste handoff.
- Dollar cost stays unknown. The static price table is not a bill.

**Neutral:**

- Production SHA `0b465226` stays the lock. Live Gemini remains NOT RUN until a key and a paid call are both approved.

---

## ADR-059: Gemini replies return through generateContent, not a bookmark

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** Gemini E2E-01  
**Authors:** CTO (autonomous)

### Context

ALABOM needs a business question to leave, a reply to come back, and that reply to be readable again on the business-validation screen. The repository has URL bookmarks and an extension at `experiments/external-ai-roundtrip`. That extension refuses `gemini.google.com` and does not return a Gemini reply. No bookmarklet reads a Gemini response. Reading the Gemini page would be automated collection of a disallowed path.

### Decision

1. The execution path is the official `generateContent` client from ADR-058.
2. `recoverGeminiRound` stores round 1 and round 2 in a local sqlite table `gemini_rounds`. The same execution id is not sent twice. A failed round 2 leaves round 1 in place. Empty text, auth failure, and timeout store `content: null`.
3. A missing approval, key, or output ceiling stores `not_run` and does not call the network.
4. The business-validation screen reads `/api/gemini-rounds` after login. Search sources stay absent.
5. The sqlite file is not the production database. Rollback is `DROP TABLE gemini_rounds` and deletion of `GEMINI_ROUND_DB_PATH`.
6. This ADR does not approve a paid call, a Production deploy, or a PR merge.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Reuse the extension message listener | A message path already exists | It calls pollinations and forbids Gemini hosts |
| Bookmark the Gemini page | A person can open the page | Opening the page does not return the reply to ALABOM |
| Store the reply on `ExternalNote` | The journey already lists notes | `liveModelCall` on that type is fixed to false and origin is `user_paste` |

### Consequences

**Positive:**

- Injected HTTP tests store an original, reopen it, and build the second request from the first original plus feedback.
- The screen has a place to show that original or an explicit empty failure.

**Negative:**

- No live Gemini original exists in this change. The screen cannot show one until a key, a ceiling, and a paid call are present.
- The sqlite file does not follow a Vercel instance across machines.

**Neutral:**

- Production SHA `0b465226` stays the lock. PR #202 stays unmerged.

---

## ADR-060: Free Gemini web text returns only by user paste

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** Free Gemini web roundtrip  
**Authors:** CTO (autonomous)

### Context

The product path is a person using the free Gemini web page, then bringing the reply back into ALABOM. PR #202 and PR #203 call the official generateContent API. That is a different path. The extension in `experiments/external-ai-roundtrip` refuses `gemini.google.com`. No bookmarklet returns a Gemini reply. Reading the Gemini page is not allowed.

### Decision

1. Do not merge PR #202 or PR #203. Do not add another generateContent feature. Do not delete the existing API code in this change.
2. `acceptFreeGeminiWebPaste` stores a person-supplied original and http(s) URLs in session storage `alabom.freeGeminiWeb.v1`. An empty original is not stored. Round 2 includes the round 1 original and the feedback. `webRoundtrip` stays `NOT_RUN`. `verifiedFact` stays false. `apiCalled` stays false.
3. The business screen shows that prompt and the saved paste. It does not open or read the Gemini page.
4. A pasted fixture is not evidence of a free Gemini web reply.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Extend `/api/gemini-rounds` | One store | That route is the paid API path |
| Drive the Gemini page | Could capture a reply | Disallowed automated collection |
| Reuse only the journey handoff | Already on the understanding view | It does not keep source URLs or a separate round 2 prompt from the business form |

### Consequences

**Positive:**

- A person can copy a prompt, paste a reply, reload the page, and copy a second prompt that contains the first reply.
- Missing text and missing URLs stay visible as missing.

**Negative:**

- No free Gemini web original is in the repository. The completion criterion is not met.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-061: Short ideas get a specific hold, not a generic one

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** Short idea business review  
**Authors:** CTO (autonomous)

### Context

LMULM and RIDM excerpts already separate a document claim from an unverified forecast. A short founder note, such as the banchan delivery sample, received only the generic hold. The plan box also rejected text that was not one of those two excerpts.

### Decision

1. Do not change the LMULM or RIDM fixtures, and do not treat them as verified revenue.
2. `founder_input` with business, customer, and problem and no plan case opens `openingShortIdeaJudgment`. The first question asks for one recent loss. Later questions separate the user from the buyer, then willingness to pay, then which stated problem costs the most. Missing prices, counts, and loss amounts stay missing.
3. A note with `사업`, `대상` or `고객`, and `문제` or `핵심` can start that review. Text that still cannot be split is not a format rejection. The three fields remain the start.
4. A real Gemini web reply is not created here. `webRoundtrip` stays `NOT_RUN` until a person pastes one.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Add banchan as a third plan profile | Reuses the excerpt engine | Forces a short note into a business-plan schema |
| Call Gemini for every short note | Could write a custom paragraph | Paid call, and no web original would be stored |

### Consequences

**Positive:**

- A three-field note names what was said and what is still unknown.
- An answer either changes the judgment or says why it stayed.

**Negative:**

- The questions are rules over the entered words. They are not a Gemini web reply.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-062: The user-facing reviewer is AI PM

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** AI PM first review  
**Authors:** CTO (autonomous)

### Context

The first business review needs one model call, a structured result, and a multiple-choice correction from the founder. Naming that step after a model vendor makes a later engine change look like a different product. Token counts and model ids are operating data, not part of the founder's decision.

### Decision

1. Screens, buttons, status lines, and review history say AI PM. The first review covers customer and payer, problem and solution, market evidence, revenue, execution, and risks, plus unknowns and the hypothesis to test next.
2. The server adapter for this loop is OpenAI chat, one call for a new plan. Gemini is not called here.
3. Submitting feedback stores agreement, factual accuracy, revision areas, a free comment, and the next action on that review version. The comment is allowed when "other" is not selected. Feedback does not call a model.
4. Opening the same plan reads the stored review. A requested follow-up sends the stored sections, the feedback, and any new facts. The original plan text remains on every version.
5. Model id, token counts, latency, and errors are stored on the sqlite row and omitted from the screen payload. A missing key stores `not_run` and no review text.
6. The sqlite file is not the production database. Rollback is `DROP TABLE ai_pm_reviews`, `DROP TABLE ai_pm_feedback`, and deletion of `AI_PM_REVIEW_DB_PATH`.
7. This ADR does not approve a Production deploy, a PR merge, or a Gemini comparison.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Show the model name on the result | Operators see which engine answered | A model change looks like a new product |
| Call the model again for every feedback item | The next paragraph could mention the correction | Spends a call when the choice itself is the record |

### Consequences

**Positive:**

- The same plan text from a file or a text box shares one stored review.
- A later engine can read the old plan, review, and feedback without renaming the screen.

**Negative:**

- The founder's screen cannot show token cost. That comparison stays in the stored row.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-063: AI PM reviews read GPT_API_KEY and local sqlite is not durable

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** AI PM first review  
**Authors:** CTO (autonomous)

### Context

The first review route checked `OPENAI_API_KEY`. The key added for this path is named `GPT_API_KEY`. Treating those names as the same would hide a missing key. The review rows are in `.data/ai-pm-reviews.sqlite`. Vercel functions have a read-only filesystem except ephemeral `/tmp`, so that file does not survive a new instance or a redeploy.

### Decision

1. `readGptApiKey()` returns `GPT_API_KEY` only. A set `OPENAI_API_KEY` does not start `/api/ai-pm-review` or `/api/ai-pm-review/follow-up`.
2. A missing `GPT_API_KEY` stores `not_run` with internal reason `gpt_api_key_missing` and no review text.
3. API responses include `storage.durable: false`. The screen says the saved review can disappear when the server changes. This file is not the production database.
4. No live model call is recorded until `GPT_API_KEY` is present in the process that runs the review. This ADR does not approve a merge or a Production deploy.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Fall back from `GPT_API_KEY` to `OPENAI_API_KEY` | A local key would run the call | The two names would stay confused |
| Move the rows to `/tmp` on Vercel | Writes would be allowed | `/tmp` is still ephemeral and not shared across instances |

### Consequences

**Positive:**

- A missing `GPT_API_KEY` stays visible as not run.
- The screen no longer says the local file will still be there after a redeploy.

**Negative:**

- Founder reviews on Vercel are not retained until a production database is connected.

**Neutral:**

- Production SHA `0b465226` stays the lock.

---

## ADR-064: AI PM reviews belong in the existing Supabase project

**Status:** Accepted  
**Date:** 2026-10-27  
**Sprint:** AI PM first review  
**Authors:** CTO (autonomous)

### Context

`.data/ai-pm-reviews.sqlite` does not survive a Vercel redeploy. The product already has one Supabase project and migrations `001`–`022`. `public.business_plans` stores a project document with a fixed section list. It does not store a review version, the original plan text for that review, or multiple-choice feedback.

On 2026-10-27 the configured `SUPABASE_URL` host had no public DNS record from this process or from 8.8.8.8 and 1.1.1.1. The migration could not be applied.

### Decision

1. Add `public.ai_pm_reviews` and `public.ai_pm_feedback` in `packages/db/src/migration/023_ai_pm_reviews.sql`. Service role writes. Row level security is on. There is no anon policy.
2. `SupabaseAiPmReviewRepository` in `@repo/db` is the access path. Apps do not import the Supabase SDK.
3. `openReviewBackend()` uses `SupabaseAiPmReviewRepository` when `isSupabaseAdminConfigured()` is true. The success response then has `storage.durable: true`. When the service role is absent, the API uses local sqlite and `storage.durable: false`. A storage error returns `storage_unavailable` and `durable: false`. It does not describe that failure as a saved durable review.
4. `user_id` references `auth.users` with `on delete cascade`. Deleting the account deletes that user's plan text, reviews, and feedback. Deleting a review deletes its feedback. Reads and writes include the session user id. No anon policy is added.
5. No second database is added. Migration 023 is still not applied, because the configured host has no public DNS record.

### Pre-apply review (2026-10-27 20:15 KST)

Schema: two new tables only. `001`–`022` are not altered. There is no seed insert. `user_id` is text and does not reference `auth.users`, so deleting a user does not delete the plan text. Feedback rows do not reference `ai_pm_reviews`. `record_json` stores the plan, the review sections, the feedback, and token counts. The stored review type has no API key field. Row level security is on and there is no anon policy, matching `analytics_events`.

Existing data: no current table is changed and no current row is updated or deleted. `business_plans` stays a project document.

Rollback: `DROP TABLE public.ai_pm_feedback;` then `DROP TABLE public.ai_pm_reviews;`. Indexes drop with the tables. The review route does not write these tables yet, so dropping them does not change the running API.

Persistence: rows in Supabase Postgres survive a Vercel redeploy. The review API now calls `SupabaseAiPmReviewRepository` when the service role is configured. The configured host still has no public DNS record, so 023 is not applied and this process has not written a row. Until that write succeeds, durable storage is not secured. `.data/ai-pm-reviews.sqlite` remains `storage.durable: false`.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Reuse `business_plans` | Table already exists in the schema | A review version and feedback do not fit its section enum or project foreign key |
| Add a new database host | Empty and available | The product already has Supabase, and the current host is the one to restore |

### Consequences

**Positive:**

- The durable shape is in the repo and matches the sqlite columns.

**Negative:**

- Rows are not durable until the Supabase host resolves and 023 is applied.

**Neutral:**

- Production SHA `0b465226` stays the lock. PR #207 stays unmerged.

---

## ADR-065: The workspace review is one flow, and rule output is not the model result

**Status:** Accepted  
**Date:** 2026-10-28  
**Sprint:** AI PM first review  
**Authors:** CTO (autonomous)

### Context

The Preview workspace showed the rule-engine hold, the same source text, and the unconfirmed items in several blocks. That screen can be read as a model review. A stored server call does not prove the visible screen made a new call.

### Decision

1. When a founder document is present and the screen is not the scripted sample playback, the workspace column is only the AI PM review flow: result, feedback, revised judgment, next check.
2. A ready review whose input matches the document is labeled as the model review. Input with no matching review is labeled as the source text and does not invent a hypothesis or show the rule question.
3. Feedback marks are `understanding_accurate`, `understanding_wrong`, `core_missing`, `unnecessary`, `evidence_unclear`, and `question_unfit`. Saving them does not call a model. A logged-in save is attached to that review. A logged-out save stays in the browser and says so.
4. The revised screen applies those marks in product code. The model follow-up remains the existing one-call path and is not sent by the feedback save.

### Alternatives Considered

| Option | Pros | Cons |
| --- | --- | --- |
| Add the new blocks under the rule judgment | Less removal | The screen still reads as a model review |
| Call the model again to rewrite the judgment after each mark | The next text would be a new model result | The requested change is the product flow, not more calls |

### Consequences

**Positive:**

- The founder sees one next action, and a rule judgment is not labeled as the model review.

**Negative:**

- Scripted sample playback still uses the earlier workspace. A document screen no longer shows the understanding cards beside the review.

**Neutral:**

- Production SHA `0b465226` stays the lock. PR #207 stays unmerged.

---

## Template

See [templates/ADR_TEMPLATE.md](./templates/ADR_TEMPLATE.md) for new entries.
