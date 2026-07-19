export type { AuthDomainUser, AuthRole, RoleDefinition } from './role';
export { AUTH_ROLES, ROLE_DEFINITIONS, hasRolePriority } from './role';

export type { Permission, PermissionDefinition } from './permission';
export { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_DEFINITIONS } from './permission';

export type {
  AuthDomainSession,
  UnauthenticatedSession,
  SessionState,
} from './session';
export { isAuthenticated } from './session';

export type { AuthOrganization, Workspace } from './organization';

export type {
  AuditEvent,
  AuditEventType,
  CreateAuditEventInput,
} from './audit-log';
export { AUDIT_EVENT_TYPES } from './audit-log';

export type { AuthDomainUser as User } from './role';
