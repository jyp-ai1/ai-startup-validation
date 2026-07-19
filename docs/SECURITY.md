# Security

Security practices for the AI SaaS Starter Kit.

---

## Reporting Vulnerabilities

Do **not** open public issues for security vulnerabilities. Contact maintainers directly (configure email in production fork).

---

## Environment Variables

| Variable | Exposure | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_*` | Client bundle | Never put secrets here |
| `DATABASE_URL` | Server only | Required when DB connected |
| `SUPABASE_*` | Server only | Anon key is public-facing in Supabase model — still server-side in our stack |
| `OPENAI_API_KEY` | Server only | AI routes only |

- Copy `.env.example` → `.env.local` (gitignored)
- Validate via `@repo/core/env`
- Never commit `.env*` files

---

## Input Validation

All API input must pass through Zod schemas:

```typescript
import { parseRequest, z } from '@repo/core/validation';

const schema = z.object({ email: z.string().email() });
const data = parseRequest(schema, await request.json());
```

---

## Authentication (Sprint 4+)

Planned:

- Session-based auth via adapter layer
- RBAC: `user` | `admin` roles
- Middleware for protected routes
- No auth logic in React components — use server session checks

---

## Dependencies

- Run `pnpm audit` periodically
- Pin major versions in production deploys
- Review new dependencies for bundle size and maintenance

---

## API Routes

- Return generic errors in production (`handleUnknownError`)
- Never expose stack traces to clients
- Log errors server-side with `@repo/core/logger` (no PII in logs)

---

## Related

- `.cursor/rules/security.mdc`
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
