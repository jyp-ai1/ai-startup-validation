import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClientFactory } from './client';

/**
 * Service-role client for background jobs and repository operations.
 * Alias of admin client with explicit service semantics.
 */
export function createServiceClient(): SupabaseClient {
  const factory = getSupabaseClientFactory();
  factory.assertAdminConfigured();

  const config = factory.getConfig();
  const client = createClient(config.url, config.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  factory.setClient('service', client);
  return client;
}

/** Get or create service client (used by repositories). */
export function getServiceClient(): SupabaseClient {
  const factory = getSupabaseClientFactory();
  try {
    return factory.getClient('service') as SupabaseClient;
  } catch {
    return createServiceClient();
  }
}
