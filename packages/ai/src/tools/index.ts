export type ToolParameterSchema = {
  type: 'object';
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
};

export type Tool = {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  handler: ToolHandler;
};

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export type ToolResult = {
  toolCallId: string;
  name: string;
  success: boolean;
  output: unknown;
  error?: string;
  latencyMs: number;
};

export type ToolCallInput = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

/** Registry of callable tools for LLM function calling. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  toDefinitions(): Array<{ name: string; description: string; parameters: ToolParameterSchema }> {
    return this.list().map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }
}

/** Execute tool calls from LLM responses. */
export class ToolExecutor {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(call: ToolCallInput): Promise<ToolResult> {
    const start = Date.now();
    const tool = this.registry.get(call.name);

    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.name,
        success: false,
        output: null,
        error: `Tool not found: ${call.name}`,
        latencyMs: Date.now() - start,
      };
    }

    try {
      const output = await tool.handler(call.arguments);
      return {
        toolCallId: call.id,
        name: call.name,
        success: true,
        output,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolCallId: call.id,
        name: call.name,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - start,
      };
    }
  }

  async executeAll(calls: ToolCallInput[]): Promise<ToolResult[]> {
    return Promise.all(calls.map((c) => this.execute(c)));
  }
}

export const toolRegistry = new ToolRegistry();
export const toolExecutor = new ToolExecutor(toolRegistry);
