import { InternalServerError } from '@repo/core/errors';

import { SupabaseAuthAdapter } from '../adapters/supabase/auth/auth.adapter';
import { SupabaseRealtimeAdapter } from '../adapters/supabase/realtime/realtime.adapter';
import { SupabaseStorageAdapter } from '../adapters/supabase/storage/storage.adapter';
import type { AuthPort } from '../auth/auth.port';
import { isSupabaseConfigured } from '../env/env';
import type { RealtimePort } from '../realtime/realtime.port';
import type { OrganizationRepository } from '../repositories/organization.repository';
import { SupabaseOrganizationRepository } from '../repositories/organization.repository';
import type { ProjectRepository } from '../repositories/project.repository';
import { SupabaseProjectRepository } from '../repositories/project.repository';
import type { UserRepository } from '../repositories/user.repository';
import { SupabaseUserRepository } from '../repositories/user.repository';
import type { StoragePort } from '../storage/storage.port';

/** DI tokens — resolve interfaces, never concrete Supabase classes in apps. */
export const DbTokens = {
  UserRepository: Symbol('UserRepository'),
  OrganizationRepository: Symbol('OrganizationRepository'),
  ProjectRepository: Symbol('ProjectRepository'),
  AuthPort: Symbol('AuthPort'),
  StoragePort: Symbol('StoragePort'),
  RealtimePort: Symbol('RealtimePort'),
} as const;

export type DatabasePlatform = {
  repositories: {
    user: UserRepository;
    organization: OrganizationRepository;
    project: ProjectRepository;
  };
  auth: AuthPort;
  storage: StoragePort;
  realtime: RealtimePort;
  isConfigured: boolean;
};

type ContainerRegistry = Map<symbol, unknown>;

/** Simple DI container — swap adapters without changing consumers. */
export class DbContainer {
  private readonly registry: ContainerRegistry = new Map();

  register<T>(token: symbol, instance: T): this {
    this.registry.set(token, instance);
    return this;
  }

  resolve<T>(token: symbol): T {
    const instance = this.registry.get(token);
    if (!instance) {
      throw new InternalServerError(
        `No binding registered for token: ${token.toString()}`,
      );
    }
    return instance as T;
  }

  /** Convenience accessors matching DatabasePlatform shape. */
  get platform(): DatabasePlatform {
    return {
      repositories: {
        user: this.resolve<UserRepository>(DbTokens.UserRepository),
        organization: this.resolve<OrganizationRepository>(
          DbTokens.OrganizationRepository,
        ),
        project: this.resolve<ProjectRepository>(DbTokens.ProjectRepository),
      },
      auth: this.resolve<AuthPort>(DbTokens.AuthPort),
      storage: this.resolve<StoragePort>(DbTokens.StoragePort),
      realtime: this.resolve<RealtimePort>(DbTokens.RealtimePort),
      isConfigured: isSupabaseConfigured(),
    };
  }
}

/** Create a container wired to Supabase adapters (default platform). */
export function createDatabasePlatform(): DbContainer {
  const userRepo = new SupabaseUserRepository();
  const orgRepo = new SupabaseOrganizationRepository();
  const projectRepo = new SupabaseProjectRepository();
  const auth = new SupabaseAuthAdapter();
  const storage = new SupabaseStorageAdapter();
  const realtime = new SupabaseRealtimeAdapter();

  return new DbContainer()
    .register(DbTokens.UserRepository, userRepo)
    .register(DbTokens.OrganizationRepository, orgRepo)
    .register(DbTokens.ProjectRepository, projectRepo)
    .register(DbTokens.AuthPort, auth)
    .register(DbTokens.StoragePort, storage)
    .register(DbTokens.RealtimePort, realtime);
}

let defaultContainer: DbContainer | null = null;

/** Singleton platform — lazy init for app usage. */
export function getDatabasePlatform(): DbContainer {
  if (!defaultContainer) {
    defaultContainer = createDatabasePlatform();
  }
  return defaultContainer;
}

/** Resolve a repository from the default container. */
export function resolveRepository<T>(token: symbol): T {
  return getDatabasePlatform().resolve<T>(token);
}
