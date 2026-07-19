// Environment
export { dbEnv, isSupabaseConfigured, isSupabaseAdminConfigured } from './env/env';
export type { DbEnv } from './env/env';

// DI Container
export {
  DbContainer,
  DbTokens,
  createDatabasePlatform,
  getDatabasePlatform,
  resolveRepository,
} from './di/container';
export type { DatabasePlatform } from './di/container';

// Ports (interfaces — depend on these in apps/services)
export type { AuthPort } from './auth/auth.port';
export type { StoragePort, StorageObject, UploadOptions } from './storage/storage.port';
export type {
  RealtimePort,
  RealtimeSubscription,
  RealtimeMessageHandler,
} from './realtime/realtime.port';

// Repository interfaces + Supabase implementations
export type { UserRepository } from './repositories/user.repository';
export { SupabaseUserRepository } from './repositories/user.repository';
export type { OrganizationRepository } from './repositories/organization.repository';
export { SupabaseOrganizationRepository } from './repositories/organization.repository';
export type { ProjectRepository } from './repositories/project.repository';
export { SupabaseProjectRepository } from './repositories/project.repository';
export type { StartupProjectRepository } from './repositories/startup-project.repository';
export { SupabaseStartupProjectRepository } from './repositories/startup-project.repository';

// Adapters (use via container — avoid direct imports in apps when possible)
export { SupabaseAuthAdapter } from './adapters/supabase/auth/auth.adapter';
export { SupabaseStorageAdapter } from './adapters/supabase/storage/storage.adapter';
export { SupabaseRealtimeAdapter } from './adapters/supabase/realtime/realtime.adapter';

// Client factory (for advanced server/browser setup in apps — still no supabase-js in apps)
export {
  SupabaseClientFactory,
  getSupabaseClientFactory,
} from './adapters/supabase/client';
export { createBrowserClient, getBrowserClient } from './adapters/supabase/browser';
export { createServerClient } from './adapters/supabase/server';
export { createAdminClient, getAdminClient } from './adapters/supabase/admin';
export { createServiceClient, getServiceClient } from './adapters/supabase/service';

// Migration & seed
export { seedDatabase } from './seed/index';

// Auth types
export type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  SignUpInput,
} from './types/auth.types';
