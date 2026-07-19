import type { Permission } from '../domain/permission';
import type { AuthDomainUser } from '../domain/role';

import type { PermissionContext } from './context';
import { createPermissionContext } from './context';
import type { PermissionResolver } from './resolver';
import { permissionResolver } from './resolver';

/** Check permissions — use instead of `if (role === 'admin')`. */
export class PermissionChecker {
  constructor(private readonly resolver: PermissionResolver = permissionResolver) {}

  can(context: PermissionContext, permission: Permission): boolean {
    return this.resolver.resolve(context).includes(permission);
  }

  canAny(context: PermissionContext, permissions: Permission[]): boolean {
    const effective = this.resolver.resolveAll(context);
    return permissions.some((p) => effective.has(p));
  }

  canAll(context: PermissionContext, permissions: Permission[]): boolean {
    const effective = this.resolver.resolveAll(context);
    return permissions.every((p) => effective.has(p));
  }

  /** Convenience — build context from domain user. */
  canUser(user: AuthDomainUser, permission: Permission): boolean {
    return this.can(
      createPermissionContext({
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      }),
      permission,
    );
  }

  cannot(context: PermissionContext, permission: Permission): boolean {
    return !this.can(context, permission);
  }
}

export const permissionChecker = new PermissionChecker();
