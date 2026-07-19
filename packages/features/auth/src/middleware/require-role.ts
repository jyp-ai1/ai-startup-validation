import { ForbiddenError } from '@repo/core/errors';

import type { AuthRole } from '../domain/role';
import { hasRolePriority } from '../domain/role';
import type { AuthDomainUser } from '../domain/role';

/** Require minimum role priority — prefer PermissionChecker for fine-grained access. */
export function requireRole(
  user: AuthDomainUser,
  minimumRole: AuthRole,
): void {
  if (!hasRolePriority(user.role, minimumRole)) {
    throw new ForbiddenError(
      `Role '${user.role}' does not meet minimum '${minimumRole}'`,
    );
  }
}

export function requireExactRole(user: AuthDomainUser, role: AuthRole): void {
  if (user.role !== role) {
    throw new ForbiddenError(`Required role: ${role}`);
  }
}

export function requireAnyRole(user: AuthDomainUser, roles: AuthRole[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(
      `Required one of roles: ${roles.join(', ')}`,
    );
  }
}
