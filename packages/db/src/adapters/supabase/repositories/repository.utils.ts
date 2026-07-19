import {
  InternalServerError,
  NotFoundError,
} from '@repo/core/errors';

/** Handle Supabase query errors consistently. */
export function assertNoError(error: { message: string } | null): void {
  if (error) {
    throw new InternalServerError(error.message);
  }
}

/** Ensure a row was returned from a single-row query. */
export function assertRow<T>(row: T | null, entityName: string): T {
  if (!row) {
    throw new NotFoundError(`${entityName} not found`);
  }
  return row;
}

/** Apply equality filters — loose typing to avoid Supabase generic depth limits. */
export function applyEqFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!filter) return query;

  let result = query;
  for (const [key, value] of Object.entries(filter)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      result = result.eq(key, value);
    }
  }
  return result;
}

export type { SupabaseClient } from '@supabase/supabase-js';
