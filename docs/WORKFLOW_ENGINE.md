# Workflow Engine

Guide to `@repo/mcp` WorkflowEngine — orchestrating multi-step tool execution.

---

## Workflow Definition

```typescript
type WorkflowDefinition = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  timeout?: number;       // ms, default 60_000
  retry?: { maxAttempts: number; delayMs: number };
};
```

---

## Step Types

### Sequential

Execute steps in order:

```typescript
{
  type: 'sequential',
  steps: [
    { type: 'tool', toolId: 'filesystem.read_file', input: { path: '/config.json' } },
    { type: 'tool', toolId: 'filesystem.write_file', input: { path: '/output.json' } },
  ],
}
```

### Parallel

Execute steps concurrently:

```typescript
{
  type: 'parallel',
  steps: [
    { type: 'tool', toolId: 'github.list_prs', input: {} },
    { type: 'tool', toolId: 'slack.send_message', input: { channel: '#dev' } },
  ],
}
```

### Conditional

Branch based on context:

```typescript
{
  type: 'conditional',
  condition: (ctx) => ctx.results.has('step-1') && ctx.results.get('step-1')!.success,
  then: [{ type: 'tool', toolId: 'playwright.screenshot', input: {} }],
  else: [{ type: 'tool', toolId: 'slack.send_message', input: { text: 'Failed' } }],
}
```

### Tool Step

Single tool invocation:

```typescript
{ type: 'tool', toolId: 'playwright.navigate', input: { url: 'https://example.com' }, id: 'nav-step' }
```

---

## Workflow Result

```typescript
type WorkflowResult = {
  workflowId: string;
  success: boolean;
  results: ToolExecutionResult[];
  latencyMs: number;
  error?: string;
  cancelled: boolean;
};
```

---

## Features

| Feature | Support |
|---------|---------|
| Sequential execution | ✅ |
| Parallel execution | ✅ |
| Conditional branching | ✅ |
| Retry (per tool step) | ✅ |
| Timeout (workflow-level) | ✅ |
| Cancellation | ✅ via `cancelWorkflow(id)` |

---

## Example: Browser Automation Workflow

```typescript
const result = await mcp.gateway.executeWorkflow(
  {
    id: 'naver-product-check',
    name: 'Check Naver Store Product',
    timeout: 120_000,
    steps: [
      {
        type: 'sequential',
        steps: [
          { type: 'tool', toolId: 'playwright.navigate', input: { url: 'https://smartstore.naver.com' } },
          { type: 'tool', toolId: 'playwright.click', input: { selector: '.product-item' } },
          { type: 'tool', toolId: 'playwright.screenshot', input: { path: '/tmp/product.png' } },
        ],
      },
    ],
  },
  context,
);
```

*Note: Playwright tools are stubs in Sprint 6. Real implementation in Sprint 7.*

---

## Cancellation

```typescript
// Start workflow (async)
const promise = mcp.gateway.executeWorkflow(workflow, context);

// Cancel from another request
mcp.gateway.cancelWorkflow(workflow.id);

const result = await promise;
// result.cancelled === true
```

---

## Workflow Context

Available in conditional steps:

```typescript
type WorkflowContext = {
  execution: ExecutionContext;
  results: Map<string, ToolExecutionResult>;  // step id → result
  variables: Record<string, unknown>;          // shared state
  cancelled: boolean;
};
```

---

## Best Practices

1. Set explicit `timeout` for long-running automation workflows
2. Use `id` on tool steps to reference results in conditionals
3. Keep workflows composable — small sequential blocks in parallel
4. Map auth permissions before creating execution context
5. Log `traceId` across workflow steps for debugging
