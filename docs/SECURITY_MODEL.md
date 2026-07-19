# Security Model

Security architecture for the AI SaaS Starter Kit — Sprint 4 Authentication & Authorization Platform.

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Client                                       │
│  SessionProvider · PermissionGate (UI hints only)       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  apps/web (Next.js)                                     │
│  Middleware: requireLogin · requirePermission           │
│  lib/auth/platform.ts · lib/db/platform.ts              │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ @repo/       │ │ @repo/       │ │ @repo/feature-auth   │
│ feature-auth │ │ db           │ │ Authorization        │
│ (Authz)      │ │ (Authn port) │ │ Permission Engine    │
└──────────────┘ └──────┬───────┘ └──────────────────────┘
                        │
                        ▼
               ┌────────────────┐
               │ Supabase       │
               │ Auth · Postgres│
               └────────────────┘
```

---

## Trust Model

| Layer | Trust Level | Enforcement |
|-------|-------------|-------------|
| Client UI gates | Untrusted | UX only — never sole security control |
| Server middleware | Trusted | Primary authorization enforcement |
| Permission Engine | Trusted | Central RBAC logic |
| Supabase Auth | Trusted | Identity verification |
| Supabase RLS | Trusted (future) | Row-level data isolation |

**Rule:** All authorization decisions that protect data or actions MUST be enforced server-side via `requirePermission()` or equivalent.

---

## Authentication Security

Owned by Supabase via `@repo/db` AuthPort:

- JWT-based sessions with automatic refresh
- OAuth providers (configurable in Supabase dashboard)
- Password policies managed by Supabase Auth settings
- Session tokens never exposed to client-side permission logic directly

Apps access auth only through:

```typescript
const authPort = db.resolve(DbTokens.AuthPort);
const session = await authPort.getSession();
```

---

## Authorization Security

Owned by `@repo/feature-auth`:

### Permission-First Design

Roles are implementation details. Permissions are the security primitive exposed to application code.

```typescript
await requirePermission(user, PERMISSIONS.BILLING_WRITE);
```

This prevents privilege escalation when role names or mappings change.

### Fail-Closed

- Missing session → `UnauthorizedError`
- Missing permission → `ForbiddenError` + audit log
- Missing organization context → `ForbiddenError`

### Audit Trail

Denied permission attempts are logged:

```typescript
auditLogger.logAuthEvent('auth.permission_denied', user.id, {
  permission,
  role: user.role,
});
```

---

## Organization Isolation

**Current (Sprint 4):** Single organization per user.

```typescript
AuthDomainUser.organizationId  // scopes permission context
```

**Future (Multi-Tenant):**

- User may belong to multiple organizations
- Active organization selected per request/session
- `requireOrganization(user, orgId)` validates membership
- Database RLS policies enforce row isolation by `organization_id`

---

## Data Access Rules

| Rule | Status |
|------|--------|
| No Supabase SDK in apps | ✅ Enforced |
| No Supabase SDK in feature modules | ✅ Enforced |
| Repository pattern for all DB access | ✅ Sprint 3 |
| Permission checks on mutating operations | ✅ Sprint 4 (middleware ready) |
| RLS policies in Supabase | 🔜 Future sprint |
| Audit log persistence | 🔜 Future sprint |

---

## Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Client-side permission bypass | Server middleware enforces all gates |
| Role escalation via API | Permission-based checks, not role strings |
| Cross-tenant data access | `organizationId` in PermissionContext; RLS planned |
| Session hijacking | Supabase JWT + HTTPS; httpOnly cookies (app config) |
| Privilege confusion | Centralized `ROLE_PERMISSION_MAP` |
| Missing audit trail | `AuditLogger` on denied permissions |

---

## Environment & Secrets

| Variable | Package | Exposure |
|----------|---------|----------|
| `SUPABASE_URL` | `@repo/db` | Server + client (public URL) |
| `SUPABASE_ANON_KEY` | `@repo/db` | Client-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | `@repo/db` | Server only — never client |
| `OPENAI_API_KEY` | Future `@repo/ai` | Server only |

See [SECURITY.md](./SECURITY.md) for general security practices.

---

## Recommended Server Pattern

```typescript
// 1. Resolve session (authentication)
const session = await auth.sessionService.requireSession();

// 2. Load domain user with role (from UserRepository)
const user = await userRepo.findById(session.userId);

// 3. Enforce permission (authorization)
await requirePermission(user, PERMISSIONS.PROJECTS_WRITE);

// 4. Scope to organization
await requireOrganization(user, project.organizationId);

// 5. Execute business logic
return projectService.update(projectId, input);
```

---

## Future Security Enhancements

- [ ] Supabase RLS policies aligned with `PERMISSIONS` constants
- [ ] Audit log persistence to `audit_events` table
- [ ] Rate limiting on auth endpoints
- [ ] IP allowlisting for admin roles
- [ ] MFA enforcement for privileged roles
- [ ] Permission override API for enterprise tenants
- [ ] Security headers middleware in Next.js
