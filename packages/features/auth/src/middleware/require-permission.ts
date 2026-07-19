import type { Permission } from '../domain/permission';
import type { AuthDomainUser } from '../domain/role';
import { permissionGuard } from '../permissions/guard';
import { createPermissionContext } from '../permissions/context';
import { auditLogger } from '../infrastructure/audit.logger';

/** Require specific permission — primary authorization middleware. */
export async function requirePermission(
  user: AuthDomainUser,
  permission: Permission,
): Promise<void> {
  const context = createPermissionContext({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
  });

  try {
    permissionGuard.requirePermission(context, permission);
  } catch (error) {
    await auditLogger.logAuthEvent('auth.permission_denied', user.id, {
      permission,
      role: user.role,
    });
    throw error;
  }
}

export async function requireAnyPermission(
  user: AuthDomainUser,
  permissions: Permission[],
): Promise<void> {
  const context = createPermissionContext({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
  });
  permissionGuard.requireAnyPermission(context, permissions);
}
