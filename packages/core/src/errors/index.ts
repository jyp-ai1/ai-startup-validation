import type { ApiErrorCode } from '@repo/types';

/** Base error for all application errors. */
export class BaseError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode,
    statusCode: number,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends BaseError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends BaseError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class InternalServerError extends BaseError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}

/** Type guard for BaseError instances. */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}
