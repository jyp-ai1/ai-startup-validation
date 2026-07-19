# MCP Platform

Sprint 6 introduces `@repo/mcp` — a **provider-agnostic MCP Runtime Platform** for AI Agent tool execution.

> **Design principle:** Applications communicate only with `MCPGateway`. They never depend on specific MCP servers or tool implementations.

---

## Architecture

```
Application
    ↓
Workflow
    ↓
MCP Runtime
    ↓
Tool Registry
    ↓
Permission Layer
    ↓
MCP Client
    ↓
Server (future)
```

### Package Location

```
packages/mcp/src/
├── runtime/         MCPRuntime — initialize, register, execute, shutdown
├── registry/        ToolRegistry with full ToolMetadata
├── gateway/         MCPGateway — single app entry point
├── workflow/        WorkflowEngine — sequential, parallel, conditional
├── execution/       ToolExecutor — validation, timeout, permissions
├── permissions/     PermissionResolver, policies (allow/deny)
├── context/         ExecutionContext (user, session, trace, org)
├── discovery/       Server, Tool, Capability discovery
├── transport/       STDIO, HTTP, WebSocket, SSE (interfaces)
├── adapters/        Filesystem, Playwright, GitHub, etc. (stubs)
├── client/          MCPClient port
├── server/          MCPServer port
├── logging/         Structured logs + execution history
├── metrics/         Tool calls, latency, failures, retries
└── index.ts         createMCPPlatform()
```

---

## Tool Metadata (Required)

Every tool must include full metadata:

```typescript
interface ToolMetadata {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  permissions: string[];
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  timeout: number;
  retryable: boolean;
  cacheable: boolean;
  tags: string[];
  capabilities: string[];
}
```

This drives: auto-documentation, tool search, AI recommendations, permission checks, execution policy.

---

## Usage

```typescript
import { mcp } from '@/lib/mcp/platform';

// Execute tool via gateway
const result = await mcp.gateway.executeTool(
  'filesystem.read_file',
  { path: '/tmp/test.txt' },
  mcp.gateway.createContext({
    traceId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    permissions: ['fs.read'],
  }),
);

// Execute workflow
const workflow = await mcp.gateway.executeWorkflow(
  {
    id: 'read-and-list',
    name: 'Read and List',
    steps: [
      { type: 'tool', toolId: 'filesystem.read_file', input: {} },
      { type: 'tool', toolId: 'filesystem.list_directory', input: {} },
    ],
  },
  context,
);

// Discover tools
const tools = mcp.gateway.searchTools('playwright');
const docs = mcp.gateway.getToolDocumentation();
```

---

## Default Adapter Stubs

Sprint 6 registers stub tools (no real implementations):

| Adapter | Tools |
|---------|-------|
| filesystem | read_file, write_file, list_directory |
| playwright | navigate, click, screenshot |
| github | create_issue, list_prs |
| slack | send_message |
| discord | send_message |
| google-drive | upload_file, list_files |
| notion | create_page, query_database |
| sequential-thinking | think |
| browser | open_url |
| shell | execute |

Real implementations → Sprint 7 Automation Platform.

---

## Future-Ready Design

- Remote MCP servers
- Local MCP servers (STDIO)
- Multiple concurrent servers
- Hot tool registration / unregistration
- Dynamic tool loading from adapters

---

## Related Documentation

- [MCP_RUNTIME.md](./MCP_RUNTIME.md) — Runtime lifecycle
- [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) — Workflow patterns
- [TOOL_REGISTRY.md](./TOOL_REGISTRY.md) — Registry and metadata
- [MCP_SECURITY.md](./MCP_SECURITY.md) — Permissions and policies

See also: [AI_PLATFORM.md](./AI_PLATFORM.md) for LLM integration patterns.
