# Features

Domain feature modules — built on top of infrastructure packages.

## Modules

| Module | Package | Sprint | Status | Description |
|--------|---------|--------|--------|-------------|
| `auth/` | `@repo/feature-auth` | 4 | ✅ Complete | Permission Platform — RBAC, guards, audit |
| `users/` | — | TBD | Planned | User profile CRUD via UserService |
| `organizations/` | — | TBD | Planned | Workspace / multi-tenant |
| `projects/` | — | TBD | Planned | Project management |

## Architecture

```
apps/web
    ↓
packages/features/*   ← domain authorization & feature wiring
    ↓
packages/db           ← repository interfaces (ports)
    ↓
adapters/supabase
```

Features depend on `@repo/db` ports and `@repo/core` services — never Supabase SDK directly.

## Auth Platform (`@repo/feature-auth`)

Sprint 4 delivers a **Permission Platform**, not a login UI.

```
Authentication (Supabase)  →  @repo/db AuthPort
Authorization (owned)      →  @repo/feature-auth
```

### Usage

```typescript
// App entry
import { auth, can, PERMISSIONS } from '@/lib/auth/platform';

// Permission check (preferred)
if (can(user, PERMISSIONS.PROJECTS_WRITE)) { ... }

// Server middleware
await requirePermission(user, PERMISSIONS.BILLING_WRITE);
```

### Structure

```
packages/features/auth/src/
├── application/      SessionService, AuthorizationService
├── domain/           Role, Permission, Session, AuditLog
├── permissions/      Permission Engine + RBAC
├── middleware/       requireLogin, requirePermission, ...
├── hooks/            useSession, usePermission, ...
├── components/       Protected, PermissionGate, RoleGate
└── index.ts          createAuthPlatform()
```

Documentation: [docs/AUTH_PLATFORM.md](../../docs/AUTH_PLATFORM.md) · [docs/RBAC.md](../../docs/RBAC.md)

## Adding a New Feature Module

1. Create `packages/features/<name>/` with `package.json` name `@repo/feature-<name>`
2. Add to `pnpm-workspace.yaml` if not covered by `packages/features/*`
3. Depend on `@repo/db`, `@repo/core`, `@repo/types` — not Supabase SDK
4. Export platform factory pattern consistent with auth/db
5. Wire app entry at `apps/web/lib/<name>/platform.ts`
