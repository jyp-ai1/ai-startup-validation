import type {
  ApiError,
  ApiMeta,
  ApiResponse,
  ApiSuccess,
} from '@repo/types';

import { BaseError, isBaseError } from '../errors';

/** Create a typed success response envelope. */
export function createSuccessResponse<T>(
  data: T,
  meta?: ApiMeta,
): ApiSuccess<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

/** Create a typed error response envelope. */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

/** Create an error response from a BaseError instance. */
export function createErrorFromException(error: BaseError): ApiError {
  return createErrorResponse(error.code, error.message, error.details);
}

/** Handle unknown errors and return a safe ApiError. */
export function handleUnknownError(error: unknown): ApiError {
  if (isBaseError(error)) {
    return createErrorFromException(error);
  }

  if (error instanceof Error) {
    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    );
  }

  return createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
  );
}

/** Type guard for ApiSuccess. */
export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccess<T> {
  return response.success === true;
}

/** Type guard for ApiError response. */
export function isApiErrorResponse<T>(
  response: ApiResponse<T>,
): response is ApiError {
  return response.success === false;
}

export type { ApiResponse, ApiSuccess, ApiError, ApiMeta };
