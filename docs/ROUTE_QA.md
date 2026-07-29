# Route QA Checklist

> **Sprint P1 Epic 1 — Task 1**  
> **Pass rule:** User must never see legacy Workspace UI.

## How to verify

```powershell
$req = [System.Net.WebRequest]::Create("https://ai-startup-validation-tau.vercel.app/PATH")
$req.AllowAutoRedirect = $false
$resp = $req.GetResponse()
# Expect 307/308 and Location header
```

Or: DevTools → Network → disable cache → check status + Location.

## Redirect matrix

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

## Language keys (Landing)

- [ ] `/` does **not** show raw keys like `landing.testimonials.one.quote`
- Fix: single `landing.testimonials` block in `packages/i18n/src/messages/*.json` (commit `8b07ddb+`)

## Production commit

Check deploy includes middleware redirects:

```
GET /api/build-info → data.commit
```

Must include middleware legacy redirect commit after Sprint P1 Epic 1.

## Sign-off

| Check | Owner | Date | PASS |
|-------|-------|------|------|
| Legacy `/projects/*` blocked | CTO | | |
| Single hub `/workspace` | CTO | | |
| Landing i18n | CTO | | |
| CPO journey test | PM | | |
