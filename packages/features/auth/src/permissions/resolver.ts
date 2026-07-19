import type { Permission } from '../domain/permission';

import type { PermissionContext } from './context';
import type { PermissionRegistry } from './registry';
import { permissionRegistry } from './registry';

/** Resolves effective permissions for a context from RBAC + overrides. */
export class PermissionResolver {
  constructor(private readonly registry: PermissionRegistry = permissionRegistry) {}

  resolve(context: PermissionContext): Permission[] {
    const rolePermissions = this.registry.getPermissionsForRole(context.role);
    const granted = context.grantedPermissions ?? [];
    const denied = new Set(context.deniedPermissions ?? []);

    const effective = new Set<Permission>([...rolePermissions, ...granted]);
    for (const p of denied) {
      effective.delete(p);
    }

    return [...effective];
  }

  resolveAll(context: PermissionContext): Set<Permission> {
    return new Set(this.resolve(context));
  }
}

export const permissionResolver = new PermissionResolver();
