# Deploy Smoke Test — Beta v0.9 RC

**Prod:** https://ai-startup-validation-tau.vercel.app  
**Project:** https://vercel.com/jyp-ai1s-projects/ai-startup-validation  
**Deploy from:** repo root (`vercel --prod --yes`) — **not** `apps/web` (Root Directory already `apps/web`, doubles path)

## Pre-deploy

```powershell
cd "C:\Users\김성길\Documents\GitHub\cursor-project"
pnpm --filter web lint
pnpm --filter web build
git push origin main
vercel --prod --yes
```

## Smoke checklist (manual or script)

| # | URL / check | Expected |
|---|-------------|----------|
| 1 | `GET /api/health` | 200, `"status":"ok"` |
| 2 | `GET /api/ai/health` | 200, provider info |
| 3 | `GET /` | 200, landing |
| 4 | `GET /auth/login?next=/dashboard` | 200, Google sign-in button |
| 5 | `GET /demo/enter` | 302 → `/dashboard?demo=1` |
| 6 | `GET /dashboard?demo=1` | 200, demo workspace |
| 7 | `GET /ko/about` | 200 |

## Quick script

```powershell
node .tmp/smoke-prod.mjs
```

## PM manual (post-deploy)

- [ ] Google OAuth full flow (`docs/templates/OAUTH_QA_CHECKLIST.md`)
- [ ] Lighthouse PageSpeed Insights (Landing/Dashboard/Project) — Perf ≥90 gate
- [ ] Set Vercel env: `NEXT_PUBLIC_FEEDBACK_BUG_URL`, `NEXT_PUBLIC_FEEDBACK_IDEA_URL`

## Latest RC deploy

| Field | Value |
|-------|-------|
| Commit | `7bc5fe9` |
| Deployment | `dpl_C8EnHdmqsPSyDrcXDRbSYcSNWzSt` |
| Hotfix | Auth login 500 (LocaleSwitcher + barrel import + LoginPanel) |
