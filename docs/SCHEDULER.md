# Scheduler

Job scheduling in `@repo/automation`.

---

## Schedule Types

| Type | Example | Use Case |
|------|---------|----------|
| `cron` | `{ type: 'cron', expression: '0 9 * * *', timezone: 'Asia/Seoul' }` | Daily at 9am KST |
| `once` | `{ type: 'once', runAt: '2026-07-20T09:00:00Z' }` | One-time run |
| `delayed` | `{ type: 'delayed', delayMs: 60000 }` | Run after 1 minute |
| `recurring` | `{ type: 'recurring', intervalMs: 3600000 }` | Every hour |

---

## Usage

```typescript
// Schedule daily product scan
automation.scheduler.schedule({
  id: 'daily-product-scan',
  jobId: 'filesystem.scan',
  input: { root: '/data/products' },
  schedule: {
    type: 'cron',
    expression: '0 6 * * *',
    timezone: 'Asia/Seoul',
  },
  enabled: true,
});

// Wire scheduler to queue
automation.scheduler.onJobDue((scheduled) => {
  void automation.execution.enqueueJob(scheduled.jobId, scheduled.input);
});

automation.scheduler.start(1000);  // tick every 1s
```

---

## API

| Method | Purpose |
|--------|---------|
| `schedule(job)` | Add scheduled job |
| `unschedule(id)` | Remove |
| `list()` | All schedules |
| `listDue()` | Jobs ready to run |
| `markRun(id)` | Update lastRun, compute nextRun |
| `start(intervalMs)` | Begin ticking |
| `stop()` | Stop scheduler |

---

## Timezone Support

Cron schedules accept `timezone` (e.g. `Asia/Seoul`, `UTC`). Validated via `Intl.DateTimeFormat`.

---

## Integration with Naver Pipeline

Schedule full pipeline as recurring job (future):

```typescript
automation.scheduler.schedule({
  id: 'weekly-naver-upload',
  jobId: '__pipeline__:naver-product-upload',  // future: pipeline as schedulable unit
  input: {},
  schedule: { type: 'cron', expression: '0 3 * * 1', timezone: 'Asia/Seoul' },
  enabled: true,
});
```

Currently: enqueue individual jobs or call `runNaverPipeline()` from cron handler.
