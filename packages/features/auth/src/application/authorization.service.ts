import { BaseService } from '@repo/core/service';
import type { Logger } from '@repo/core/logger';

import type { Permission } from '../domain/permission';
import type { AuthDomainUser } from '../domain/role';
import type { PermissionContext } from '../permissions/context';
import { createPermissionContext } from '../permissions/context';
import type { PermissionChecker } from '../permissions/checker';
import { permissionChecker } from '../permissions/checker';
import type { PermissionGuard } from '../permissions/guard';
import { permissionGuard } from '../permissions/guard';
import type { PermissionResolver } from '../permissions/resolver';
import { permissionResolver } from '../permissions/resolver';

/** Authorization application service — owned by this project, not Supabase. */
export class AuthorizationService extends BaseService {
  constructor(
    logger: Logger,
    private readonly checker: PermissionChecker = permissionChecker,
    private readonly guard: PermissionGuard = permissionGuard,
    private readonly resolver: PermissionResolver = permissionResolver,
  ) {
    super(logger);
  }

  buildContext(user: AuthDomainUser): PermissionContext {
    return createPermissionContext({
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  can(user: AuthDomainUser, permission: Permission): boolean {
    return this.checker.canUser(user, permission);
  }

  require(user: AuthDomainUser, permission: Permission): void {
    const context = this.buildContext(user);
    this.guard.requirePermission(context, permission);
    this.logInfo('Permission granted', { userId: user.id, permission });
  }

  getEffectivePermissions(user: AuthDomainUser): Permission[] {
    const context = this.buildContext(user);
    return this.resolver.resolve(context);
  }
}
