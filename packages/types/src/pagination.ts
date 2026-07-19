/** Pagination query parameters. */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

/** Normalized pagination input with defaults applied. */
export type PaginationInput = {
  page: number;
  limit: number;
  offset: number;
};

/** Paginated list result. */
export type PaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
