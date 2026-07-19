import type { ID } from '@repo/types';

import type { Permission } from '../domain/permission';
import type { AuthRole } from '../domain/role';

/** Authorization context — Who + Where + optional overrides. */
export type PermissionContext = {
  userId: ID;
  role: AuthRole;
  organizationId?: ID | null;
  /** Optional explicit permission grants (additive to role). */
  grantedPermissions?: Permission[];
  /** Optional explicit permission revocations. */
  deniedPermissions?: Permission[];
};

export function createPermissionContext(
  partial: PermissionContext,
): PermissionContext {
  return {
    organizationId: null,
    grantedPermissions: [],
    deniedPermissions: [],
    ...partial,
  };
}
