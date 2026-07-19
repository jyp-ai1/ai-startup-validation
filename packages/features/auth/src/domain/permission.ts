/** Registered permission identifiers — never hardcode role checks in app code. */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  PROJECTS_READ: 'projects.read',
  PROJECTS_WRITE: 'projects.write',
  ORGANIZATIONS_READ: 'organizations.read',
  ORGANIZATIONS_WRITE: 'organizations.write',
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  ANALYTICS_READ: 'analytics.read',
  BILLING_READ: 'billing.read',
  BILLING_WRITE: 'billing.write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export type PermissionDefinition = {
  id: Permission;
  label: string;
  description: string;
  category: 'users' | 'projects' | 'organizations' | 'settings' | 'analytics' | 'billing';
};

export const PERMISSION_DEFINITIONS: Record<Permission, PermissionDefinition> = {
  'users.read': {
    id: 'users.read',
    label: 'Read Users',
    description: 'View user profiles and lists',
    category: 'users',
  },
  'users.write': {
    id: 'users.write',
    label: 'Write Users',
    description: 'Create, update, and deactivate users',
    category: 'users',
  },
  'projects.read': {
    id: 'projects.read',
    label: 'Read Projects',
    description: 'View projects',
    category: 'projects',
  },
  'projects.write': {
    id: 'projects.write',
    label: 'Write Projects',
    description: 'Create and manage projects',
    category: 'projects',
  },
  'organizations.read': {
    id: 'organizations.read',
    label: 'Read Organizations',
    description: 'View organization details',
    category: 'organizations',
  },
  'organizations.write': {
    id: 'organizations.write',
    label: 'Write Organizations',
    description: 'Manage organization settings',
    category: 'organizations',
  },
  'settings.read': {
    id: 'settings.read',
    label: 'Read Settings',
    description: 'View application settings',
    category: 'settings',
  },
  'settings.write': {
    id: 'settings.write',
    label: 'Write Settings',
    description: 'Modify application settings',
    category: 'settings',
  },
  'analytics.read': {
    id: 'analytics.read',
    label: 'Read Analytics',
    description: 'View analytics dashboards',
    category: 'analytics',
  },
  'billing.read': {
    id: 'billing.read',
    label: 'Read Billing',
    description: 'View billing and invoices',
    category: 'billing',
  },
  'billing.write': {
    id: 'billing.write',
    label: 'Write Billing',
    description: 'Manage subscriptions and payments',
    category: 'billing',
  },
};
