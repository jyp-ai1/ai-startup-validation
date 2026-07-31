# LaunchLens Screen Map

> **CPO Sign-off:** 2026-07-29  
> **Rule:** UI changes come *after* this map. Route / IA changes require CPO approval.

## User-facing names vs internal routes

| User sees | Internal route | Notes |
|-----------|----------------|-------|
| Home | `/` | Landing |
| Login | `/auth/login` | Google OAuth |
| **Workspace List** | `/workspace` | Project hub — **single entry after login** |
| Who | `/who` | Persona — new users only |
| Workflow | `/workflow` | AI PM interview — new users only |
| **Project Workspace** | `/validation` | ★ Core product (Overview · Insights · Recommendations · Next Actions) |
| Settings | `/settings` | Account |
| Demo | `/demo/enter` → `/who?demo=1` | No login |

**Do not say "Validation" to users.** `/validation` is the **Project Workspace** — one canvas where Overview, Insights, Recommendations, and Next Actions unfold (not separate pages). Internal names: Review / Evidence / Strategy / Execution — see `WORKSPACE_IA.md` §2.

---

## Approved journey

```
Landing (/)

    ↓

Login (/auth/login)

    ↓

Workspace — Project Hub (/workspace)
    ├── New project → bootstrap
    ├── Existing project → pick & open
    └── Demo → /who?demo=1

    ↓  (new users only)

Who (/who)

    ↓

Workflow (/workflow) — AI PM interview

    ↓

Project Workspace (/validation?project=:id) ★★★★★
    AI PM (first entry)
    └── Overview emerges → Insights → Recommendations → Next Actions
```

---

## Layout IA (Figma — fixed, do not change)

```
┌─────────────┬──────────────────────┐
│ Navigation  │ Main                 │
│  (tree)     │  (current section)   │
│             │                      │
│ Overview ▼  │  Summary             │
│  Summary ✔  │  Action (≤3 scrolls) │
│  Market     │                      │
│  Insights   │                      │
│  Next Act.  │                      │
└─────────────┴──────────────────────┘
```

- **Not** Left | Center | Right (enterprise SaaS).
- **Not** separate pages for Next Actions / Recommendations / Insights — they are sections inside Project Workspace.
- Navigation **expands as AI PM asks questions** (tree grows).

---

## Screen inventory

| Screen | Route | Status | Action |
|--------|-------|--------|--------|
| Landing | `/` | ✅ Active | Keep |
| Login | `/auth/login` | ✅ Active | Keep |
| Workspace List | `/workspace` | ✅ Active | **Only project hub** |
| Who | `/who` | ✅ Active | New users |
| Workflow | `/workflow` | ✅ Active | New users |
| Project Workspace | `/validation` | ✅ Active | Core canvas |
| Settings | `/settings` | ✅ Active | Keep |
| Admin Ops | `/admin/operations` | ✅ Active | Internal |
| About / Terms / Privacy | `/about` … | ✅ Active | Keep |
| **My Projects (dup)** | `/my-projects` | ❌ | Redirect → `/workspace` |
| **Legacy projects tree** | `/projects/*` | ❌ | Redirect → `/validation?project=` or `/workspace` |
| **Global stubs** | `/reports`, `/evidence`, … | ❌ | Redirect → `/workspace` |
| **Execution page** | `/execution` | ❌ | Redirect → `/validation` (section, not page) |
| Dashboard / Decision Center | `/dashboard`, `/decision-center` | 🔀 | Already → `/validation` |
| Goal / Workspaces / Investigate / Conclusion | various | 🔀 | Redirect to canonical routes |

---

## Layout stack

| Layer | File | Wraps |
|-------|------|-------|
| Root | `app/layout.tsx` | Everything |
| Auth | `app/auth/layout.tsx` | `/auth/*` |
| Locale | `app/[locale]/layout.tsx` | All UI |
| Public | `(public)/layout.tsx` | Landing, Who, Workflow, **Project Workspace** |
| Shell | `(shell)/layout.tsx` | Workspace list, Settings (sidebar) |

**Policy:** Project Workspace (`/validation`) uses Public layout (no app shell sidebar) until P0-5 IA layout lands Thursday.

---

## Blocked routes (edge redirects)

- **Middleware:** `apps/web/lib/legacy-route-redirects.ts` (runs first — reliable on Vercel)
- **next.config:** `apps/web/next.config.ts` — duplicate rules for static edge

See `docs/ROUTE_QA.md` for verification checklist.

## Related docs

- `docs/UX_RULES.md` — non-negotiable UX law (Epic 9)
- `docs/WORKSPACE_IA.md` — Navigation + Main IA (Epic 2 Blueprint)
- `docs/WORKSPACE_FLOW.md` — Journeys + AI PM progression (Epic 2 Blueprint)

---

## Sprint schedule (CPO)

| Day | Focus |
|-----|-------|
| Wed | Screen map ✅ · Legacy block · i18n · Single workspace entry |
| Thu | Workspace layout (Nav + Main) · AI PM flow · Loading → Review |
| Fri | Review screen · Action flow · Evidence minimal |
| Sat | Journey QA · Bug fix · Deploy |

**QA unit:** user journey, not individual screens.
