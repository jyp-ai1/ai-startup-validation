import type { TransportKind } from '../types';

export type TransportConfig = {
  kind: TransportKind;
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
};

/** STDIO transport port — for local MCP server processes. */
export interface StdioTransportPort {
  readonly kind: 'stdio';
  connect(command: string, args?: string[]): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  receive(): AsyncIterable<unknown>;
}

/** HTTP transport port — for remote MCP over REST. */
export interface HttpTransportPort {
  readonly kind: 'http';
  connect(config: TransportConfig): Promise<void>;
  disconnect(): Promise<void>;
  request(method: string, path: string, body?: unknown): Promise<unknown>;
}

/** WebSocket transport port — for bidirectional MCP. */
export interface WebSocketTransportPort {
  readonly kind: 'websocket';
  connect(url: string): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): () => void;
}

/** SSE transport port — for server-sent events MCP. */
export interface SSETransportPort {
  readonly kind: 'sse';
  connect(url: string): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(event: string, handler: (data: unknown) => void): () => void;
}

export type TransportPort =
  | StdioTransportPort
  | HttpTransportPort
  | WebSocketTransportPort
  | SSETransportPort;

export type TransportFactory = (config: TransportConfig) => TransportPort;
