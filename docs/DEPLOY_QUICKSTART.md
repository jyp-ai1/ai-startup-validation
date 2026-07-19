# Deploy Guide — AI Startup Validation Framework

## Quick Deploy (copy-paste in Cursor terminal)

### Step 1: GitHub login (jyp-ai1)

```powershell
gh auth login
# → GitHub.com → HTTPS → Browser → jyp-ai1 계정
```

### Step 2: Push to jyp-ai1

```powershell
cd "C:\Users\김성길\Documents\GitHub\cursor-project"
git remote set-url origin https://github.com/jyp-ai1/ai-startup-validation.git
git push -u origin main
```

### Step 3: Vercel login (jyp-ai1)

```powershell
vercel login
# → Browser → jyp-ai1 Vercel 계정
```

### Step 4: Production deploy

```powershell
cd apps/web
vercel link --yes --project ai-startup-validation
vercel --prod --yes
```

### Step 5: Auto-deploy on push (Git connect)

Vercel Dashboard → ai-startup-validation → Settings → Git → Connect Repository
→ jyp-ai1/ai-startup-validation 선택 → Production Branch: main

---

## Vercel Build Settings

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `cd ../.. && pnpm --filter web build` |
| Node.js | 20.x |

---

## Environment Variables (Vercel Dashboard)

Sprint 0 (required):

```
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-URL.vercel.app
```

Sprint 1+ Supabase (optional now):

```
NEXT_PUBLIC_SUPABASE_URL=https://fecwbzyuktkzrbqqxtid.supabase.co
SUPABASE_URL=https://fecwbzyuktkzrbqqxtid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase API settings>
SUPABASE_ANON_KEY=<same as above>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — never expose to client>
```

> Supabase Dashboard → Settings → API → `anon` / `service_role` (JWT eyJ... format)

---

## Verify URLs

```
https://YOUR-URL.vercel.app/dashboard
https://YOUR-URL.vercel.app/projects
https://YOUR-URL.vercel.app/settings
```

---

## Current Blocker

PC CLI is logged in as `kiraranim-jyp`, not `jyp-ai1`.
Run Step 1 + Step 3 above to switch accounts.

Temporary deploy (kiraranim-jyp account):
https://ai-startup-validation-truck-grease-reservation.vercel.app
