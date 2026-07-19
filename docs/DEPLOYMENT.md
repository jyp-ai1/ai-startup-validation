# Deployment

Deployment guide for the AI SaaS Starter Kit. Primary target: Vercel.

---

## Prerequisites

- Production env vars configured (see `.env.example`)
- `pnpm build` passes locally
- Domain configured (optional)

---

## Vercel (Recommended)

1. Connect GitHub repository
2. Set root directory: `apps/web` (or monorepo with Turborepo — future)
3. Build command: `cd ../.. && pnpm install && pnpm build`
4. Output: Next.js default

### Environment Variables

Set in Vercel dashboard:

```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=...          # when Sprint 3 connected
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...        # when Sprint 5 connected
```

---

## Monorepo Notes

- `outputFileTracingRoot` configured in `apps/web/next.config.ts`
- `transpilePackages: ['@repo/ui', '@repo/core']`
- Install from repo root for workspace resolution

---

## Other Platforms

| Platform | Notes |
|----------|-------|
| Docker | Future — `scripts/docker/` |
| Railway / Render | Set build from root, start `apps/web` |
| Self-hosted | Node 20+, `pnpm build && pnpm start` |

---

## Pre-Deploy Checklist

- [ ] `pnpm lint && pnpm build` pass
- [ ] Env vars set in platform
- [ ] `NEXT_PUBLIC_APP_URL` matches production URL
- [ ] No `SKIP_ENV_VALIDATION` in production
- [ ] Security review for new API routes

---

## Related

- [SECURITY.md](./SECURITY.md)
- [RELEASES.md](./RELEASES.md)
