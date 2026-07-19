/** User roles for RBAC (implemented in Sprint 4). */
export type Role = 'user' | 'admin';

export const ROLES = ['user', 'admin'] as const satisfies readonly Role[];

/** Role hierarchy — higher index means more privileges. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  admin: 1,
};

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
