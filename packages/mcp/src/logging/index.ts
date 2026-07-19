import { logger as appLogger } from '@repo/core/logger';
import type { Logger } from '@repo/core/logger';

export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  traceId?: string;
  requestId?: string;
  toolId?: string;
  workflowId?: string;
  data?: Record<string, unknown>;
};

/** Structured MCP logger with execution history. */
export class MCPLogger {
  private readonly history: LogEntry[] = [];

  constructor(private readonly logger: Logger = appLogger.child('mcp')) {}

  private record(level: LogEntry['level'], event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      event,
      traceId: data?.traceId as string | undefined,
      requestId: data?.requestId as string | undefined,
      toolId: data?.toolId as string | undefined,
      workflowId: data?.workflowId as string | undefined,
      data,
    };
    this.history.push(entry);
    this.logger[level](event, data);
  }

  debug(event: string, data?: Record<string, unknown>): void {
    this.record('debug', event, data);
  }

  info(event: string, data?: Record<string, unknown>): void {
    this.record('info', event, data);
  }

  warn(event: string, data?: Record<string, unknown>): void {
    this.record('warn', event, data);
  }

  error(event: string, data?: Record<string, unknown>): void {
    this.record('error', event, data);
  }

  getHistory(filter?: { traceId?: string; toolId?: string }): LogEntry[] {
    return this.history.filter((e) => {
      if (filter?.traceId && e.traceId !== filter.traceId) return false;
      if (filter?.toolId && e.toolId !== filter.toolId) return false;
      return true;
    });
  }

  clear(): void {
    this.history.length = 0;
  }
}

export const mcpLogger = new MCPLogger();
