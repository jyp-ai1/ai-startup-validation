# Pipeline Engine

Multi-step job orchestration in `@repo/automation`.

---

## Step Types

| Type | Behavior |
|------|----------|
| `job` | Run single registered job |
| `sequential` | Run steps in order |
| `parallel` | Run steps concurrently |
| `conditional` | Branch on condition |

---

## Naver Product Upload Pipeline

```typescript
import { createNaverUploadPipeline } from '@repo/automation';

const pipeline = createNaverUploadPipeline();
const result = await automation.pipeline.execute(pipeline);
```

Steps:
1. **filesystem.scan** — find product files
2. **browser.crawl** — crawl product URLs (passes scan output)
3. **image.optimize** — optimize images (passes crawl output)
4. **content.generate** — AI content (passes crawl + optimize)
5. **naver.upload** — upload to Smart Store (passes generate + optimize)

---

## Dynamic Input

```typescript
{
  type: 'job',
  jobId: 'browser.crawl',
  input: (ctx) => ctx.variables.scan,  // previous step output
}
```

---

## Features

- Workflow-level timeout
- Per-step retry (via JobRunner)
- Cancellation via `pipeline.cancel(id)`
- Domain events: `pipeline.started`, `pipeline.completed`, `pipeline.failed`

---

## Custom Pipeline

```typescript
const pipeline: PipelineDefinition = {
  id: 'my-workflow',
  name: 'Custom Workflow',
  timeout: 300_000,
  steps: [
    {
      type: 'parallel',
      steps: [
        { type: 'job', jobId: 'filesystem.scan', input: {} },
        { type: 'job', jobId: 'content.generate', input: {} },
      ],
    },
    {
      type: 'conditional',
      condition: (ctx) => ctx.results.get('scan')?.success === true,
      then: [{ type: 'job', jobId: 'naver.upload', input: (ctx) => ctx.variables.generate }],
    },
  ],
};
```
