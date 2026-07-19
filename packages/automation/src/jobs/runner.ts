import type { JobDefinition, JobResult, JobContext, JobStatus } from '../types';
import { JobNotFoundError, JobTimeoutError } from '../errors';
import type { RetryEngine } from '../retry';
import type { AutomationLogger } from '../logging';
import type { AutomationMetrics } from '../metrics';
import type { EventBus } from '../events';

export class JobRegistry {
  private readonly jobs = new Map<string, JobDefinition>();

  register<TInput, TOutput>(job: JobDefinition<TInput, TOutput>): void {
    this.jobs.set(job.id, job as JobDefinition);
  }

  unregister(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  get(jobId: string): JobDefinition {
    const job = this.jobs.get(jobId);
    if (!job) throw new JobNotFoundError(jobId);
    return job;
  }

  has(jobId: string): boolean {
    return this.jobs.has(jobId);
  }

  list(): JobDefinition[] {
    return [...this.jobs.values()];
  }

  listIds(): string[] {
    return [...this.jobs.keys()];
  }
}

export type JobRunnerOptions = {
  registry: JobRegistry;
  retry: RetryEngine;
  logger: AutomationLogger;
  metrics: AutomationMetrics;
  events: EventBus;
};

/** Execute a registered job with validation, timeout, retry, and metrics. */
export class JobRunner {
  constructor(private readonly options: JobRunnerOptions) {}

  async run(
    jobId: string,
    input: unknown,
    partial?: Partial<Pick<JobContext, 'traceId' | 'metadata'>>,
  ): Promise<JobResult> {
    const job = this.options.registry.get(jobId);
    const runId = crypto.randomUUID();
    const traceId = partial?.traceId ?? crypto.randomUUID();
    const start = Date.now();
    let attempt = 0;
    let lastError: string | undefined;

    this.options.events.emitJob({
      id: crypto.randomUUID(),
      type: 'job.started',
      aggregateId: jobId,
      payload: { runId, traceId },
      timestamp: new Date().toISOString(),
      traceId,
    });

    const maxAttempts = job.maxRetries + 1;

    while (attempt < maxAttempts) {
      attempt++;
      const abortController = new AbortController();

      const context: JobContext = {
        jobId,
        runId,
        traceId,
        attempt,
        maxRetries: job.maxRetries,
        scheduledAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        metadata: partial?.metadata ?? {},
        signal: abortController.signal,
      };

      try {
        const parsedInput = job.inputSchema.parse(input);
        const output = await this.runWithTimeout(
          () => job.handler(parsedInput, context),
          job.timeout,
          jobId,
          abortController,
        );
        const parsedOutput = job.outputSchema.parse(output);
        const latencyMs = Date.now() - start;

        const result: JobResult = {
          jobId,
          runId,
          status: 'completed' as JobStatus,
          output: parsedOutput,
          latencyMs,
          attempt,
          retries: attempt - 1,
          completedAt: new Date().toISOString(),
        };

        this.options.metrics.recordJob({ jobId, success: true, latencyMs, retries: attempt - 1 });
        this.options.logger.info('job.completed', { jobId, runId, traceId, latencyMs });
        this.options.events.emitJob({
          id: crypto.randomUUID(),
          type: 'job.completed',
          aggregateId: jobId,
          payload: { runId, latencyMs },
          timestamp: new Date().toISOString(),
          traceId,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < maxAttempts && job.retryable) {
          const delay = this.options.retry.getDelay(attempt);
          this.options.events.emitJob({
            id: crypto.randomUUID(),
            type: 'job.retrying',
            aggregateId: jobId,
            payload: { runId, attempt, delay },
            timestamp: new Date().toISOString(),
            traceId,
          });
          await sleep(delay);
          continue;
        }
        break;
      }
    }

    const latencyMs = Date.now() - start;
    this.options.metrics.recordJob({ jobId, success: false, latencyMs, retries: attempt - 1 });
    this.options.logger.error('job.failed', { jobId, runId, traceId, error: lastError });
    this.options.events.emitJob({
      id: crypto.randomUUID(),
      type: 'job.failed',
      aggregateId: jobId,
      payload: { runId, error: lastError },
      timestamp: new Date().toISOString(),
      traceId,
    });

    return {
      jobId,
      runId,
      status: 'failed',
      error: lastError,
      latencyMs,
      attempt,
      retries: attempt - 1,
      completedAt: new Date().toISOString(),
    };
  }

  private async runWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number,
    jobId: string,
    controller: AbortController,
  ): Promise<T> {
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await Promise.resolve(fn());
    } catch (error) {
      if (controller.signal.aborted) {
        throw new JobTimeoutError(jobId, timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const jobRegistry = new JobRegistry();
