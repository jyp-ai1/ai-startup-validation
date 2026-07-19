# Test Coverage — Sprint 8

| Metric | Value |
|--------|-------|
| `@repo/browser` tests | 1 |
| `@repo/automation` tests | 9 |
| `@repo/mcp` tests | 16 |
| `@repo/ai` tests | 20 |
| **Total** | **46** |

---

## `@repo/browser`

| Module | Tests |
|--------|-------|
| playwright/crawler | 1 (integration — real Chromium, local fixture) |

Run: `pnpm --filter @repo/browser install:browsers` (first time)  
Run: `pnpm --filter @repo/browser test`

---

## `@repo/automation`

| Module | Tests |
|--------|-------|
| queue/memory-queue | 2 |
| scheduler | 3 |
| jobs/runner | 2 |
| pipeline (Naver E2E) | 2 |

Run: `pnpm --filter @repo/automation test`

*Last updated: Sprint 8 — 2026-07-19*
