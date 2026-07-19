# Project Structure

Every folder in the AI SaaS Starter Kit monorepo explained.

---

## Root

```
cursor-project/
├── apps/                 # Deployable applications
├── packages/             # Shared libraries
├── docs/                 # Project documentation (source of truth)
├── scripts/              # Automation scripts (future)
├── .github/              # GitHub templates & CI (future)
├── .cursor/              # Cursor IDE rules for AI
├── .env.example          # Env var template (never commit .env.local)
├── package.json          # Root scripts & workspace config
├── pnpm-workspace.yaml   # Workspace definition
├── CHANGELOG.md          # User-facing change log
└── LICENSE               # MIT
```

---

## `apps/`

Deployable applications. Each app is a standalone Next.js (or future) project.

```
apps/
├── README.md
└── web/                          # Main SaaS application
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout + ThemeProvider
    │   ├── page.tsx              # Home / demo page
    │   └── api/                  # API route handlers
    │       └── health/route.ts   # Health check (uses @repo/core)
    ├── components/               # App-specific components only
    │   └── app-shell.tsx         # Wires @repo/ui layout for this app
    ├── public/                   # Static assets
    ├── components.json           # shadcn CLI config (points to @repo/ui)
    ├── next.config.ts            # Monorepo transpilePackages
    ├── tsconfig.json             # Extends @repo/config/tsconfig/nextjs
    └── package.json
```

**Rule:** No reusable UI here — use `@repo/ui`. No database SDK — use `@repo/db` (Sprint 3).

---

## `packages/`

Shared libraries consumed by apps. Never import from apps.

```
packages/
├── ui/           @repo/ui      — Components, theme, design tokens
├── config/       @repo/config  — ESLint, TS, Prettier, constants
├── core/         @repo/core    — Env, logger, errors, validation, patterns
├── types/        @repo/types   — Shared TypeScript types
├── utils/        @repo/utils   — Pure utility functions
└── db/           @repo/db       — (Sprint 3) Database adapters
```

### `@repo/ui`

```
packages/ui/src/
├── components/       # shadcn + custom (Button, AppLayout, ThemeToggle…)
├── hooks/            # useTheme
├── lib/              # cn(), design tokens
├── providers/        # ThemeProvider
├── styles/           # globals.css (Tailwind v4 + shadcn tokens)
└── index.ts          # Barrel exports
```

### `@repo/core`

```
packages/core/src/
├── env/              # @t3-oss/env-nextjs validation
├── logger/           # Structured logger
├── errors/           # BaseError hierarchy
├── response/         # ApiResponse helpers
├── validation/       # parseRequest, parseResponse (Zod)
├── repository/       # BaseRepository interface (no impl)
└── service/          # BaseService abstract class
```

### `@repo/types`

Domain and API types: `User`, `Role`, `ApiResponse`, `Pagination`, etc.

### `@repo/utils`

Pure functions: date, string, array, debounce, sleep, etc. No framework deps.

### `@repo/config`

Shared configs exported for apps/packages to extend.

---

## `docs/`

| File | Purpose |
|------|---------|
| `PRD.md` | Product requirements |
| `ROADMAP.md` | Sprint timeline |
| `TASKS.md` | Current sprint tasks |
| `BACKLOG.md` | Future work queue |
| `DECISIONS.md` | Architecture Decision Records |
| `RELEASES.md` | Version history |
| `ARCHITECTURE.md` | Frontend/workspace architecture |
| `BACKEND_ARCHITECTURE.md` | Backend layers & adapter pattern |
| `PROJECT_STRUCTURE.md` | This file |
| `DEVELOPMENT_WORKFLOW.md` | Feature → release flow |
| `AI_GUIDE.md` | AI collaboration guide |
| `AI_WORKFLOW.md` | Tool-specific workflows |
| `CODING_GUIDE.md` | Code conventions |
| `CONTRIBUTING.md` | Contributor onboarding |
| `SECURITY.md` | Security practices |
| `TESTING.md` | Test strategy |
| `DEPLOYMENT.md` | Deploy guide |
| `API.md` | API documentation |
| `DB.md` | Database schema (scaffold) |
| `templates/` | Document templates |

---

## `.cursor/`

```
.cursor/
├── README.md           # Index of rules
└── rules/
    ├── architecture.mdc
    ├── coding-style.mdc
    ├── documentation.mdc
    ├── folder-structure.mdc
    ├── git-workflow.mdc
    ├── naming.mdc
    ├── pm-workflow.mdc
    ├── review-checklist.mdc
    ├── security.mdc
    └── testing.mdc
```

Cursor loads these automatically to guide AI behavior.

---

## `.github/`

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   └── question.md
└── PULL_REQUEST_TEMPLATE.md
```

CI workflows planned in BACKLOG B-013.

---

## `scripts/`

Placeholder for automation: deploy, seed, codegen. Empty until needed.

---

## Dependency Flow

```
apps/web
  ├── @repo/ui
  ├── @repo/core ──→ @repo/types
  ├── @repo/types
  ├── @repo/utils
  └── @repo/config

packages/ui ──→ @repo/config
packages/core ──→ @repo/types
packages/db (future) ──→ @repo/core, @repo/types
```

Apps sit at the top. Adapters sit at the bottom. Business logic in the middle.
