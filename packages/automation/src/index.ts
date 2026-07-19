import { memoryQueue } from './queue';
import { scheduler } from './scheduler';
import { jobRegistry, JobRunner, registerDemoJobs } from './jobs';
import { PipelineEngine, createNaverUploadPipeline } from './pipeline';
import { ExecutionManager } from './execution';
import { retryEngine } from './retry';
import { eventBus } from './events';
import { automationLogger } from './logging';
import { automationMetrics } from './metrics';
import { jobStorage } from './storage';

export type AutomationPlatform = {
  scheduler: typeof scheduler;
  queue: typeof memoryQueue;
  jobs: typeof jobRegistry;
  runner: JobRunner;
  pipeline: PipelineEngine;
  execution: ExecutionManager;
  retry: typeof retryEngine;
  events: typeof eventBus;
  logger: typeof automationLogger;
  metrics: typeof automationMetrics;
  storage: typeof jobStorage;
  runNaverPipeline: (traceId?: string) => ReturnType<PipelineEngine['execute']>;
};

/** Create automation platform with demo jobs registered. */
export function createAutomationPlatform(): AutomationPlatform {
  registerDemoJobs(jobRegistry);

  const runner = new JobRunner({
    registry: jobRegistry,
    retry: retryEngine,
    logger: automationLogger,
    metrics: automationMetrics,
    events: eventBus,
  });

  const pipeline = new PipelineEngine({
    runner,
    events: eventBus,
    logger: automationLogger,
  });

  const execution = new ExecutionManager({
    queue: memoryQueue,
    runner,
    metrics: automationMetrics,
    logger: automationLogger,
    events: eventBus,
    concurrency: 2,
  });

  // Wire scheduler to queue
  scheduler.onJobDue((scheduled) => {
    void execution.enqueueJob(scheduled.jobId, scheduled.input, 'normal');
  });

  return {
    scheduler,
    queue: memoryQueue,
    jobs: jobRegistry,
    runner,
    pipeline,
    execution,
    retry: retryEngine,
    events: eventBus,
    logger: automationLogger,
    metrics: automationMetrics,
    storage: jobStorage,
    runNaverPipeline: (traceId?) =>
      pipeline.execute(createNaverUploadPipeline(), traceId),
  };
}

let defaultPlatform: AutomationPlatform | null = null;

export function getAutomationPlatform(): AutomationPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createAutomationPlatform();
  }
  return defaultPlatform;
}

// Types
export type * from './types';

// Errors
export * from './errors';

// Scheduler
export { Scheduler, scheduler, computeNextRun } from './scheduler';

// Queue
export * from './queue';

// Jobs
export {
  JobRegistry,
  JobRunner,
  jobRegistry,
  registerDemoJobs,
  DEMO_JOBS,
  NAVER_PIPELINE_ID,
  filesystemScanJob,
  browserCrawlJob,
  imageOptimizeJob,
  contentGenerateJob,
  naverUploadJob,
} from './jobs';

// Pipeline
export { PipelineEngine, createNaverUploadPipeline } from './pipeline';

// Execution & Workers
export { ExecutionManager, TaskDispatcher, WorkerPool } from './execution';

// Retry
export { RetryEngine, retryEngine, withRetry, DEFAULT_RETRY_OPTIONS } from './retry';

// Events
export { EventBus, eventBus } from './events';

// Notifications
export * from './notifications';

// Logging & Metrics
export { AutomationLogger, automationLogger } from './logging';
export { AutomationMetrics, automationMetrics } from './metrics';

// Storage
export { InMemoryJobStorage, jobStorage } from './storage';

// Cron
export * from './cron';

// Utils
export * from './utils';
