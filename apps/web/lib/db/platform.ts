/**
 * Database platform entry point for apps/web.
 *
 * Apps depend on repository INTERFACES via DI — never @supabase/supabase-js.
 */
import {
  DbTokens,
  getDatabasePlatform,
  type StartupProjectRepository,
  type UserRepository,
} from '@repo/db';

/** Shared DI container — resolves ports/adapters. */
export const db = getDatabasePlatform();

export function getUserRepository(): UserRepository {
  return db.resolve<UserRepository>(DbTokens.UserRepository);
}

export function getStartupProjectRepository(): StartupProjectRepository {
  return db.resolve<StartupProjectRepository>(DbTokens.StartupProjectRepository);
}

export { DbTokens, getDatabasePlatform };
export type {
  UserRepository,
  OrganizationRepository,
  ProjectRepository,
  StartupProjectRepository,
} from '@repo/db';
