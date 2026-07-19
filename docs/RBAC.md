# RBAC — Role-Based Access Control

Reference for roles, permissions, and access matrices in `@repo/feature-auth`.

---

## Principles

1. **Never compare role strings in application code.** Use `PermissionChecker.canUser(user, permission)`.
2. **Roles are labels; permissions are capabilities.** Changing a role's permissions updates access without touching app logic.
3. **RBAC mapping is centralized** in `packages/features/auth/src/permissions/rbac.ts`.

---

## Roles

| Role | ID | Priority | Description |
|------|----|----------|-------------|
| Super Admin | `super_admin` | 100 | Full platform access across all organizations |
| Admin | `admin` | 80 | Full access within an organization |
| Manager | `manager` | 60 | Manage teams, projects, and members |
| Editor | `editor` | 40 | Create and edit content |
| Member | `member` | 20 | Standard member access |
| Guest | `guest` | 10 | Read-only limited access |

Role priority enables `hasRolePriority(userRole, minimumRole)` and `requireRole()` middleware.

---

## Permissions

| Permission | Label | Category |
|------------|-------|----------|
| `users.read` | Read Users | users |
| `users.write` | Write Users | users |
| `projects.read` | Read Projects | projects |
| `projects.write` | Write Projects | projects |
| `organizations.read` | Read Organizations | organizations |
| `organizations.write` | Write Organizations | organizations |
| `settings.read` | Read Settings | settings |
| `settings.write` | Write Settings | settings |
| `analytics.read` | Read Analytics | analytics |
| `billing.read` | Read Billing | billing |
| `billing.write` | Write Billing | billing |

Constants are exported as `PERMISSIONS` from `@repo/feature-auth`:

```typescript
import { PERMISSIONS } from '@repo/feature-auth';

PERMISSIONS.PROJECTS_WRITE  // 'projects.write'
```

---

## Role Matrix

✅ = granted · — = denied

| Permission | super_admin | admin | manager | editor | member | guest |
|------------|:-----------:|:-----:|:-------:|:------:|:------:|:-----:|
| users.read | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| users.write | ✅ | ✅ | ✅ | — | — | — |
| projects.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| projects.write | ✅ | ✅ | ✅ | ✅ | — | — |
| organizations.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| organizations.write | ✅ | ✅ | — | — | — | — |
| settings.read | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| settings.write | ✅ | ✅ | — | — | — | — |
| analytics.read | ✅ | ✅ | ✅ | — | — | — |
| billing.read | ✅ | ✅ | — | — | — | — |
| billing.write | ✅ | ✅ | — | — | — | — |

---

## Permission Matrix (by Category)

### Users

| Action | Required Permission |
|--------|---------------------|
| View user list | `users.read` |
| Invite / edit users | `users.write` |
| Deactivate users | `users.write` |

### Projects

| Action | Required Permission |
|--------|---------------------|
| View projects | `projects.read` |
| Create / edit projects | `projects.write` |
| Delete projects | `projects.write` |

### Organizations

| Action | Required Permission |
|--------|---------------------|
| View org details | `organizations.read` |
| Edit org settings | `organizations.write` |

### Settings

| Action | Required Permission |
|--------|---------------------|
| View app settings | `settings.read` |
| Modify app settings | `settings.write` |

### Analytics & Billing

| Action | Required Permission |
|--------|---------------------|
| View dashboards | `analytics.read` |
| View invoices | `billing.read` |
| Manage subscriptions | `billing.write` |

---

## Examples

### Server Action

```typescript
import { requirePermission, PERMISSIONS } from '@repo/feature-auth';

export async function createProject(input: CreateProjectInput) {
  const user = await getCurrentUser();
  await requirePermission(user, PERMISSIONS.PROJECTS_WRITE);
  return projectService.create(input);
}
```

### API Route Guard

```typescript
import { permissionChecker, PERMISSIONS } from '@/lib/auth/platform';

export async function GET() {
  const user = await getCurrentUser();
  if (!permissionChecker.canUser(user, PERMISSIONS.ANALYTICS_READ)) {
    return forbidden('Insufficient permissions');
  }
  return ok(analyticsService.getSummary());
}
```

### React Conditional UI

```tsx
import { PermissionGate, PERMISSIONS } from '@repo/feature-auth';

<PermissionGate permission={PERMISSIONS.USERS_WRITE} fallback={<ReadOnlyBadge />}>
  <InviteUserButton />
</PermissionGate>
```

### Multiple Permissions (any)

```typescript
import { requireAnyPermission, PERMISSIONS } from '@repo/feature-auth';

await requireAnyPermission(user, [
  PERMISSIONS.PROJECTS_WRITE,
  PERMISSIONS.ORGANIZATIONS_WRITE,
]);
```

### Role Priority Check

```typescript
import { requireRole } from '@repo/feature-auth';

// Throws if user role priority < manager
await requireRole(user, 'manager');
```

---

## Customizing RBAC

### Static Override (development)

Edit `ROLE_PERMISSION_MAP` in `packages/features/auth/src/permissions/rbac.ts`:

```typescript
export const ROLE_PERMISSION_MAP: Record<AuthRole, Permission[]> = {
  editor: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.USERS_READ,  // grant additional permission
  ],
  // ...
};
```

### Dynamic Override (future — multi-tenant)

Load tenant-specific mappings from database:

```
Organization → CustomRoleMapping → Permission[]
```

Application code remains unchanged — only `PermissionResolver` source changes.

---

## Anti-Patterns

```typescript
// ❌ Raw role comparison
if (user.role === 'admin') { showBilling(); }

// ❌ Hardcoded permission string
if (permissions.includes('projects.write')) { ... }

// ✅ Use constants and checker
if (permissionChecker.canUser(user, PERMISSIONS.PROJECTS_WRITE)) { ... }
```
