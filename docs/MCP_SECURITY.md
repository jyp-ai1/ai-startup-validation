# MCP Security

Security model for `@repo/mcp` — permissions, policies, and execution boundaries.

---

## Security Layers

```
Application
    ↓
MCPGateway (single entry)
    ↓
PermissionResolver (allow/deny policies)
    ↓
ToolExecutor (input/output validation)
    ↓
Tool Handler (isolated execution)
```

---

## Permission Model

Every tool declares required permissions:

```typescript
permissions: ['fs.read']  // on filesystem.read_file
```

Execution context must include all required permissions:

```typescript
const ctx = mcp.gateway.createContext({
  traceId, requestId,
  permissions: ['fs.read'],  // must include tool.permissions
});
```

Missing permission → `PermissionDeniedError` → `success: false` result.

---

## Policy Engine

```typescript
import { permissionResolver } from '@repo/mcp';

// Deny policy — block shell in production
permissionResolver.addPolicy({
  id: 'deny-shell-prod',
  effect: 'deny',
  permissions: ['shell.execute'],
  categories: ['shell'],
});

// Allow policy — restrict admin tools
permissionResolver.addPolicy({
  id: 'admin-only-billing',
  effect: 'allow',
  permissions: ['admin'],
  toolIds: ['billing.process'],
});
```

Evaluation order:
1. Explicit **deny** policies
2. Explicit **allow** policies (if any exist)
3. Tool-level permission check

---

## Input/Output Validation

All tool input/output validated via Zod schemas:

```typescript
inputSchema: z.object({ path: z.string().max(4096) }),
outputSchema: z.object({ content: z.string() }),
```

Invalid input → execution fails before handler runs.

---

## Timeout Protection

Every tool has a `timeout` (ms). Exceeding timeout → `ExecutionError`.

Default adapter stubs: 30,000ms. Override per tool.

Workflow-level timeout separate from tool timeout.

---

## Trust Boundaries

| Layer | Trust | Enforcement |
|-------|-------|-------------|
| Client UI | Untrusted | Never execute tools client-side |
| MCPGateway | Trusted | Single server entry point |
| PermissionResolver | Trusted | Server-side only |
| Tool handlers | Sandboxed | Timeout + schema validation |
| MCP servers (future) | Semi-trusted | Transport auth TBD |

**Rule:** All tool execution MUST go through `MCPGateway` on the server.

---

## Integration with Auth Platform

```typescript
import { can, PERMISSIONS } from '@/lib/auth/platform';
import { mcp } from '@/lib/mcp/platform';

function buildMCPPermissions(user: AuthDomainUser): string[] {
  const perms: string[] = [];
  if (can(user, PERMISSIONS.PROJECTS_READ)) perms.push('fs.read');
  if (can(user, PERMISSIONS.PROJECTS_WRITE)) perms.push('fs.write');
  if (can(user, PERMISSIONS.SETTINGS_WRITE)) perms.push('shell.execute');
  return perms;
}
```

Never pass raw role strings — derive MCP permissions from `@repo/feature-auth`.

---

## Audit Trail

Execution logged via MCPLogger:

```typescript
mcp.logger.getHistory({ traceId: 'trace-1', toolId: 'shell.execute' });
```

Future: persist to `@repo/db` audit table.

---

## Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Unauthorized tool execution | PermissionResolver + context permissions |
| Privilege escalation | Policy deny rules, no role string checks |
| Malicious input | Zod inputSchema validation |
| Runaway execution | Per-tool + workflow timeouts |
| Shell injection | Shell adapter stub — real impl needs sandbox (Sprint 7) |
| Cross-tenant access | organizationId in ExecutionContext |

---

## Future Enhancements

- [ ] Tool execution sandbox (VM/container for shell/browser)
- [ ] Rate limiting per user/org
- [ ] MCP server transport authentication (TLS, API keys)
- [ ] Audit persistence to database
- [ ] Tool permission sync with Supabase RLS
