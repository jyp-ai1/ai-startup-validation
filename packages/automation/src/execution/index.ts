import type { QueueJob, JobPriority } from '../types';
import type { QueuePort } from '../queue';
import type { JobRunner } from '../jobs/runner';
import type { AutomationMetrics } from '../metrics';
import type { AutomationLogger } from '../logging';
import type { EventBus } from '../events';

/** Dispatches queued jobs to workers. */
export class TaskDispatcher {
  constructor(
    private readonly queue: QueuePort,
    private readonly runner: JobRunner,
    private readonly metrics: AutomationMetrics,
    private readonly logger: AutomationLogger,
    private readonly events: EventBus,
  ) {}

  async enqueue(
    jobId: string,
    input: unknown,
    priority: JobPriority = 'normal',
    traceId?: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const job: QueueJob = {
      id,
      jobId,
      input,
      priority,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      traceId: traceId ?? crypto.randomUUID(),
    };
    await this.queue.enqueue(job);
    this.metrics.setQueueLength(await this.queue.size());
    this.events.emitJob({
      id: crypto.randomUUID(),
      type: 'job.enqueued',
      aggregateId: jobId,
      payload: { queueJobId: id },
      timestamp: new Date().toISOString(),
      traceId: job.traceId,
    });
    this.logger.info('job.enqueued', { jobId, queueJobId: id });
    return id;
  }

  async dispatchOne(): Promise<boolean> {
    const job = await this.queue.dequeue();
    if (!job) return false;

    job.attempts++;
    await this.runner.run(job.jobId, job.input, { traceId: job.traceId });
    this.metrics.setQueueLength(await this.queue.size());
    return true;
  }
}

/** Worker pool with configurable concurrency. */
export class WorkerPool {
  private running = false;
  private activeWorkers = 0;

  constructor(
    private readonly dispatcher: TaskDispatcher,
    private readonly concurrency: number = 2,
  ) {}

  async start(pollIntervalMs = 500): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.running) {
      while (this.activeWorkers < this.concurrency) {
        this.activeWorkers++;
        this.dispatcher
          .dispatchOne()
          .catch(() => {})
          .finally(() => {
            this.activeWorkers--;
          });
      }
      await sleep(pollIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ExecutionManagerOptions = {
  queue: QueuePort;
  runner: JobRunner;
  metrics: AutomationMetrics;
  logger: AutomationLogger;
  events: EventBus;
  concurrency?: number;
};

/** Execution manager — orchestrates queue, workers, and job runner. */
export class ExecutionManager {
  readonly dispatcher: TaskDispatcher;
  readonly workerPool: WorkerPool;

  constructor(private readonly options: ExecutionManagerOptions) {
    this.dispatcher = new TaskDispatcher(
      options.queue,
      options.runner,
      options.metrics,
      options.logger,
      options.events,
    );
    this.workerPool = new WorkerPool(this.dispatcher, options.concurrency ?? 2);
  }

  async enqueueJob(
    jobId: string,
    input: unknown,
    priority?: JobPriority,
    traceId?: string,
  ): Promise<string> {
    return this.dispatcher.enqueue(jobId, input, priority, traceId);
  }

  async processOne(): Promise<boolean> {
    return this.dispatcher.dispatchOne();
  }

  startWorkers(): void {
    void this.workerPool.start();
  }

  stopWorkers(): void {
    this.workerPool.stop();
  }
}
