# MCP Runtime

Deep dive into `MCPRuntime` — the central orchestrator for tool execution and workflows.

---

## Lifecycle

```
createMCPPlatform()
    ↓
runtime.initialize()
    ↓
registerTool() / default adapters
    ↓
executeTool() / executeWorkflow()
    ↓
runtime.shutdown()
```

---

## MCPRuntime API

| Method | Purpose |
|--------|---------|
| `initialize()` | Start runtime, enable hot registration |
| `registerTool(tool)` | Register tool with full metadata + handler |
| `unregisterTool(id)` | Hot-remove tool |
| `executeTool(id, input, ctx)` | Single tool execution |
| `executeWorkflow(wf, ctx)` | Multi-step workflow |
| `cancelWorkflow(id)` | Cancel running workflow |
| `shutdown()` | Graceful shutdown |
| `getRegistry()` | Access ToolRegistry |

---

## Execution Pipeline

```
1. Gateway.executeTool(toolId, input, context)
2. ToolExecutor.execute()
   a. Registry.get(toolId)
   b. PermissionResolver.requireExecute()
   c. inputSchema.parse(input)
   d. handler(input, context) with timeout
   e. outputSchema.parse(output)
3. MetricsTracker.recordToolCall()
4. MCPLogger.info/error()
5. ToolExecutionResult returned
```

---

## Execution Context

```typescript
type ExecutionContext = {
  userId: string | null;
  sessionId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  traceId: string;        // distributed tracing
  requestId: string;    // per-request ID
  environment: 'development' | 'staging' | 'production' | 'test';
  permissions: string[];  // from @repo/feature-auth
  metadata?: Record<string, unknown>;
};
```

Create context:

```typescript
import { createExecutionContext } from '@repo/mcp';

const ctx = createExecutionContext({
  traceId: crypto.randomUUID(),
  requestId: crypto.randomUUID(),
  userId: user.id,
  organizationId: user.organizationId,
  permissions: ['fs.read', 'browser.navigate'],
  environment: 'production',
});
```

---

## Hot Registration

Tools can be registered/unregistered at runtime without restart:

```typescript
runtime.registerTool({
  id: 'custom.analyze',
  name: 'Analyze',
  // ... full metadata
  handler: async (input, ctx) => { /* ... */ },
});

runtime.unregisterTool('custom.analyze');
```

Default adapters auto-register on runtime creation.

---

## Integration with Auth Platform

Map `@repo/feature-auth` permissions to MCP tool permissions:

```typescript
import { permissionChecker, PERMISSIONS } from '@repo/feature-auth';
import { mcp } from '@/lib/mcp/platform';

const permissions: string[] = [];
if (permissionChecker.canUser(user, PERMISSIONS.PROJECTS_WRITE)) {
  permissions.push('fs.write');
}

const ctx = mcp.gateway.createContext({
  traceId, requestId,
  userId: user.id,
  permissions,
});
```

---

## Error Handling

| Error | When |
|-------|------|
| `ToolNotFoundError` | Tool ID not in registry |
| `PermissionDeniedError` | Missing permission or deny policy |
| `ExecutionError` | Handler failure or timeout |
| `WorkflowTimeoutError` | Workflow exceeded timeout |
| `WorkflowCancelledError` | Workflow cancelled via cancelWorkflow() |

All execution errors return `ToolExecutionResult` with `success: false` — they don't throw unless using `requireExecute`.

---

## Metrics & Logging

Every execution records:

- Tool ID, success/failure, latency, retries
- Structured log entries with traceId, requestId
- Execution history queryable by traceId or toolId

```typescript
mcp.metrics.getSnapshot();
// { totalCalls, successRate, avgLatencyMs, byTool }

mcp.logger.getHistory({ traceId: 'trace-1' });
```
