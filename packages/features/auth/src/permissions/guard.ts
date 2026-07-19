import { ForbiddenError, UnauthorizedError } from '@repo/core/errors';

import type { Permission } from '../domain/permission';

import type { PermissionChecker } from './checker';
import { permissionChecker } from './checker';
import type { PermissionContext } from './context';

/** Imperative guard — throws on denied access (server-side). */
export class PermissionGuard {
  constructor(private readonly checker: PermissionChecker = permissionChecker) {}

  requireAuth(context: PermissionContext | null): asserts context is PermissionContext {
    if (!context?.userId) {
      throw new UnauthorizedError('Authentication required');
    }
  }

  requirePermission(
    context: PermissionContext,
    permission: Permission,
  ): void {
    if (!this.checker.can(context, permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  }

  requireAnyPermission(
    context: PermissionContext,
    permissions: Permission[],
  ): void {
    if (!this.checker.canAny(context, permissions)) {
      throw new ForbiddenError(
        `Missing one of permissions: ${permissions.join(', ')}`,
      );
    }
  }

  requireAllPermissions(
    context: PermissionContext,
    permissions: Permission[],
  ): void {
    if (!this.checker.canAll(context, permissions)) {
      throw new ForbiddenError(
        `Missing permissions: ${permissions.join(', ')}`,
      );
    }
  }
}

export const permissionGuard = new PermissionGuard();
