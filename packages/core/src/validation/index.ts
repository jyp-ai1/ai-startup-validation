import { z, type ZodSchema, type ZodError } from 'zod';

import { ValidationError } from '../errors';

/** Format Zod errors into a flat field → message map. */
export function formatZodError(error: ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/** Parse and validate data against a Zod schema. Throws ValidationError on failure. */
export function parseWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError('Validation failed', formatZodError(result.error));
  }

  return result.data;
}

/** Parse incoming request body/query/params. */
export function parseRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseWithSchema(schema, data);
}

/** Parse and validate outgoing response data (useful for adapter boundaries). */
export function parseResponse<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseWithSchema(schema, data);
}

/** Safe parse that returns a Result-like object instead of throwing. */
export function safeParse<T>(
  schema: ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return { success: false, error: formatZodError(result.error) };
  }

  return { success: true, data: result.data };
}

export { z };
