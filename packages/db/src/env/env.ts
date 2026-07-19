import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Supabase and database environment variables.
 * Loaded only in @repo/db — never in apps directly.
 *
 * Optional until Supabase project is connected.
 * Set SKIP_ENV_VALIDATION=true for CI without credentials.
 */
export const dbEnv = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().url().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  runtimeEnv: process.env,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  emptyStringAsUndefined: true,
});

export type DbEnv = typeof dbEnv;

/** Returns true when minimum Supabase config is present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    dbEnv.SUPABASE_URL &&
      dbEnv.SUPABASE_ANON_KEY &&
      dbEnv.NEXT_PUBLIC_SUPABASE_URL &&
      dbEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Returns true when service-role operations are available. */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(dbEnv.SUPABASE_SERVICE_ROLE_KEY);
}
