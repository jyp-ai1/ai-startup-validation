# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Sprint 9: Naver Commerce MVP — first production feature
- `apps/web/modules/naver-commerce` — product import pipeline
- UI dashboard at `/naver-commerce` (URL input, preview, pipeline status)
- Module-local `image-service.ts` (Sharp: resize, webp, zip, metadata removal)
- AI content generation via `@repo/ai`
- Product Draft JSON (Naver Smart Store compatible)
- API routes: `/api/naver-commerce/import`, `/api/naver-commerce/draft`
- Tests: extractor, image, draft, pipeline integration
- `docs/NAVER_MVP.md`, `PRODUCT_PIPELINE.md`, `IMAGE_PROCESS.md`
- Sprint 8: `@repo/browser` — Browser Platform (Playwright)
- BrowserManager, BrowserPool, ContextManager, PageManager
- Navigation, Selectors, Download, Cookies, Screenshot, Network Monitor
- Real `browser.crawl` job — HTML extraction, screenshot, image download
- Integration test with local HTML fixture (no external websites)
- `apps/web/lib/browser/platform.ts`
- `docs/BROWSER_PLATFORM.md`, `PLAYWRIGHT_GUIDE.md`, `SESSION_MANAGEMENT.md`, `DOWNLOAD_MANAGER.md`
- ADR-011: Browser Platform + Playwright isolation
- Sprint 7: `@repo/automation` — Automation Platform
- Scheduler, Queue, Job system, Pipeline engine, Execution manager
- Demo jobs + Naver upload pipeline (scan → crawl → optimize → generate → upload)
- Interface tests (9 tests)
- `apps/web/lib/automation/platform.ts`
- Product-first roadmap (Sprint 8–14)
- ADR-010: Automation Platform + Product-First Roadmap
- Sprint 6: `@repo/mcp` — MCP Runtime Platform
- MCPRuntime, MCPGateway, WorkflowEngine, ToolRegistry
- Permission layer, 10 adapter stubs, transport interfaces
- Interface tests (16 tests)
- `apps/web/lib/mcp/platform.ts`
- `docs/MCP_PLATFORM.md`, `MCP_RUNTIME.md`, `WORKFLOW_ENGINE.md`, `TOOL_REGISTRY.md`, `MCP_SECURITY.md`
- ADR-009: MCP Runtime Platform
- Sprint 5: `@repo/ai` — Provider-agnostic AI Platform
- Provider Registry (OpenAI, Anthropic, Google, OpenRouter, Azure, Ollama)
- Model Registry, ChatService, Prompt Manager, Tool Calling
- Observability, Token Manager, Response Cache
- Interface tests with Vitest (20 tests)
- `apps/web/lib/ai/platform.ts`
- `docs/AI_PLATFORM.md`, `LLM_ARCHITECTURE.md`, `PROMPT_ENGINEERING.md`, `MODEL_SELECTION.md`, `COST_MANAGEMENT.md`
- ADR-008: Provider-agnostic AI Platform
- Sprint 4: `@repo/feature-auth` — Enterprise Authentication & Authorization Platform
- Permission Engine (Registry, Resolver, Checker, Guard, Provider)
- RBAC with 6 roles and 12 permissions
- Middleware (requireLogin, requireRole, requirePermission, requireOrganization)
- React hooks (useSession, useUser, usePermission, useRole) and gate components
- Audit logger with typed security events
- `apps/web/lib/auth/platform.ts` — app entry for auth platform
- `docs/AUTH_PLATFORM.md`, `docs/RBAC.md`, `docs/SECURITY_MODEL.md`
- Quality tracking: `docs/QUALITY_REPORT.md`, `docs/TECH_DEBT.md`, `docs/TEST_COVERAGE.md`
- ADR-007: Authentication / Authorization separation
- Sprint 3: `@repo/db` hexagonal database platform + Supabase adapter
- Repository implementations (User, Organization, Project)
- Auth, Storage, Realtime ports + DI container
- `packages/features/` placeholder for Sprint 4
- `docs/DATABASE_PLATFORM.md`, `docs/SUPABASE_SETUP.md`
  - `.cursor/rules/` (10 rules)
  - DECISIONS, BACKLOG, TASKS, CODING_GUIDE, AI_GUIDE, templates
  - GitHub issue/PR templates
  - Modern README + workflow docs
- Repository/Service pattern (database-agnostic)
- Env validation, logger, errors, API response format, Zod validation
- `docs/BACKEND_ARCHITECTURE.md`
- `/api/health` endpoint using `@repo/core/response`
- Sprint 1: `@repo/config` shared TypeScript, ESLint, Prettier, constants
- Theme provider with light/dark/system modes
- Global app layout (header, sidebar, footer)
- Reusable components: Button, Card, Dialog, Input, Badge, EmptyState, etc.
- `docs/ARCHITECTURE.md`

## [0.1.0] - 2026-07-19

### Added

- Project initialization — Sprint 0 foundation
