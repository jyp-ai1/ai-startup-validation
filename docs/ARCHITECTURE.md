# Architecture

This document describes the workspace architecture for the AI SaaS Starter Kit — how packages relate, where UI lives, and how to extend the foundation in future sprints.

## Overview

```
cursor-project/                    # pnpm workspace root
├── apps/
│   └── web/                       # Next.js 15 application (App Router)
├── packages/
│   ├── ui/                        # @repo/ui — shared components & design system
│   └── config/                    # @repo/config — shared TS, ESLint, Prettier, constants
├── docs/                          # Product & technical documentation
├── scripts/                       # Automation (future)
├── .github/                       # CI/CD (future)
└── .cursor/                       # Cursor IDE rules (future)
```

**Principle:** Apps consume packages. Packages never import from apps. Shared code flows downward only.

---

## Workspace Architecture

### Package manager

[pnpm workspaces](https://pnpm.io/workspaces) link local packages via `workspace:*` protocol. A single `pnpm install` at the root hoists and links all dependencies.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Path aliases

| Alias | Resolves to | Used in |
|-------|-------------|---------|
| `@repo/ui` | `packages/ui/src/index.ts` | Apps, other packages |
| `@repo/ui/*` | `packages/ui/src/*` | Component-level imports |
| `@repo/config/*` | `packages/config/*` | Apps, packages |
| `@/*` | `apps/web/*` | Web app only |

TypeScript paths are configured in each package's `tsconfig.json`. Next.js additionally uses `transpilePackages: ['@repo/ui']` to compile the UI package.

---

## UI Package (`@repo/ui`)

**Location:** `packages/ui/`

**Purpose:** Single source of truth for UI components, theming, and design tokens. Every app in the monorepo imports from here instead of duplicating components.

### Structure

```
packages/ui/src/
├── components/          # shadcn/ui + custom composites
│   ├── button.tsx       # shadcn primitive
│   ├── card.tsx
│   ├── app-layout.tsx   # App shell (header, sidebar, footer)
│   ├── theme-toggle.tsx
│   ├── page-header.tsx
│   ├── section.tsx
│   ├── empty-state.tsx
│   └── loading-spinner.tsx
├── hooks/
│   └── use-theme.ts     # Re-export from next-themes
├── lib/
│   ├── utils.ts         # cn() helper
│   └── tokens.ts        # Design token definitions
├── providers/
│   └── theme-provider.tsx
├── styles/
│   └── globals.css      # Tailwind v4 + shadcn CSS variables (oklch)
└── index.ts             # Barrel exports
```

### shadcn/ui integration

Components are installed via the shadcn CLI into `packages/ui`, not into individual apps. Configuration lives in `packages/ui/components.json`:

- **Style:** new-york
- **Tailwind v4:** CSS-first via `@theme inline` in `globals.css`
- **Icons:** lucide-react

Apps import the compiled CSS once:

```tsx
import '@repo/ui/globals.css';
```

### Theme system

| Layer | Responsibility |
|-------|----------------|
| `globals.css` | CSS variables for light/dark (oklch colors) |
| `ThemeProvider` | next-themes wrapper (light / dark / system) |
| `ThemeToggle` | Dropdown UI for switching themes |
| `tokens.ts` | TypeScript design token reference |

Dark mode uses the `.dark` class strategy (`@custom-variant dark` in Tailwind v4).

### Adding new components

```bash
cd packages/ui
pnpm dlx shadcn@latest add [component-name]
```

Export new components from `src/index.ts`.

---

## Shared Config (`@repo/config`)

**Location:** `packages/config/`

**Purpose:** DRY configuration across all apps and packages.

### Structure

```
packages/config/
├── tsconfig/
│   ├── base.json            # Strict TypeScript defaults
│   ├── nextjs.json          # Next.js apps (jsx preserve + plugin)
│   └── react-library.json   # React packages (jsx react-jsx)
├── eslint/
│   └── next.mjs             # createNextEslintConfig(import.meta.url)
├── prettier/
│   └── index.mjs            # Shared Prettier + tailwind plugin
└── constants/
    └── index.ts             # APP_NAME, THEME_MODES, BREAKPOINTS
```

### Usage

**TypeScript** — extend in any `tsconfig.json`:

```json
{
  "extends": "@repo/config/tsconfig/nextjs"
}
```

**ESLint** — in each app's `eslint.config.mjs`:

```js
import { createNextEslintConfig } from '@repo/config/eslint/next';
export default createNextEslintConfig(import.meta.url);
```

**Prettier** — root `prettier.config.mjs`:

```js
export { default } from '@repo/config/prettier';
```

**Constants:**

```ts
import { APP_NAME, THEME_MODES } from '@repo/config/constants';
```

---

## Web App (`apps/web`)

The reference application demonstrating the starter kit layout and components.

### Layout architecture

```
RootLayout (Server)
└── ThemeProvider (Client)
    └── AppShell (Client)
        ├── AppHeader + ThemeToggle
        ├── AppSidebar (placeholder nav)
        ├── AppContent → {page}
        └── AppFooter
```

Page content uses `@repo/ui` components directly — no app-local UI duplicates.

---

## Future Expansion Strategy

### Sprint 2 — Backend foundation

```
packages/
├── db/                  # @repo/db — Supabase client, schema, migrations
└── auth/                # @repo/auth — session helpers, middleware utils (optional)
```

Apps import `@repo/db` for data access. Middleware in `apps/web/middleware.ts` handles auth guards.

### Sprint 3+ — Feature packages

```
packages/
├── ai/                  # @repo/ai — LLM providers, streaming, prompts
├── billing/             # @repo/billing — Stripe integration
└── email/               # @repo/email — transactional email
```

Each package follows the same pattern: own `package.json`, exports via `index.ts`, consumed by apps.

### Adding a new app

1. Create `apps/[name]/` with Next.js
2. Add `"@repo/ui": "workspace:*"` and `"@repo/config": "workspace:*"` to dependencies
3. Extend `@repo/config/tsconfig/nextjs`
4. Import `@repo/ui/globals.css` in root layout
5. Add filter script to root `package.json`

### Cursor AI context

Future `.cursor/rules/` files will reference this document and `docs/PRD.md` so agents understand:

- Where to add components (`packages/ui`, not apps)
- Where to add config (`packages/config`)
- Import conventions (`@repo/ui`, `@repo/config/constants`)
- What is out of scope for the current sprint

---

## Dependency Graph

```mermaid
graph TD
  Web[apps/web] --> UI[@repo/ui]
  Web --> Config[@repo/config]
  UI --> Config
  Config --> ESLint[eslint-config-next]
  Config --> Prettier[prettier]
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-19 | Initial architecture — Sprint 1 UI foundation |
