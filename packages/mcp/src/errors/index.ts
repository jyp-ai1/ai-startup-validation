import { BaseError, ForbiddenError, NotFoundError } from '@repo/core/errors';

export class ToolNotFoundError extends NotFoundError {
  readonly toolId: string;

  constructor(toolId: string) {
    super(`Tool not found: ${toolId}`);
    this.toolId = toolId;
  }
}

export class PermissionDeniedError extends ForbiddenError {
  readonly permission: string;
  readonly toolId?: string;

  constructor(permission: string, toolId?: string) {
    super(`Permission denied: ${permission}${toolId ? ` for tool ${toolId}` : ''}`);
    this.permission = permission;
    this.toolId = toolId;
  }
}

export class WorkflowTimeoutError extends BaseError {
  readonly workflowId: string;
  readonly timeoutMs: number;

  constructor(workflowId: string, timeoutMs: number) {
    super(
      `Workflow timeout: ${workflowId} exceeded ${timeoutMs}ms`,
      'INTERNAL_SERVER_ERROR',
      408,
      { workflowId, timeoutMs },
    );
    this.workflowId = workflowId;
    this.timeoutMs = timeoutMs;
  }
}

export class TransportError extends BaseError {
  readonly transport: string;

  constructor(message: string, transport: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 502, details);
    this.transport = transport;
  }
}

export class ExecutionError extends BaseError {
  readonly toolId: string;

  constructor(toolId: string, message: string, details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
    this.toolId = toolId;
  }
}

export class WorkflowCancelledError extends BaseError {
  readonly workflowId: string;

  constructor(workflowId: string) {
    super(`Workflow cancelled: ${workflowId}`, 'INTERNAL_SERVER_ERROR', 499);
    this.workflowId = workflowId;
  }
}

export { isBaseError } from '@repo/core/errors';
