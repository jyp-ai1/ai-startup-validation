# Tasks

Current and recent sprint tasks. Update at sprint start and completion.

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
