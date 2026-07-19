import { logger as appLogger } from '@repo/core/logger';
import type { Logger } from '@repo/core/logger';

import type {
  AuditEvent,
  AuditEventType,
  CreateAuditEventInput,
} from '../domain/audit-log';

/** Audit logger — records security-sensitive events (persist layer in Sprint 5+). */
export class AuditLogger {
  private readonly buffer: AuditEvent[] = [];

  constructor(private readonly logger: Logger = appLogger.child('audit')) {}

  async log(input: CreateAuditEventInput): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.buffer.push(event);
    this.logger.info(`audit:${input.type}`, {
      actorId: input.actorId,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });

    return event;
  }

  async logAuthEvent(
    type: Extract<
      AuditEventType,
      'auth.login' | 'auth.logout' | 'auth.session_refresh' | 'auth.permission_denied'
    >,
    actorId: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<AuditEvent> {
    return this.log({
      type,
      actorId,
      organizationId: null,
      resourceType: 'session',
      resourceId: null,
      metadata,
      ipAddress: null,
      userAgent: null,
    });
  }

  /** In-memory events (dev/test) — replace with repository in production. */
  getEvents(): AuditEvent[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

export const auditLogger = new AuditLogger();
