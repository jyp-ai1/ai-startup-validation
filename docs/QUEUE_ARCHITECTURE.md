# Queue Architecture

Queue design for `@repo/automation` — interface-first, memory default.

---

## Queue Port

```typescript
interface QueuePort {
  kind: 'memory' | 'redis' | 'cloud';
  enqueue(job: QueueJob): Promise<void>;
  dequeue(): Promise<QueueJob | undefined>;
  peek(): Promise<QueueJob | undefined>;
  size(): Promise<number>;
  clear(): Promise<void>;
}
```

---

## Priority

Jobs dequeued by priority: `critical` → `high` → `normal` → `low`

---

## Implementations

| Kind | Status | Use Case |
|------|--------|----------|
| Memory | ✅ Sprint 7 | Dev, tests |
| Redis | 🔶 Interface | Production single-node |
| Cloud | 🔶 Interface | AWS SQS, GCP Tasks |

---

## Future Adapters

- **Redis** — lightweight production queue
- **BullMQ** — Redis-backed with UI
- **Temporal** — durable workflows
- **Cloud Tasks** — serverless
- **GitHub Actions** — CI-triggered jobs

---

## Dead Letter Queue

```typescript
interface DeadLetterQueuePort {
  push(job, error): Promise<void>;
  list(): Promise<DeadJob[]>;
  requeue(jobId): Promise<boolean>;
}
```

In-memory implementation included. Failed jobs after max retries → DLQ (future wiring).

---

## Execution Flow

```
enqueueJob() → MemoryQueue → TaskDispatcher → JobRunner → result
                    ↑
              WorkerPool (concurrency: 2)
```

```typescript
await automation.execution.enqueueJob('filesystem.scan', { root: '/data' }, 'high');
await automation.execution.processOne();  // manual dispatch
automation.execution.startWorkers();       // background workers
```
