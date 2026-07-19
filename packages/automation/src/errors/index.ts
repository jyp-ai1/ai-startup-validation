import { BaseError, NotFoundError } from '@repo/core/errors';

export class JobNotFoundError extends NotFoundError {
  readonly jobId: string;
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`);
    this.jobId = jobId;
  }
}

export class JobExecutionError extends BaseError {
  readonly jobId: string;
  constructor(jobId: string, message: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
    this.jobId = jobId;
  }
}

export class JobTimeoutError extends BaseError {
  readonly jobId: string;
  readonly timeoutMs: number;
  constructor(jobId: string, timeoutMs: number) {
    super(`Job timeout: ${jobId} exceeded ${timeoutMs}ms`, 'INTERNAL_SERVER_ERROR', 408, {
      jobId,
      timeoutMs,
    });
    this.jobId = jobId;
    this.timeoutMs = timeoutMs;
  }
}

export class PipelineTimeoutError extends BaseError {
  readonly pipelineId: string;
  constructor(pipelineId: string, timeoutMs: number) {
    super(`Pipeline timeout: ${pipelineId} exceeded ${timeoutMs}ms`, 'INTERNAL_SERVER_ERROR', 408);
    this.pipelineId = pipelineId;
  }
}

export class QueueEmptyError extends BaseError {
  constructor() {
    super('Queue is empty', 'NOT_FOUND', 404);
  }
}

export class SchedulerError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export { isBaseError } from '@repo/core/errors';
