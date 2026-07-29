# Route QA Checklist

> **Sprint P1 Epic 1 — Task 1**  
> **Last run:** 2026-07-29 (Production)  
> **Sign-off:** ✅ **APPROVED** — Epic 1 complete

---

## Production snapshot (2026-07-29 — recovery)

| Check | Result |
|-------|--------|
| Deploy commit | ✅ **`8dfdef4`** (`fix(build): restore aiPmKpis.byCategory type`) |
| Root cause of stall | Vercel Production builds **Error** since `bf24789` (TypeScript) — served stale `458f384` |
| `/projects/:id` | ✅ 307 → `/validation?project=:id` |
| `/projects` | ✅ 307 → `/workspace` |
| `/my-projects` | ✅ 307 → `/workspace` |
| `/execution` | ✅ 307 → `/validation` |
| `/dashboard` | ✅ 307 → `/validation` |
| `/goal` | ✅ 307 → `/who` |
| `/reports` | ✅ 307 → `/workspace` |
| Landing i18n | ✅ **PASS** — no `landing.testimonials.one.quote` |

**Note:** Expected SHA was `4cd0efc`; production runs **`8dfdef4`** (= `4cd0efc` + build fix). All route/i18n fixes included.

---

## Redirect matrix

| Path | Expected | Production 2026-07-29 |
|------|----------|------------------------|
| `/projects` | 307 → `/workspace` | ✅ |
| `/projects/:id` | 307 → `/validation?project=:id` | ✅ |
| `/projects/:id/*` | 307 → `/validation?project=:id` | ✅ |
| `/my-projects` | 307 → `/workspace` | ✅ |
| `/my-projects/:id` | 307 → `/validation?project=:id` | ✅ |
| `/my-projects/:id/interview` | 307 → `/validation?project=:id` | ✅ |
| `/dashboard` | 307 → `/validation` | ✅ |
| `/decision-center` | 307 → `/validation` | ✅ |
| `/goal` | 307 → `/who` | ✅ |
| `/workspaces` | 307 → `/workspace` | ✅ |
| `/execution` | 307 → `/validation` | ✅ |
| `/reports`, `/evidence`, … | 307 → `/workspace` | ✅ |

---

## Language keys (Landing)

- [x] `/` does **not** contain `landing.testimonials.one.quote`
- Fix: duplicate `landing.testimonials` removed in `8b07ddb`

---

## Old Workspace check

- [x] `/projects/{id}` returns **307**, not legacy shell HTML
- [x] User cannot reach old ProjectWorkspaceHome via direct URL

---

## Verification command (PowerShell)

```powershell
$req = [System.Net.WebRequest]::Create("https://ai-startup-validation-tau.vercel.app/projects")
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
"$([int]$resp.StatusCode) $($resp.Headers['Location'])"
# Expect: 307 /workspace
```

---

## Sign-off

| Role | Epic 1 | Date |
|------|--------|------|
| CTO — build deploy | ✅ `8dfdef4` | 2026-07-29 |
| CTO — redirects | ✅ All 307 | 2026-07-29 |
| CTO — i18n | ✅ PASS | 2026-07-29 |
| PM — journey | ⏳ | |
| CPO | ⏳ | |

**Epic 1 gate:** Production QA passed. UI work may proceed per `docs/DEPLOYMENT_RULE.md`.

---

## Related

- `docs/DEPLOYMENT_RULE.md` — mandatory deploy sequence
- `docs/SCREEN_MAP.md` — canonical routes
