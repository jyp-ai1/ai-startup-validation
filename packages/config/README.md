# @repo/config

Shared configuration for the AI SaaS Starter Kit monorepo.

## Exports

| Import | Description |
|--------|-------------|
| `@repo/config/tsconfig/base` | Base TypeScript config |
| `@repo/config/tsconfig/nextjs` | Next.js app config |
| `@repo/config/tsconfig/react-library` | React package config |
| `@repo/config/eslint/next` | `createNextEslintConfig(import.meta.url)` |
| `@repo/config/prettier` | Shared Prettier config |
| `@repo/config/constants` | APP_NAME, THEME_MODES, BREAKPOINTS |

## Structure

```
config/
├── tsconfig/
├── eslint/
├── prettier/
└── constants/
```

See [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for usage details.
