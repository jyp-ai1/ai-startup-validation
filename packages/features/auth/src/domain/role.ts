import type { ID, ISODateString } from '@repo/types';

/** Enterprise auth roles — owned by authorization layer, not Supabase. */
export const AUTH_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'editor',
  'member',
  'guest',
] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export type RoleDefinition = {
  id: AuthRole;
  label: string;
  description: string;
  priority: number;
};

export const ROLE_DEFINITIONS: Record<AuthRole, RoleDefinition> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform access across all organizations',
    priority: 100,
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Full access within an organization',
    priority: 80,
  },
  manager: {
    id: 'manager',
    label: 'Manager',
    description: 'Manage teams, projects, and members',
    priority: 60,
  },
  editor: {
    id: 'editor',
    label: 'Editor',
    description: 'Create and edit content',
    priority: 40,
  },
  member: {
    id: 'member',
    label: 'Member',
    description: 'Standard member access',
    priority: 20,
  },
  guest: {
    id: 'guest',
    label: 'Guest',
    description: 'Read-only limited access',
    priority: 10,
  },
};

export function hasRolePriority(userRole: AuthRole, minimumRole: AuthRole): boolean {
  return ROLE_DEFINITIONS[userRole].priority >= ROLE_DEFINITIONS[minimumRole].priority;
}

/** Domain user in auth context (enriched from @repo/types User). */
export type AuthDomainUser = {
  id: ID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AuthRole;
  organizationId: ID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};
