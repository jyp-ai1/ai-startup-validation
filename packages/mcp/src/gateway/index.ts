import type {
  ExecutionContext,
  RegisteredTool,
  ToolExecutionResult,
  ToolMetadata,
  WorkflowDefinition,
  WorkflowResult,
} from '../types';
import type { MCPRuntime } from '../runtime';
import type { ToolDiscovery } from '../discovery';
import { createExecutionContext } from '../context';

/** MCP Gateway — single entry point for applications. */
export class MCPGateway {
  constructor(
    private readonly runtime: MCPRuntime,
    private readonly toolDiscovery: ToolDiscovery,
  ) {}

  /** Execute tool via gateway. */
  async executeTool(
    toolId: string,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    return this.runtime.executeTool(toolId, input, context);
  }

  /** Execute workflow via gateway. */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: ExecutionContext,
  ): Promise<WorkflowResult> {
    return this.runtime.executeWorkflow(workflow, context);
  }

  /** Register tool via gateway. */
  registerTool(tool: RegisteredTool): void {
    this.runtime.registerTool(tool);
  }

  unregisterTool(toolId: string): boolean {
    return this.runtime.unregisterTool(toolId);
  }

  /** Discover and search tools. */
  listTools(): ToolMetadata[] {
    return this.toolDiscovery.listLocal();
  }

  searchTools(query: string): ToolMetadata[] {
    return this.toolDiscovery.search(query);
  }

  recommendTools(query: string, limit?: number): ToolMetadata[] {
    return this.toolDiscovery.recommend(query, limit);
  }

  /** Generate tool documentation. */
  getToolDocumentation(): string {
    return this.runtime.getRegistry().toMarkdown();
  }

  /** Create execution context helper. */
  createContext(partial: Parameters<typeof createExecutionContext>[0]): ExecutionContext {
    return createExecutionContext(partial);
  }

  cancelWorkflow(workflowId: string): void {
    this.runtime.cancelWorkflow(workflowId);
  }
}
