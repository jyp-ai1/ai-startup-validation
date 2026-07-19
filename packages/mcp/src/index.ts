import { toolRegistry } from './registry';
import { MCPRuntime } from './runtime';
import { MCPGateway } from './gateway';
import { ToolDiscovery, CapabilityDiscovery, serverDiscovery } from './discovery';
import { permissionResolver } from './permissions';
import { mcpLogger } from './logging';
import { metricsTracker } from './metrics';
import { mcpClient } from './client';

export type MCPPlatform = {
  runtime: MCPRuntime;
  gateway: MCPGateway;
  registry: typeof toolRegistry;
  permissions: typeof permissionResolver;
  discovery: {
    tools: ToolDiscovery;
    capabilities: CapabilityDiscovery;
    servers: typeof serverDiscovery;
  };
  client: typeof mcpClient;
  logger: typeof mcpLogger;
  metrics: typeof metricsTracker;
};

/** Create MCP platform with runtime, gateway, and default adapter stubs. */
export function createMCPPlatform(options?: {
  registerDefaultAdapters?: boolean;
}): MCPPlatform {
  const runtime = new MCPRuntime({
    registry: toolRegistry,
    metrics: metricsTracker,
    logger: mcpLogger,
    registerDefaultAdapters: options?.registerDefaultAdapters ?? true,
  });

  runtime.initialize();

  const toolDiscovery = new ToolDiscovery(toolRegistry);
  const capabilityDiscovery = new CapabilityDiscovery(serverDiscovery, toolDiscovery);

  return {
    runtime,
    gateway: new MCPGateway(runtime, toolDiscovery),
    registry: toolRegistry,
    permissions: permissionResolver,
    discovery: {
      tools: toolDiscovery,
      capabilities: capabilityDiscovery,
      servers: serverDiscovery,
    },
    client: mcpClient,
    logger: mcpLogger,
    metrics: metricsTracker,
  };
}

let defaultPlatform: MCPPlatform | null = null;

export function getMCPPlatform(): MCPPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createMCPPlatform();
  }
  return defaultPlatform;
}

// Types
export type * from './types';

// Errors
export * from './errors';

// Runtime
export { MCPRuntime } from './runtime';

// Gateway
export { MCPGateway } from './gateway';

// Registry
export { ToolRegistry, toolRegistry } from './registry';

// Workflow
export { WorkflowEngine } from './workflow';

// Execution
export { ToolExecutor } from './execution';

// Permissions
export { PermissionResolver, permissionResolver } from './permissions';

// Context
export { createExecutionContext, forkContext } from './context';

// Discovery
export {
  ServerDiscovery,
  ToolDiscovery,
  CapabilityDiscovery,
  serverDiscovery,
} from './discovery';

// Transport (interfaces)
export type {
  TransportPort,
  StdioTransportPort,
  HttpTransportPort,
  WebSocketTransportPort,
  SSETransportPort,
} from './transport';

// Adapters
export {
  BaseToolAdapter,
  ADAPTER_REGISTRY,
  FilesystemAdapter,
  PlaywrightAdapter,
  GitHubAdapter,
} from './adapters';

// Client / Server
export { MCPClient, mcpClient } from './client';
export { MCPServer } from './server';

// Logging / Metrics
export { MCPLogger, mcpLogger } from './logging';
export { MetricsTracker, metricsTracker } from './metrics';

// Utils
export * from './utils';
