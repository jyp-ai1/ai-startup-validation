# Authentication & Authorization Platform

Sprint 4 introduces `@repo/feature-auth` — an enterprise-grade **Permission Platform** that separates identity from access control.

> **Design principle:** Supabase handles *Authentication* (who you are). This project owns *Authorization* (what you can do).

---

## Architecture

```
User
  ↓
Authentication          ← Supabase via @repo/db AuthPort
  ↓
Authorization           ← @repo/feature-auth (owned by this project)
  ↓
Permission Engine
  ↓
Application             ← apps/web, future feature modules
```

### Package Location

```
packages/features/auth/          @repo/feature-auth
├── src/
│   ├── application/             SessionService, AuthorizationService
│   ├── domain/                  User, Organization, Workspace, Role, Permission, Session, AuditLog
│   ├── infrastructure/          AuthAdapter, AuditLogger
│   ├── permissions/             Registry, Resolver, Checker, Guard, Provider
│   ├── middleware/              requireLogin, requireRole, requirePermission, requireOrganization
│   ├── hooks/                   useSession, useUser, usePermission, useRole
│   ├── components/              Protected, PermissionGate, RoleGate, SessionProvider
│   ├── types/                   Shared auth types
│   └── index.ts                 createAuthPlatform(), getAuthPlatform()
```

### App Wiring

Apps never import `@supabase/supabase-js` for auth. Use platform entry points:

```typescript
// apps/web/lib/auth/platform.ts
import { auth, can, PERMISSIONS } from '@/lib/auth/platform';

// Check permission (preferred)
if (can(user, PERMISSIONS.PROJECTS_WRITE)) { ... }

// Full platform access
const session = await auth.sessionService.getSession();
```

---

## Authentication vs Authorization

| Concern | Owner | Responsibility |
|---------|-------|----------------|
| **Authentication** | Supabase (`@repo/db` AuthPort) | Login, logout, JWT, OAuth, password reset |
| **Authorization** | `@repo/feature-auth` | Roles, permissions, RBAC, guards, audit |

Authentication answers: *Who is this user?*  
Authorization answers: *What can this user do in this organization?*

These layers are intentionally decoupled. Changing RBAC mappings does not require Supabase configuration changes.

---

## Permission Engine

The permission engine is the core of Sprint 4. Application code must use it instead of raw role checks.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `PermissionRegistry` | `permissions/registry.ts` | Register and validate permission identifiers |
| `PermissionResolver` | `permissions/resolver.ts` | Resolve effective permissions from role + context |
| `PermissionChecker` | `permissions/checker.ts` | `can()`, `canAny()`, `canAll()`, `canUser()` |
| `PermissionGuard` | `permissions/guard.ts` | Throw on denied access (server-side) |
| `PermissionContext` | `permissions/context.ts` | `{ userId, role, organizationId }` |
| `PermissionProvider` | `permissions/provider.tsx` | React context for client-side checks |

### Usage Pattern

```typescript
// ✅ Preferred — permission-based
import { permissionChecker, PERMISSIONS } from '@repo/feature-auth';

permissionChecker.canUser(user, PERMISSIONS.PROJECTS_WRITE);

// ❌ Avoid — role string comparison
if (user.role === 'admin') { ... }
```

### Permission Flow

```
1. User authenticated (Supabase session)
2. Domain user enriched with role + organizationId
3. PermissionContext created { userId, role, organizationId }
4. PermissionResolver looks up ROLE_PERMISSION_MAP
5. PermissionChecker.can(context, permission) → boolean
6. PermissionGuard throws ForbiddenError if denied (middleware)
7. AuditLogger records auth.permission_denied events
```

---

## RBAC

Role-Based Access Control maps roles to permissions via `ROLE_PERMISSION_MAP` in `permissions/rbac.ts`.

**Roles:** `super_admin`, `admin`, `manager`, `editor`, `member`, `guest`

**Permissions:** `users.read/write`, `projects.read/write`, `organizations.read/write`, `settings.read/write`, `analytics.read`, `billing.read/write`

See [RBAC.md](./RBAC.md) for full role and permission matrices.

To customize permissions for a tenant without code changes, override `ROLE_PERMISSION_MAP` at runtime or load from database (future Sprint).

---

## Organization Model

Current: **Single Organization** per user (`AuthDomainUser.organizationId`).

Future: **Multi-Organization** — user belongs to multiple orgs with per-org roles. The `PermissionContext.organizationId` field is already prepared for this.

```typescript
createPermissionContext({
  userId: user.id,
  role: user.role,
  organizationId: user.organizationId,  // switchable per request in multi-tenant
});
```

---

## Middleware

Server-side guards for API routes and Server Actions:

| Middleware | Purpose |
|------------|---------|
| `requireLogin(session)` | Ensure authenticated session |
| `requireRole(user, minimumRole)` | Role priority check |
| `requirePermission(user, permission)` | Primary authorization gate |
| `requireOrganization(user, orgId?)` | Organization membership |

```typescript
import { requirePermission } from '@repo/feature-auth';
import { PERMISSIONS } from '@repo/feature-auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  await requirePermission(user, PERMISSIONS.PROJECTS_WRITE);
  // ...
}
```

---

## React Integration

### SessionProvider + Hooks

```tsx
import { SessionProvider, usePermission, useRole } from '@repo/feature-auth';
import { PERMISSIONS } from '@repo/feature-auth';

function App({ session, user, children }) {
  return (
    <SessionProvider session={session} user={user}>
      {children}
    </SessionProvider>
  );
}

function ProjectActions() {
  const { can } = usePermission();
  return can(PERMISSIONS.PROJECTS_WRITE) ? <CreateButton /> : null;
}
```

### Gate Components

```tsx
<Protected fallback={<LoginPrompt />}>
  <Dashboard />
</Protected>

<PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
  <BillingPanel />
</PermissionGate>

<RoleGate minimumRole="manager">
  <TeamSettings />
</RoleGate>
```

---

## Audit

Security-sensitive events are logged via `AuditLogger`:

| Event Type | Trigger |
|------------|---------|
| `auth.login` | Successful authentication |
| `auth.logout` | Session termination |
| `auth.session_refresh` | Token refresh |
| `auth.permission_denied` | Failed permission check |

Current implementation: in-memory buffer + structured logger output.  
Production: persist to database via AuditRepository (future Sprint).

---

## Platform Factory

```typescript
import { createAuthPlatform, getAuthPlatform } from '@repo/feature-auth';

const platform = getAuthPlatform();
// platform.sessionService     — session lifecycle via AuthPort
// platform.authorizationService — permission orchestration
// platform.authPort           — Supabase AuthPort from @repo/db
// platform.auditLogger        — security event logging
// platform.permissions        — registry, resolver, checker
```

---

## What Sprint 4 Does NOT Include

Per design scope, the following are intentionally excluded:

- Login page / sign-up UI
- Dashboard or business features
- User profile CRUD screens
- Supabase RLS policy configuration

These belong to future sprints or product-specific feature modules.

---

## Future: Multi-Tenant

```
User
  ↓
OrganizationMembership[]     ← multiple orgs, per-org role
  ↓
PermissionContext            ← organizationId scoped per request
  ↓
PermissionResolver           ← tenant-specific ROLE_PERMISSION_MAP override
```

Planned enhancements:

- Organization switcher in session context
- Database-backed role/permission overrides per tenant
- Supabase RLS aligned with permission model
- Audit persistence via `@repo/db`

See [SECURITY_MODEL.md](./SECURITY_MODEL.md) for threat model and security boundaries.
