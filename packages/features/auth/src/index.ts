import { logger } from '@repo/core/logger';
import { getDatabasePlatform, DbTokens } from '@repo/db';
import type { AuthPort } from '@repo/db';

import { AuthorizationService } from './application/authorization.service';
import { SessionService } from './application/session.service';
import { auditLogger } from './infrastructure/audit.logger';
import { permissionChecker, permissionRegistry, permissionResolver } from './permissions';

export type AuthPlatform = {
  sessionService: SessionService;
  authorizationService: AuthorizationService;
  authPort: AuthPort;
  auditLogger: typeof auditLogger;
  permissions: {
    registry: typeof permissionRegistry;
    resolver: typeof permissionResolver;
    checker: typeof permissionChecker;
  };
};

/** Create auth platform wired to @repo/db AuthPort. */
export function createAuthPlatform(): AuthPlatform {
  const db = getDatabasePlatform();
  const authPort = db.resolve<AuthPort>(DbTokens.AuthPort);
  const log = logger.child('auth');

  return {
    sessionService: new SessionService(log, authPort),
    authorizationService: new AuthorizationService(log),
    authPort,
    auditLogger,
    permissions: {
      registry: permissionRegistry,
      resolver: permissionResolver,
      checker: permissionChecker,
    },
  };
}

let defaultPlatform: AuthPlatform | null = null;

export function getAuthPlatform(): AuthPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createAuthPlatform();
  }
  return defaultPlatform;
}

// Domain
export * from './domain';

// Permissions
export {
  PermissionRegistry,
  PermissionResolver,
  PermissionChecker,
  PermissionGuard,
  PermissionProvider,
  usePermissionContext,
  permissionRegistry,
  permissionResolver,
  permissionChecker,
  permissionGuard,
  createPermissionContext,
  ROLE_PERMISSION_MAP,
  PERMISSIONS,
} from './permissions';
export type { PermissionContext } from './permissions';

// Middleware
export * from './middleware';

// Application
export { SessionService, AuthorizationService } from './application';

// Infrastructure
export { AuditLogger, auditLogger } from './infrastructure';

// Hooks & Components
export {
  SessionProvider,
  useSession,
  useUser,
  usePermission,
  useRole,
  useSessionContext,
} from './hooks';
export { Protected, PermissionGate, RoleGate } from './components';
