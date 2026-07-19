# Automation Platform

Sprint 7 introduces `@repo/automation` — the execution engine for scheduled jobs, background tasks, and AI workflows.

> **Design principle:** Applications never execute long-running tasks directly. All work goes through the Automation Platform.

---

## Architecture

```
Application
    ↓
Scheduler / ExecutionManager
    ↓
Queue (Memory → Redis → Cloud)
    ↓
JobRunner / PipelineEngine
    ↓
Demo Jobs → (future) MCP / AI / Browser
```

### Package Location

```
packages/automation/src/
├── scheduler/       Cron, once, delayed, recurring (timezone-aware)
├── queue/           MemoryQueue + future Redis/Cloud ports
├── jobs/            JobRegistry, JobRunner, demo jobs
├── pipeline/        PipelineEngine + Naver upload pipeline
├── execution/       ExecutionManager, WorkerPool, TaskDispatcher
├── workers/         Worker pool re-exports
├── retry/           Exponential backoff, linear retry, DLQ interface
├── events/          Job & workflow domain events
├── notifications/   Email, Slack, Discord, Webhook, Push (interfaces)
├── storage/         Job result storage port
├── metrics/         Execution metrics
├── logging/         Structured logs + job history
└── index.ts         createAutomationPlatform()
```

---

## Naver Pipeline (Demo)

Validates the full product flow:

```
filesystem.scan → browser.crawl → image.optimize → content.generate → naver.upload
```

```typescript
import { automation } from '@/lib/automation/platform';

const result = await automation.runNaverPipeline();
// result.success === true, 5 jobs completed
```

---

## Usage

```typescript
// Enqueue background job
await automation.execution.enqueueJob('filesystem.scan', { root: '/data' });

// Run pipeline
await automation.pipeline.execute(myPipeline);

// Schedule recurring job
automation.scheduler.schedule({
  id: 'daily-scan',
  jobId: 'filesystem.scan',
  input: { root: '/products' },
  schedule: { type: 'cron', expression: '0 9 * * *', timezone: 'Asia/Seoul' },
  enabled: true,
});
automation.scheduler.start();
```

---

## Feature Maturity

| Feature | Status | Tier |
|---------|--------|------|
| Scheduler | ✅ Memory | Must Have |
| Memory Queue | ✅ | Must Have |
| Job System | ✅ | Must Have |
| Pipeline Engine | ✅ | Must Have |
| Execution Manager | ✅ | Must Have |
| Retry Engine | ✅ | Must Have |
| Demo Jobs + Naver Pipeline | ✅ | Must Have |
| Redis/BullMQ/Temporal | 🔶 Interface | Future |
| Real browser/image/AI | 🔜 Sprint 8+ | Product |

---

## Related Docs

- [JOB_SYSTEM.md](./JOB_SYSTEM.md)
- [PIPELINE_ENGINE.md](./PIPELINE_ENGINE.md)
- [QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)
- [SCHEDULER.md](./SCHEDULER.md)
