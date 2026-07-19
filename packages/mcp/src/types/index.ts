import type { z } from 'zod';

/** Required metadata for every MCP tool — drives docs, search, permissions, execution policy. */
export type ToolMetadata = {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  permissions: string[];
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  timeout: number;
  retryable: boolean;
  cacheable: boolean;
  tags: string[];
  capabilities: string[];
};

export type RegisteredTool = ToolMetadata & {
  handler: ToolHandler;
};

export type ToolHandler = (
  input: unknown,
  context: ExecutionContext,
) => Promise<unknown> | unknown;

export type ToolExecutionResult = {
  toolId: string;
  success: boolean;
  output: unknown;
  error?: string;
  latencyMs: number;
  retries: number;
  cached: boolean;
};

export type ExecutionContext = {
  userId: string | null;
  sessionId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  traceId: string;
  requestId: string;
  environment: 'development' | 'staging' | 'production' | 'test';
  permissions: string[];
  metadata?: Record<string, unknown>;
};

export type WorkflowStep =
  | { type: 'tool'; toolId: string; input: unknown; id?: string }
  | { type: 'parallel'; steps: WorkflowStep[]; id?: string }
  | { type: 'sequential'; steps: WorkflowStep[]; id?: string }
  | {
      type: 'conditional';
      condition: (ctx: WorkflowContext) => boolean | Promise<boolean>;
      then: WorkflowStep[];
      else?: WorkflowStep[];
      id?: string;
    };

export type WorkflowDefinition = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  timeout?: number;
  retry?: { maxAttempts: number; delayMs: number };
};

export type WorkflowContext = {
  execution: ExecutionContext;
  results: Map<string, ToolExecutionResult>;
  variables: Record<string, unknown>;
  cancelled: boolean;
};

export type WorkflowResult = {
  workflowId: string;
  success: boolean;
  results: ToolExecutionResult[];
  latencyMs: number;
  error?: string;
  cancelled: boolean;
};

export type TransportKind = 'stdio' | 'http' | 'websocket' | 'sse';

export type ServerInfo = {
  id: string;
  name: string;
  transport: TransportKind;
  url?: string;
  capabilities: string[];
  version: string;
};

export type PolicyEffect = 'allow' | 'deny';

export type PolicyRule = {
  id: string;
  effect: PolicyEffect;
  permissions: string[];
  toolIds?: string[];
  categories?: string[];
};

export type MCPServerPort = {
  id: string;
  info: ServerInfo;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<ToolMetadata[]>;
  isConnected(): boolean;
};

export type MCPClientPort = {
  connect(server: ServerInfo): Promise<void>;
  disconnect(serverId: string): Promise<void>;
  callTool(serverId: string, toolId: string, input: unknown): Promise<unknown>;
  listServers(): ServerInfo[];
};

export type AdapterKind =
  | 'filesystem'
  | 'playwright'
  | 'github'
  | 'slack'
  | 'discord'
  | 'google-drive'
  | 'notion'
  | 'sequential-thinking'
  | 'browser'
  | 'shell';

export type ToolAdapterPort = {
  kind: AdapterKind;
  getToolDefinitions(): ToolMetadata[];
  createHandlers(): Map<string, ToolHandler>;
};
