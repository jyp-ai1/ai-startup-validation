# Job System

Reference for `@repo/automation` jobs — definitions, context, runner, registry.

---

## Job Definition

```typescript
type JobDefinition = {
  id: string;              // e.g. 'filesystem.scan'
  name: string;
  version: string;
  description: string;
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  timeout: number;         // ms
  retryable: boolean;
  maxRetries: number;
  tags: string[];
  handler: (input, context) => Promise<output>;
};
```

---

## Job Status

`pending` → `queued` → `running` → `completed` | `failed` | `retrying` | `dead` | `cancelled`

---

## JobContext

```typescript
type JobContext = {
  jobId: string;
  runId: string;
  traceId: string;
  attempt: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt: string;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
};
```

---

## Demo Jobs

| Job ID | Description | Sprint |
|--------|-------------|--------|
| `filesystem.scan` | Scan product directory | 7 (stub) |
| `browser.crawl` | Crawl product pages | 7 (stub) → 8 (Playwright) |
| `image.optimize` | Optimize images | 7 (stub) → 9 (Image) |
| `content.generate` | AI content generation | 7 (stub) → 10 (Content) |
| `naver.upload` | Upload to Smart Store | 7 (stub) → 11 (Naver) |

---

## JobRunner

```typescript
const result = await automation.runner.run('filesystem.scan', { root: '/data' });
// { jobId, runId, status, output, latencyMs, attempt, retries }
```

Features: Zod validation, timeout, retry, metrics, events, structured logging.

---

## JobRegistry

```typescript
automation.jobs.register(myJob);
automation.jobs.listIds();
automation.jobs.get('filesystem.scan');
```

Demo jobs auto-registered via `registerDemoJobs()` on platform creation.
