# Backlog

Future work not yet scheduled into a sprint. Prioritized top-to-bottom.

## Priority: High

| ID | Item | Target Sprint | Notes |
|----|------|---------------|-------|
| B-001 | `@repo/db` Supabase adapter | Sprint 3 | Implements `BaseRepository` |
| B-002 | Auth middleware + session | Sprint 4 | RBAC user/admin |
| B-003 | Protected routes | Sprint 4 | Middleware-based |
| B-004 | Database migrations | Sprint 3 | Supabase migrations |
| B-005 | Seed data scripts | Sprint 3 | Dev/staging seeds |

## Priority: Medium

| ID | Item | Target Sprint | Notes |
|----|------|---------------|-------|
| B-010 | `@repo/ai` adapter pattern | Sprint 5 | OpenAI, Claude, Gemini |
| B-011 | Streaming AI responses | Sprint 5 | Server-sent events |
| B-012 | Admin dashboard shell | Sprint 4 | Uses `@repo/ui` layout |
| B-013 | GitHub Actions CI | Sprint 3+ | lint, build, test |
| B-014 | Rate limiting on API routes | Sprint 3 | Upstash or similar |

## Priority: Low

| ID | Item | Target Sprint | Notes |
|----|------|---------------|-------|
| B-020 | MCP server integrations | Sprint 6 | Browser, GitHub, Slack |
| B-021 | Stripe billing adapter | Future | `@repo/billing` |
| B-022 | Email transactional adapter | Future | `@repo/email` |
| B-023 | i18n support | Future | `@repo/i18n` |
| B-024 | E2E tests with Playwright | Future | CI integration |

## Icebox

Ideas not yet validated:

- Multi-tenant architecture
- Real-time collaboration (Supabase realtime)
- Mobile app (React Native) consuming same packages
- Self-hosted deployment guide (Docker)

## How to Use

1. PM adds items here during planning.
2. When scheduled, move to `TASKS.md` with sprint number.
3. When done, remove or mark complete; reference in `RELEASES.md`.
