# Deployment Rule

> **CPO Sign-off:** Sprint P1 — Production QA is the definition of done  
> **Rule:** No UI/UX work until this checklist passes on **Production**.

---

## Definition of done

**"Merge complete" is NOT done.**  
**"Production QA passed" IS done.**

Local and Production must be the **same product** before any UX sprint continues.

---

## Required sequence

Every change that affects user-facing behavior:

```
1. Merge / Commit on main
        ↓
2. Git push origin main
        ↓
3. Vercel Production build — must succeed (not Error)
        ↓
4. GET /api/build-info — commit SHA matches expected HEAD
        ↓
5. Route QA (docs/ROUTE_QA.md matrix — all 307)
        ↓
6. Landing QA — no raw i18n keys on /
        ↓
7. Sign-off recorded in docs/ROUTE_QA.md
        ↓
8. Only then: UI / layout / component work allowed
```

---

## Step 4 — Build info

```bash
curl https://ai-startup-validation-tau.vercel.app/api/build-info
```

| Field | Pass |
|-------|------|
| `data.commit` | Starts with expected git SHA (e.g. `4cd0efc…`) |
| `data.environment` | `production` |

---

## Step 5 — Route QA

PowerShell (no auto-redirect):

```powershell
$req = [System.Net.WebRequest]::Create("https://ai-startup-validation-tau.vercel.app/projects")
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
"$([int]$resp.StatusCode) $($resp.Headers['Location'])"
```

Required: **307** with Location → `/workspace` or `/validation?project=…`

Full matrix: `docs/ROUTE_QA.md`

---

## Step 6 — Landing QA

Production HTML at `/` must **not** contain:

- `landing.testimonials.one.quote`
- Any `landing.*` raw key visible to users

---

## If Vercel build fails

1. Run locally: `pnpm --filter web build`
2. Fix type/lint errors — **no UI changes**
3. Push fix → wait for green deploy
4. Do not promote partial UX work while Production serves an old commit

---

## If Production serves stale commit

Symptoms:

- `/api/build-info` SHA behind `git log -1`
- Redirects in code but **200** on `/projects/*` in Production
- i18n fixed locally but raw keys on Production

Actions:

1. Check Vercel dashboard — latest Production deployment **Ready** (not Error)
2. Redeploy from `main` HEAD or fix build failure
3. Re-run steps 4–7

---

## UI work gate

| Gate | Required |
|------|----------|
| Epic 1 Route QA | ✅ PASS on Production |
| Landing i18n | ✅ PASS on Production |
| CPO sign-off in ROUTE_QA.md | ✅ |

Until all gates pass: **no new pages, routes, layouts, or components.**

---

## Related docs

- `docs/ROUTE_QA.md` — checklist + sign-off table
- `docs/SCREEN_MAP.md` — canonical routes
- `docs/UX_RULES.md` — post-gate UX laws
