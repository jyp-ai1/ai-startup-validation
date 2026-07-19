import type { MCPClientPort, ServerInfo } from '../types';

/** MCP client port — connects to remote/local MCP servers. */
export class MCPClient implements MCPClientPort {
  private readonly connected = new Map<string, ServerInfo>();

  async connect(server: ServerInfo): Promise<void> {
    // Future: transport-specific connection
    this.connected.set(server.id, server);
  }

  async disconnect(serverId: string): Promise<void> {
    this.connected.delete(serverId);
  }

  async callTool(_serverId: string, toolId: string, input: unknown): Promise<unknown> {
    // Future: route via transport to MCP server
    return { stub: true, toolId, input };
  }

  listServers(): ServerInfo[] {
    return [...this.connected.values()];
  }

  isConnected(serverId: string): boolean {
    return this.connected.has(serverId);
  }
}

export const mcpClient = new MCPClient();

export type { MCPClientPort } from '../types';
