import type { Permission, PermissionDefinition } from '../domain/permission';
import {
  ALL_PERMISSIONS,
  PERMISSION_DEFINITIONS,
} from '../domain/permission';
import type { AuthRole } from '../domain/role';
import { AUTH_ROLES, ROLE_DEFINITIONS } from '../domain/role';

import { ROLE_PERMISSION_MAP } from './rbac';

/** Central registry of roles and permissions. */
export class PermissionRegistry {
  private customRolePermissions: Map<AuthRole, Permission[]> = new Map(
    Object.entries(ROLE_PERMISSION_MAP) as [AuthRole, Permission[]][],
  );

  getPermissions(): Permission[] {
    return [...ALL_PERMISSIONS];
  }

  getPermissionDefinition(permission: Permission): PermissionDefinition {
    return PERMISSION_DEFINITIONS[permission];
  }

  getRoles(): AuthRole[] {
    return [...AUTH_ROLES];
  }

  getRoleDefinition(role: AuthRole) {
    return ROLE_DEFINITIONS[role];
  }

  getPermissionsForRole(role: AuthRole): Permission[] {
    return [...(this.customRolePermissions.get(role) ?? [])];
  }

  /** Override role permissions at runtime (e.g. per-tenant config). */
  setRolePermissions(role: AuthRole, permissions: Permission[]): void {
    this.customRolePermissions.set(role, [...permissions]);
  }

  isValidPermission(permission: string): permission is Permission {
    return ALL_PERMISSIONS.includes(permission as Permission);
  }
}

/** Default singleton registry. */
export const permissionRegistry = new PermissionRegistry();
