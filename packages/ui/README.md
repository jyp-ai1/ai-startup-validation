# @repo/ui

Shared UI components and design system for the AI SaaS Starter Kit.

## Usage

```tsx
import { Button, Card, ThemeProvider } from '@repo/ui';
import '@repo/ui/globals.css';
```

## Adding shadcn components

```bash
cd packages/ui
pnpm dlx shadcn@latest add [component-name]
```

Export new components from `src/index.ts`.

## Structure

```
src/
├── components/     # shadcn/ui + custom composites
├── hooks/          # useTheme, etc.
├── lib/            # utils, design tokens
├── providers/      # ThemeProvider
├── styles/         # globals.css (Tailwind v4 + shadcn tokens)
└── index.ts        # Barrel exports
```
