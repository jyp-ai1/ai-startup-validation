/**
 * Auth platform entry for apps/web.
 * Authentication → @repo/db · Authorization → @repo/feature-auth
 */
import {
  getAuthPlatform,
  permissionChecker,
  PERMISSIONS,
  type Permission,
  type AuthDomainUser,
} from '@repo/feature-auth';

export const auth = getAuthPlatform();

/** Preferred authorization check — never use raw role string comparisons. */
export function can(user: AuthDomainUser, permission: Permission): boolean {
  return permissionChecker.canUser(user, permission);
}

export { getAuthPlatform, PERMISSIONS, permissionChecker };
export type { Permission, AuthDomainUser };
