/** Nullable helper. */
export type Nullable<T> = T | null;

/** Make selected keys optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make selected keys required. */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** ISO 8601 date string. */
export type ISODateString = string;

/** Unique identifier string. */
export type ID = string;

/** Timestamp in milliseconds. */
export type Timestamp = number;

export type Environment = 'development' | 'test' | 'production';

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
