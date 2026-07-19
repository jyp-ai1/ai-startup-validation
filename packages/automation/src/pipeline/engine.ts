import type {
  JobResult,
  PipelineContext,
  PipelineDefinition,
  PipelineResult,
  PipelineStep,
} from '../types';
import { PipelineTimeoutError, JobExecutionError } from '../errors';
import type { JobRunner } from '../jobs/runner';
import type { EventBus } from '../events';
import type { AutomationLogger } from '../logging';

export type PipelineEngineOptions = {
  runner: JobRunner;
  events: EventBus;
  logger: AutomationLogger;
  defaultTimeout?: number;
};

/** Pipeline engine — sequential, parallel, conditional, retry, timeout, cancellation. */
export class PipelineEngine {
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(private readonly options: PipelineEngineOptions) {}

  cancel(pipelineId: string): void {
    this.abortControllers.get(pipelineId)?.abort();
  }

  async execute(
    pipeline: PipelineDefinition,
    traceId?: string,
  ): Promise<PipelineResult> {
    const start = Date.now();
    const runId = crypto.randomUUID();
    const tid = traceId ?? crypto.randomUUID();
    const abortController = new AbortController();
    this.abortControllers.set(pipeline.id, abortController);

    const ctx: PipelineContext = {
      traceId: tid,
      runId,
      variables: {},
      results: new Map(),
      cancelled: false,
    };

    this.options.events.emitWorkflow({
      id: crypto.randomUUID(),
      type: 'pipeline.started',
      aggregateId: pipeline.id,
      payload: { runId, traceId: tid },
      timestamp: new Date().toISOString(),
      traceId: tid,
    });

    const timeoutMs = pipeline.timeout ?? this.options.defaultTimeout ?? 300_000;

    try {
      const results = await Promise.race([
        this.runSteps(pipeline.steps, ctx, abortController.signal),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new PipelineTimeoutError(pipeline.id, timeoutMs)), timeoutMs),
        ),
      ]);

      this.options.events.emitWorkflow({
        id: crypto.randomUUID(),
        type: 'pipeline.completed',
        aggregateId: pipeline.id,
        payload: { runId, latencyMs: Date.now() - start },
        timestamp: new Date().toISOString(),
        traceId: tid,
      });

      return {
        pipelineId: pipeline.id,
        success: results.every((r) => r.status === 'completed'),
        results,
        latencyMs: Date.now() - start,
        cancelled: ctx.cancelled,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.events.emitWorkflow({
        id: crypto.randomUUID(),
        type: 'pipeline.failed',
        aggregateId: pipeline.id,
        payload: { runId, error: message },
        timestamp: new Date().toISOString(),
        traceId: tid,
      });

      return {
        pipelineId: pipeline.id,
        success: false,
        results: [...ctx.results.values()],
        latencyMs: Date.now() - start,
        error: message,
        cancelled: ctx.cancelled,
      };
    } finally {
      this.abortControllers.delete(pipeline.id);
    }
  }

  private async runSteps(
    steps: PipelineStep[],
    ctx: PipelineContext,
    signal: AbortSignal,
  ): Promise<JobResult[]> {
    const results: JobResult[] = [];
    for (const step of steps) {
      if (signal.aborted) {
        ctx.cancelled = true;
        break;
      }
      results.push(...(await this.runStep(step, ctx, signal)));
    }
    return results;
  }

  private async runStep(
    step: PipelineStep,
    ctx: PipelineContext,
    signal: AbortSignal,
  ): Promise<JobResult[]> {
    switch (step.type) {
      case 'job': {
        const input =
          typeof step.input === 'function'
            ? step.input(ctx)
            : step.input ?? this.getPreviousOutput(ctx);
        const result = await this.options.runner.run(step.jobId, input, {
          traceId: ctx.traceId,
          metadata: { pipelineRunId: ctx.runId },
        });
        const stepId = step.id ?? step.jobId;
        ctx.results.set(stepId, result);
        ctx.variables[stepId] = result.output;
        if (result.status !== 'completed') {
          throw new JobExecutionError(step.jobId, result.error ?? 'Job failed');
        }
        return [result];
      }
      case 'sequential':
        return this.runSteps(step.steps, ctx, signal);
      case 'parallel': {
        const batches = await Promise.all(step.steps.map((s) => this.runStep(s, ctx, signal)));
        return batches.flat();
      }
      case 'conditional': {
        const pass = await step.condition(ctx);
        return this.runSteps(pass ? step.then : (step.else ?? []), ctx, signal);
      }
      default:
        return [];
    }
  }

  private getPreviousOutput(ctx: PipelineContext): unknown {
    const results = [...ctx.results.values()];
    const last = results[results.length - 1];
    return last?.output ?? {};
  }
}

/** Pre-built Naver product upload pipeline. */
export function createNaverUploadPipeline(): PipelineDefinition {
  return {
    id: 'naver-product-upload',
    name: 'Naver Product Upload Pipeline',
    timeout: 600_000,
    steps: [
      { type: 'job', jobId: 'filesystem.scan', id: 'scan' },
      {
        type: 'job',
        jobId: 'browser.crawl',
        id: 'crawl',
        input: (ctx: PipelineContext) => ctx.variables.scan ?? {},
      },
      {
        type: 'job',
        jobId: 'image.optimize',
        id: 'optimize',
        input: (ctx: PipelineContext) => ctx.variables.crawl ?? {},
      },
      {
        type: 'job',
        jobId: 'content.generate',
        id: 'generate',
        input: (ctx: PipelineContext) => ({
          ...(ctx.variables.crawl as object),
          ...(ctx.variables.optimize as object),
        }),
      },
      {
        type: 'job',
        jobId: 'naver.upload',
        id: 'upload',
        input: (ctx: PipelineContext) => ({
          ...(ctx.variables.generate as object),
          optimized: (ctx.variables.optimize as { optimized?: string[] })?.optimized,
        }),
      },
    ],
  };
}

export type { PipelineDefinition, PipelineResult, PipelineStep } from '../types';
