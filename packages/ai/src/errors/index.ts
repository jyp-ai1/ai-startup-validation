import { BaseError } from '@repo/core/errors';

/** Base error for AI platform operations. */
export class AIProviderError extends BaseError {
  readonly provider: string;

  constructor(
    message: string,
    provider: string,
    statusCode = 502,
    details?: unknown,
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', statusCode, details);
    this.provider = provider;
  }
}

export class ModelNotFoundError extends BaseError {
  readonly modelId: string;

  constructor(modelId: string, details?: unknown) {
    super(`Model not found: ${modelId}`, 'NOT_FOUND', 404, details);
    this.modelId = modelId;
  }
}

export class RateLimitError extends BaseError {
  readonly retryAfterMs?: number;

  constructor(message = 'Rate limit exceeded', retryAfterMs?: number) {
    super(message, 'INTERNAL_SERVER_ERROR', 429, { retryAfterMs });
    this.retryAfterMs = retryAfterMs;
  }
}

export class TokenLimitError extends BaseError {
  readonly limit: number;
  readonly requested: number;

  constructor(limit: number, requested: number) {
    super(
      `Token limit exceeded: requested ${requested}, limit ${limit}`,
      'VALIDATION_ERROR',
      400,
      { limit, requested },
    );
    this.limit = limit;
    this.requested = requested;
  }
}

export class SafetyError extends BaseError {
  constructor(message = 'Content blocked by safety filter', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

export class ProviderNotRegisteredError extends BaseError {
  constructor(providerId: string) {
    super(
      `Provider not registered: ${providerId}`,
      'NOT_FOUND',
      404,
      { providerId },
    );
  }
}

export { isBaseError } from '@repo/core/errors';
