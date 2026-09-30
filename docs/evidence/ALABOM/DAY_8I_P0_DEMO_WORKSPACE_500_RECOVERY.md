# ALABOM — P0 Demo Workspace 500 Recovery

**Date:** 2026-09-30

Production SHA (before fix): `5babecb7ef2fe5fafda5ede2fe5197a593a1605e`

## Observed

- `/demo/start` → custom document → `/workspace?demo=guided&sample=custom&fresh=1` → **HTTP 500 UI**
- Local server log: `TypeError: fetch failed` at `StartupProjectRepository.findAll`
- Trigger: `listDemoProjects()` in workspace demo branch when `projectId` unset

## Root Cause

**E** (code regression / resilience gap) + **A** (Supabase fetch failure in environment)

`listDemoProjects` catch block retried `findAll()`; both attempts threw → uncaught → workspace RSC 500.

Fresh guided demo (`fresh=1`) does not require DB project id (client uses `demo-session`).

## Failure Path

```text
/workspace/page.tsx (showDemoWorkspace, !projectId)
  → listDemoProjects()
    → repo.findAll({ is_demo: true })  // fetch failed
    → repo.findAll()                    // fetch failed again
  → throw → 500
```

## Code Change

- `listDemoProjects`: second catch returns `[]`
- `workspace/page.tsx`: `explicitDemoSession` skips DB lookup, `projectId = 'demo'`

Commit: `458195a` (fix) · `fc4d290` (main merge)

## Tests

- `lib/project/__tests__/list-demo-projects.test.ts` — 2 pass
- `pnpm build` (web) — PASS
- Local smoke port **3202**: demo workspace **no 500**, AI PM surface visible

## Production Smoke

| When | SHA | Demo workspace |
|------|-----|----------------|
| Pre-fix | `5babecb` | **FAIL** (500 UI) |
| Post-merge deploy | `fc4d290` | **Pending** Vercel (still `5babecb` @ 12:37 UTC poll) |

## CPO Decision

**RECOVERED (code)** — Production deploy + smoke **pending**
