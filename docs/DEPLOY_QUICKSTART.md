# Deploy Guide — AI Startup Validation Framework

## jyp-ai1 Vercel Project

Dashboard: https://vercel.com/jyp-ai1s-projects/ai-startup-validation

### One-shot deploy (Cursor terminal)

```powershell
# Must be logged in as detourdada1 (NOT kiraranim-jyp)
vercel logout
vercel login

cd "C:\Users\김성길\Documents\GitHub\cursor-project\apps\web"
vercel link --yes --scope jyp-ai1s-projects --project ai-startup-validation
vercel --prod --yes
```

Or run: `powershell -ExecutionPolicy Bypass -File scripts/deploy-jyp-ai1.ps1`

### Vercel Build Settings (Dashboard → Settings → General)

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `cd ../.. && pnpm --filter web build` |
| Node.js | 20.x |

### Environment Variables

```
NEXT_PUBLIC_APP_URL=https://ai-startup-validation.vercel.app
```

(Get exact URL from Settings → Domains after first deploy)

---

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

### Verify URLs (production — latest deploy)

```
https://ai-startup-validation-psi.vercel.app/dashboard
https://ai-startup-validation-truck-grease-reservation.vercel.app/dashboard
```

> **Note:** `https://ai-startup-validation.vercel.app` is currently owned by a **different Vercel project** (old demo app). To reclaim it, log in as **jyp-ai1** and delete/reassign that domain in the Vercel dashboard.

Legacy target (blocked until domain reclaimed):

```
https://ai-startup-validation.vercel.app/dashboard

---

## Account (important)

| Service | Correct account |
|---------|-----------------|
| GitHub repo | `jyp-ai1` |
| Vercel team | `jyp-ai1s-projects` |
| Production URL | `https://ai-startup-validation.vercel.app` |

**Wrong (do not use):** `kiraranim-jyp` / `truck-grease-reservation`

After `vercel login`, confirm:

```powershell
vercel whoami
vercel teams ls
# Must include jyp-ai1s-projects
```

If you see `detourdada-9608` or `truck-grease-reservation` only, logout and login with the **jyp-ai1 Vercel** account.

## Current Blocker

PC CLI must be on **jyp-ai1s-projects**. Run:

```powershell
vercel logout
vercel login
# → Browser → jyp-ai1 Vercel account (NOT kiraranim-jyp, NOT detourdada personal)

cd "C:\Users\김성길\Documents\GitHub\cursor-project"
vercel link --yes --scope jyp-ai1s-projects --project ai-startup-validation
vercel project update ai-startup-validation --install-command "pnpm install" --build-command "pnpm --filter web build" --output-directory apps/web/.next
vercel project protection disable ai-startup-validation --sso
vercel --prod --yes
```
