import type { MCPServerPort, ServerInfo, ToolMetadata } from '../types';

/** MCP server port — expose tools to MCP clients. */
export class MCPServer implements MCPServerPort {
  readonly id: string;
  readonly info: ServerInfo;
  private connected = false;
  private tools: ToolMetadata[] = [];

  constructor(info: ServerInfo) {
    this.id = info.id;
    this.info = info;
  }

  setTools(tools: ToolMetadata[]): void {
    this.tools = tools;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<ToolMetadata[]> {
    return [...this.tools];
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export type { MCPServerPort } from '../types';
