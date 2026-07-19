import { UnauthorizedError } from '@repo/core/errors';

import type { AuthDomainSession, SessionState } from '../domain/session';
import { isAuthenticated } from '../domain/session';

/** Require authenticated session — use in API routes and server actions. */
export function requireLogin(session: SessionState): asserts session is AuthDomainSession {
  if (!isAuthenticated(session)) {
    throw new UnauthorizedError('Login required');
  }
}

/** Wrap handler — loads session externally, enforces login. */
export function withRequireLogin<R>(
  getSession: () => Promise<SessionState>,
  handler: (session: AuthDomainSession) => R | Promise<R>,
): () => Promise<R> {
  return async () => {
    const session = await getSession();
    requireLogin(session);
    return handler(session);
  };
}
