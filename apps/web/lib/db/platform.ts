/**
 * Database platform entry point for apps/web.
 *
 * Apps depend on repository INTERFACES via DI — never @supabase/supabase-js.
 */
import {
  DbTokens,
  getDatabasePlatform,
  type UserRepository,
} from '@repo/db';

/** Shared DI container — resolves ports/adapters. */
export const db = getDatabasePlatform();

/** Example: resolve UserRepository interface (Supabase impl behind the scenes). */
export function getUserRepository(): UserRepository {
  return db.resolve<UserRepository>(DbTokens.UserRepository);
}

export { DbTokens, getDatabasePlatform };
export type { UserRepository, OrganizationRepository, ProjectRepository } from '@repo/db';
