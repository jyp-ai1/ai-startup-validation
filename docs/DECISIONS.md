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

## Template

See [templates/ADR_TEMPLATE.md](./templates/ADR_TEMPLATE.md) for new entries.
