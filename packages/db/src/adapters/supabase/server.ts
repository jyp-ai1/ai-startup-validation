import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '../../env/env';
import { getSupabaseClientFactory } from './client';

type CookieStore = {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
};

type CreateServerClientOptions = {
  cookies: CookieStore;
};

/** Create a Supabase server client bound to request cookies. */
export function createServerClient(
  options: CreateServerClientOptions,
): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const factory = getSupabaseClientFactory();
  const config = factory.getConfig();

  const client = createSupabaseServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => options.cookies.getAll(),
      setAll: (
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) => {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          options.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });

  factory.setClient('server', client);
  return client;
}

/** Get cached server client — must be created per-request via createServerClient. */
export function getServerClient(): SupabaseClient {
  return getSupabaseClientFactory().getClient('server') as SupabaseClient;
}
