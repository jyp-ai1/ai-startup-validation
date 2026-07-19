import type { ExecutionContext, ToolExecutionResult } from '../types';
import { ExecutionError } from '../errors';
import type { ToolRegistry } from '../registry';
import { permissionResolver } from '../permissions';
import type { MetricsTracker } from '../metrics';
import type { MCPLogger } from '../logging';

export type ToolExecutorOptions = {
  registry: ToolRegistry;
  metrics: MetricsTracker;
  logger: MCPLogger;
};

/** Executes a single tool with validation, permissions, timeout, and metrics. */
export class ToolExecutor {
  constructor(private readonly options: ToolExecutorOptions) {}

  async execute(
    toolId: string,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    const start = Date.now();
    const { registry, metrics, logger } = this.options;

    logger.info('tool.execute.start', { toolId, traceId: context.traceId });

    try {
      const tool = registry.get(toolId);

      permissionResolver.requireExecute(
        context.permissions,
        tool.permissions,
        tool.id,
        tool.category,
      );

      const parsedInput = tool.inputSchema.parse(input);

      const result = await this.runWithTimeout(
        () => tool.handler(parsedInput, context),
        tool.timeout,
        toolId,
      );

      const parsedOutput = tool.outputSchema.parse(result);
      const latencyMs = Date.now() - start;

      const executionResult: ToolExecutionResult = {
        toolId,
        success: true,
        output: parsedOutput,
        latencyMs,
        retries: 0,
        cached: false,
      };

      metrics.recordToolCall({ toolId, success: true, latencyMs, retries: 0 });
      logger.info('tool.execute.success', { toolId, latencyMs, traceId: context.traceId });

      return executionResult;
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);

      metrics.recordToolCall({ toolId, success: false, latencyMs, retries: 0 });
      logger.error('tool.execute.failure', { toolId, error: message, traceId: context.traceId });

      return {
        toolId,
        success: false,
        output: null,
        error: message,
        latencyMs,
        retries: 0,
        cached: false,
      };
    }
  }

  private async runWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number,
    toolId: string,
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ExecutionError(toolId, `Tool execution timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }
}
