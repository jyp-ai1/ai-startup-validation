import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '../../env/env';
import { getSupabaseClientFactory } from './client';

/** Create a Supabase browser client (anon key, cookie-aware). */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const factory = getSupabaseClientFactory();
  const config = factory.getConfig();

  const client = createSupabaseBrowserClient(
    config.publicUrl,
    config.publicAnonKey,
  );

  factory.setClient('browser', client);
  return client;
}

/** Get cached browser client or create one. */
export function getBrowserClient(): SupabaseClient {
  const factory = getSupabaseClientFactory();
  const existing = factory.getClient('browser') as SupabaseClient | undefined;
  if (existing) return existing;

  const client = createBrowserClient();
  if (!client) {
    throw new Error('Supabase browser client unavailable — check env vars.');
  }
  return client;
}
