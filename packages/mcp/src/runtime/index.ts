import type {
  ExecutionContext,
  RegisteredTool,
  ToolExecutionResult,
  WorkflowDefinition,
  WorkflowResult,
} from '../types';
import type { ToolRegistry } from '../registry';
import { ToolExecutor } from '../execution';
import { WorkflowEngine } from '../workflow';
import type { MetricsTracker } from '../metrics';
import type { MCPLogger } from '../logging';
import { ADAPTER_REGISTRY } from '../adapters';

export type MCPRuntimeOptions = {
  registry: ToolRegistry;
  metrics: MetricsTracker;
  logger: MCPLogger;
  registerDefaultAdapters?: boolean;
};

/** MCP Runtime — central orchestrator for tool execution and workflows. */
export class MCPRuntime {
  private readonly registry: ToolRegistry;
  private readonly executor: ToolExecutor;
  private readonly workflowEngine: WorkflowEngine;
  private readonly logger: MCPLogger;
  private initialized = false;

  constructor(options: MCPRuntimeOptions) {
    this.registry = options.registry;
    this.logger = options.logger;
    const metrics = options.metrics;

    this.executor = new ToolExecutor({ registry: this.registry, metrics, logger: this.logger });
    this.workflowEngine = new WorkflowEngine(
      (toolId, input, ctx) => this.executor.execute(toolId, input, ctx),
      { defaultTimeout: 60_000, defaultRetries: 2 },
    );

    if (options.registerDefaultAdapters !== false) {
      this.registerDefaultAdapters();
    }
  }

  /** Initialize runtime — hot registration ready. */
  initialize(): void {
    if (this.initialized) return;
    this.logger.info('runtime.initialize');
    this.initialized = true;
  }

  /** Register a tool with full metadata. */
  registerTool(tool: RegisteredTool): void {
    this.registry.register(tool);
    this.logger.info('runtime.tool.registered', { toolId: tool.id, category: tool.category });
  }

  /** Unregister a tool — supports hot removal. */
  unregisterTool(toolId: string): boolean {
    const removed = this.registry.unregister(toolId);
    if (removed) this.logger.info('runtime.tool.unregistered', { toolId });
    return removed;
  }

  /** Execute a single tool through the runtime. */
  async executeTool(
    toolId: string,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    this.ensureInitialized();
    return this.executor.execute(toolId, input, context);
  }

  /** Execute a workflow through the runtime. */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: ExecutionContext,
  ): Promise<WorkflowResult> {
    this.ensureInitialized();
    this.logger.info('runtime.workflow.start', { workflowId: workflow.id, traceId: context.traceId });
    const result = await this.workflowEngine.execute(workflow, context);
    this.logger.info('runtime.workflow.complete', {
      workflowId: workflow.id,
      success: result.success,
      latencyMs: result.latencyMs,
    });
    return result;
  }

  /** Cancel a running workflow. */
  cancelWorkflow(workflowId: string): void {
    this.workflowEngine.cancel(workflowId);
  }

  /** Shutdown runtime gracefully. */
  shutdown(): void {
    this.logger.info('runtime.shutdown');
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getRegistry(): ToolRegistry {
    return this.registry;
  }

  private ensureInitialized(): void {
    if (!this.initialized) this.initialize();
  }

  private registerDefaultAdapters(): void {
    for (const createAdapter of Object.values(ADAPTER_REGISTRY)) {
      const adapter = createAdapter();
      const handlers = adapter.createHandlers();
      for (const meta of adapter.getToolDefinitions()) {
        const handler = handlers.get(meta.id);
        if (handler) {
          this.registry.register({ ...meta, handler });
        }
      }
    }
  }
}
