import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClientFactory } from './client';

/** Admin client — service role, server-only. Bypasses RLS. */
export function createAdminClient(): SupabaseClient {
  const factory = getSupabaseClientFactory();
  factory.assertAdminConfigured();

  const config = factory.getConfig();
  const client = createClient(config.url, config.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  factory.setClient('admin', client);
  return client;
}

/** Get or create admin client. */
export function getAdminClient(): SupabaseClient {
  const factory = getSupabaseClientFactory();
  try {
    return factory.getClient('admin') as SupabaseClient;
  } catch {
    return createAdminClient();
  }
}
