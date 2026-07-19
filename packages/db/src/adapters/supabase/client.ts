import { InternalServerError } from '@repo/core/errors';

import { dbEnv, isSupabaseConfigured } from '../../env/env';

export type SupabaseClientKind = 'browser' | 'server' | 'admin' | 'service';

/**
 * Factory for Supabase clients — single entry point for all adapter code.
 * Applications never instantiate clients; they resolve adapters from the container.
 */
export class SupabaseClientFactory {
  private browserClient: unknown | null = null;
  private serverClient: unknown | null = null;
  private adminClient: unknown | null = null;
  private serviceClient: unknown | null = null;

  assertConfigured(): void {
    if (!isSupabaseConfigured()) {
      throw new InternalServerError(
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY. See docs/SUPABASE_SETUP.md',
      );
    }
  }

  assertAdminConfigured(): void {
    this.assertConfigured();
    if (!dbEnv.SUPABASE_SERVICE_ROLE_KEY) {
      throw new InternalServerError(
        'Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
  }

  getConfig() {
    return {
      url: dbEnv.SUPABASE_URL!,
      anonKey: dbEnv.SUPABASE_ANON_KEY!,
      serviceRoleKey: dbEnv.SUPABASE_SERVICE_ROLE_KEY,
      publicUrl: dbEnv.NEXT_PUBLIC_SUPABASE_URL!,
      publicAnonKey: dbEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }

  /** Mark client as cached — used by browser/server/admin/service modules. */
  setClient(kind: SupabaseClientKind, client: unknown): void {
    switch (kind) {
      case 'browser':
        this.browserClient = client;
        break;
      case 'server':
        this.serverClient = client;
        break;
      case 'admin':
        this.adminClient = client;
        break;
      case 'service':
        this.serviceClient = client;
        break;
    }
  }

  getClient(kind: SupabaseClientKind): unknown {
    const client = {
      browser: this.browserClient,
      server: this.serverClient,
      admin: this.adminClient,
      service: this.serviceClient,
    }[kind];

    if (!client) {
      throw new InternalServerError(
        `Supabase ${kind} client not initialized. Call create${kind.charAt(0).toUpperCase()}${kind.slice(1)}Client() first.`,
      );
    }

    return client;
  }
}

/** Shared singleton factory for the process. */
let factoryInstance: SupabaseClientFactory | null = null;

export function getSupabaseClientFactory(): SupabaseClientFactory {
  if (!factoryInstance) {
    factoryInstance = new SupabaseClientFactory();
  }
  return factoryInstance;
}

export function resetSupabaseClientFactory(): void {
  factoryInstance = null;
}
