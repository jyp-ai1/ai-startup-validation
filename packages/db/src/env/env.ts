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

/**
 * Read NEXT_PUBLIC Supabase vars directly from process.env.
 * Next.js inlines these in client bundles; dbEnv may be empty in browser.
 */
export function readPublicSupabaseEnv(): {
  url: string | undefined;
  anonKey: string | undefined;
} {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Resolve public Supabase env — process.env first, dbEnv fallback for server-only bundles.
 */
export function resolvePublicSupabaseEnv(): { url: string; anonKey: string } | null {
  const direct = readPublicSupabaseEnv();
  const url = direct.url ?? dbEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = direct.anonKey ?? dbEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Browser OAuth gate — NEXT_PUBLIC_* only; never requires server env. */
export function isSupabaseBrowserConfigured(): boolean {
  const { url, anonKey } = readPublicSupabaseEnv();
  return Boolean(url && anonKey);
}

/** Returns true when Supabase can be used in the current runtime. */
export function isSupabaseConfigured(): boolean {
  if (isSupabaseBrowserConfigured()) {
    if (typeof window !== 'undefined') return true;
    return Boolean(
      (dbEnv.SUPABASE_URL && dbEnv.SUPABASE_ANON_KEY) || isSupabaseBrowserConfigured(),
    );
  }

  const resolved = resolvePublicSupabaseEnv();
  if (!resolved) return false;

  if (typeof window !== 'undefined') return true;

  return Boolean(
    (dbEnv.SUPABASE_URL && dbEnv.SUPABASE_ANON_KEY) || resolved,
  );
}

/** Returns true when service-role operations are available. */
export function isSupabaseAdminConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(dbEnv.SUPABASE_SERVICE_ROLE_KEY);
}
