/** Standard API success envelope. */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

/** Standard API error envelope. */
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/** Unified API response type. */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Optional metadata attached to successful responses. */
export type ApiMeta = {
  requestId?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
};

/** Pagination metadata for list endpoints. */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/** Common API error codes. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_REQUEST';
