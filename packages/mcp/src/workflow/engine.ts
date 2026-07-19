import type {
  ExecutionContext,
  ToolExecutionResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowResult,
  WorkflowStep,
} from '../types';
import { WorkflowCancelledError, WorkflowTimeoutError } from '../errors';

export type WorkflowEngineOptions = {
  defaultTimeout?: number;
  defaultRetries?: number;
};

/** Workflow engine — sequential, parallel, conditional, retry, timeout, cancellation. */
export class WorkflowEngine {
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(
    private readonly executeToolFn: (
      toolId: string,
      input: unknown,
      context: ExecutionContext,
    ) => Promise<ToolExecutionResult>,
    private readonly options: WorkflowEngineOptions = {},
  ) {}

  cancel(workflowId: string): void {
    this.abortControllers.get(workflowId)?.abort();
  }

  async execute(
    workflow: WorkflowDefinition,
    context: ExecutionContext,
  ): Promise<WorkflowResult> {
    const start = Date.now();
    const abortController = new AbortController();
    this.abortControllers.set(workflow.id, abortController);

    const wfContext: WorkflowContext = {
      execution: context,
      results: new Map(),
      variables: {},
      cancelled: false,
    };

    const timeoutMs = workflow.timeout ?? this.options.defaultTimeout ?? 60_000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new WorkflowTimeoutError(workflow.id, timeoutMs)), timeoutMs);
    });

    try {
      const results = await Promise.race([
        this.runSteps(workflow.steps, wfContext, abortController.signal),
        timeoutPromise,
      ]);

      return {
        workflowId: workflow.id,
        success: true,
        results,
        latencyMs: Date.now() - start,
        cancelled: wfContext.cancelled,
      };
    } catch (error) {
      return {
        workflowId: workflow.id,
        success: false,
        results: [...wfContext.results.values()],
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        cancelled: wfContext.cancelled,
      };
    } finally {
      this.abortControllers.delete(workflow.id);
    }
  }

  private async runSteps(
    steps: WorkflowStep[],
    ctx: WorkflowContext,
    signal: AbortSignal,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    for (const step of steps) {
      if (signal.aborted || ctx.cancelled) {
        ctx.cancelled = true;
        throw new WorkflowCancelledError('workflow');
      }
      const stepResults = await this.runStep(step, ctx, signal);
      results.push(...stepResults);
    }
    return results;
  }

  private async runStep(
    step: WorkflowStep,
    ctx: WorkflowContext,
    signal: AbortSignal,
  ): Promise<ToolExecutionResult[]> {
    switch (step.type) {
      case 'tool': {
        const result = await this.executeToolWithRetry(step.toolId, step.input, ctx.execution, signal);
        const stepId = step.id ?? step.toolId;
        ctx.results.set(stepId, result);
        return [result];
      }
      case 'sequential':
        return this.runSteps(step.steps, ctx, signal);
      case 'parallel': {
        const parallelResults = await Promise.all(
          step.steps.map((s) => this.runStep(s, ctx, signal)),
        );
        return parallelResults.flat();
      }
      case 'conditional': {
        const pass = await step.condition(ctx);
        const branch = pass ? step.then : (step.else ?? []);
        return this.runSteps(branch, ctx, signal);
      }
      default:
        return [];
    }
  }

  private async executeToolWithRetry(
    toolId: string,
    input: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
  ): Promise<ToolExecutionResult> {
    let lastResult: ToolExecutionResult | undefined;
    const maxAttempts = this.options.defaultRetries ?? 1;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      if (signal.aborted) throw new WorkflowCancelledError(toolId);
      lastResult = await this.executeToolFn(toolId, input, context);
      if (lastResult.success) return { ...lastResult, retries: attempt };
      if (attempt < maxAttempts) await sleep(500 * 2 ** attempt);
    }

    return lastResult!;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { WorkflowDefinition, WorkflowResult, WorkflowStep };
