# Route QA Checklist

> **Sprint P1 Epic 1 — Task 1**  
> **Last run:** 2026-07-29 (Production)  
> **Sign-off:** ❌ **NOT APPROVED** — deploy + verification pending

---

## Production snapshot (2026-07-29)

| Check | Result |
|-------|--------|
| Deploy commit | `458f384` (expected `9c3653a+` with middleware) |
| `/dashboard` | ✅ 307 → `/validation` |
| `/projects/*` | ❌ **200** (legacy UI still reachable) |
| `/my-projects` | ❌ **200** |
| `/execution` | ❌ **200** |
| `/goal`, `/reports` | ❌ **200** |
| Landing i18n | ❌ Raw keys `landing.testimonials.one.quote` visible |

**Blocker:** Vercel Production has not picked up commits `8b07ddb` (i18n) or `9c3653a` (middleware redirects).

**CTO action:** Confirm Vercel deploy pipeline / manual redeploy from `main` HEAD.

---

## Redirect matrix (required PASS)

| Path | Expected | Destination |
|------|----------|-------------|
| `/projects` | 307 | `/workspace` |
| `/projects/:id` | 307 | `/validation?project=:id` |
| `/projects/:id/*` | 307 | `/validation?project=:id` |
| `/my-projects` | 307 | `/workspace` |
| `/my-projects/:id` | 307 | `/validation?project=:id` |
| `/my-projects/:id/interview` | 307 | `/validation?project=:id` |
| `/dashboard` | 307 | `/validation` |
| `/decision-center` | 307 | `/validation` |
| `/goal` | 307 | `/who` |
| `/workspaces` | 307 | `/workspace` |
| `/execution` | 307 | `/validation` |
| `/reports`, `/evidence`, … | 307 | `/workspace` |

---

## Language keys (Landing)

- [ ] `/` must NOT contain `landing.testimonials.one.quote`
- Fix in `packages/i18n` — duplicate `landing.testimonials` removed in `8b07ddb`

---

## Old Workspace check

After redirect PASS:

- [ ] Direct URL `/projects/{any-id}` never renders legacy project shell HTML
- [ ] PM journey: login → workspace → validation only

---

## Verification command (PowerShell)

```powershell
$req = [System.Net.WebRequest]::Create("https://ai-startup-validation-tau.vercel.app/projects")
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
"$([int]$resp.StatusCode) $($resp.Headers['Location'])"
```

Expect: `307 /validation?project=...` or `307 /workspace`

---

## Sign-off

| Role | Epic 1 | Date |
|------|--------|------|
| CTO — redirects | ⏳ | |
| CTO — i18n | ⏳ | |
| PM — journey | ⏳ | |
| CPO | ⏳ | |

**Epic 1 complete when:** All matrix rows 307 + Landing i18n PASS + CPO confirms no old Workspace.
