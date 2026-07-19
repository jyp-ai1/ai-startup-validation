import { logger as appLogger } from '@repo/core/logger';
import type { Logger } from '@repo/core/logger';

import type { JobResult } from '../types';

export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  jobId?: string;
  runId?: string;
  traceId?: string;
  pipelineId?: string;
  data?: Record<string, unknown>;
};

/** Structured automation logger with job history. */
export class AutomationLogger {
  private readonly history: LogEntry[] = [];
  private readonly jobHistory: JobResult[] = [];

  constructor(private readonly logger: Logger = appLogger.child('automation')) {}

  private record(level: LogEntry['level'], event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      event,
      jobId: data?.jobId as string | undefined,
      runId: data?.runId as string | undefined,
      traceId: data?.traceId as string | undefined,
      pipelineId: data?.pipelineId as string | undefined,
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

  recordJobResult(result: JobResult): void {
    this.jobHistory.push(result);
  }

  getJobHistory(jobId?: string): JobResult[] {
    return jobId ? this.jobHistory.filter((r) => r.jobId === jobId) : [...this.jobHistory];
  }

  getExecutionTrace(traceId: string): LogEntry[] {
    return this.history.filter((e) => e.traceId === traceId);
  }

  clear(): void {
    this.history.length = 0;
    this.jobHistory.length = 0;
  }
}

export const automationLogger = new AutomationLogger();
