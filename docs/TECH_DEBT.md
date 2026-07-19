# Technical Debt — Sprint 5

Tracked technical debt after Sprint 5. Review at each sprint retrospective.

---

## High Priority

| ID | Item | Impact | Effort | Target Sprint |
|----|------|--------|--------|---------------|
| TD-001 | No test runner at monorepo root | AI tests only run via filter | Low | 5.1 |
| TD-002 | Audit logger in-memory only (auth) | Security events lost on restart | Medium | 5 |
| TD-003 | No Supabase RLS policies | Row-level isolation not enforced | High | 5 |
| TD-014 | Stub AI adapters only | No real LLM responses | High | 5.1 |
| TD-015 | No real SDK adapters (OpenAI, etc.) | Platform untested with live APIs | High | 5.1 |

---

## Medium Priority

| ID | Item | Impact | Effort | Target Sprint |
|----|------|--------|--------|---------------|
| TD-004 | AuthDomainUser not auto-enriched from DB | Manual mapping required | Medium | 5 |
| TD-005 | SessionProvider not wired in app layout | Hooks unusable until login sprint | Low | Login sprint |
| TD-008 | CI workflow not configured | No automated lint/build/test on PR | Medium | Backlog |
| TD-016 | RAG/Memory interfaces only | No vector DB or conversation persistence | Medium | 6+ |
| TD-017 | Observability in-memory only | Metrics lost on restart | Medium | 6 |
| TD-018 | Token pricing manually maintained | Stale pricing data | Low | 6 |

---

## Low Priority

| ID | Item | Impact | Effort | Target Sprint |
|----|------|--------|--------|---------------|
| TD-010 | Role priority vs permission overlap | Two authorization primitives | Low | Refactor when needed |
| TD-019 | generateObject schema validation basic | JSON.parse only, no Zod validation | Low | 6 |
| TD-020 | Rate limiter not wired to ChatService | Optional middleware not integrated | Low | 6 |

---

| TD-021 | Adapter stubs only — no real MCP/Playwright | Automation blocked | High | Sprint 7 |
| TD-022 | Transport interfaces only | No remote MCP connection | Medium | Sprint 7 |

---

| TD-023 | Demo jobs are stubs | High | Sprint 8–11 |
| TD-024 | Remote URL image download not implemented | Medium | Sprint 11 |
| TD-025 | Persistent browser context / login session | Medium | Sprint 11 |

---

## Resolved in Sprint 8

| ID | Item | Resolution |
|----|------|------------|
| TD-S8-001 | `browser.crawl` stub only | Real Playwright in `@repo/browser` |
| TD-S8-002 | No browser platform package | Created `@repo/browser` |
| TD-S8-003 | Playwright not isolated | Playwright only in `@repo/browser` |
| TD-021 (partial) | Adapter stubs — no Playwright | Browser adapter implemented |

---

## Resolved in Sprint 7

| ID | Item | Resolution |
|----|------|------------|
| TD-S7-001 | No automation platform | Created `@repo/automation` |
| TD-S7-002 | No job scheduling | Scheduler + queue implemented |
| TD-S7-003 | No Naver flow validation | Demo pipeline E2E test passes |

---

## Resolved in Sprint 6

| ID | Item | Resolution |
|----|------|------------|
| TD-S6-001 | No `@repo/mcp` package | Created MCP Runtime Platform |
| TD-S6-002 | No workflow engine | WorkflowEngine implemented |
| TD-S6-003 | Tools without metadata | ToolMetadata with Zod required |

---

## Resolved in Sprint 5

| ID | Item | Resolution |
|----|------|------------|
| TD-S5-001 | No `@repo/ai` package | Created full AI platform |
| TD-S5-002 | No test runner for packages | Vitest added to `@repo/ai` |
| TD-S5-003 | Provider adapter import paths broken | Fixed adapters/index.ts paths |
| TD-S5-004 | ProviderRegistry lazy init missing | get() auto-creates from factory |

---

## Resolved in Sprint 4

| ID | Item | Resolution |
|----|------|------------|
| TD-S4-001 | `packages/features/*` missing from pnpm workspace | Added to `pnpm-workspace.yaml` |
| TD-S4-002 | JSX in `.ts` files | Renamed to `.tsx` |
| TD-S4-003 | Broken PermissionProviderState type | Fixed |
| TD-S4-004 | Private field access in AuthorizationService | Use public resolver |

---

## Debt Metrics

| Sprint | Items Added | Items Resolved | Open |
|--------|-------------|----------------|------|
| 4 | 13 | 4 | 12 |
| 5 | 7 | 4 | 15 |

*Review cadence: end of each sprint.*
