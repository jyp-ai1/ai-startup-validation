import type { ID, ISODateString } from '@repo/types';

/** Audit event types for security-sensitive actions. */
export const AUDIT_EVENT_TYPES = [
  'auth.login',
  'auth.logout',
  'auth.session_refresh',
  'auth.permission_denied',
  'auth.role_changed',
  'user.created',
  'user.updated',
  'user.deleted',
  'organization.created',
  'organization.updated',
  'settings.changed',
  'billing.updated',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type AuditEvent = {
  id: ID;
  type: AuditEventType;
  actorId: ID | null;
  organizationId: ID | null;
  resourceType: string | null;
  resourceId: ID | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: ISODateString;
};

export type CreateAuditEventInput = Omit<AuditEvent, 'id' | 'createdAt'>;
