import { BaseService } from '@repo/core/service';
import { UnauthorizedError } from '@repo/core/errors';
import type { Logger } from '@repo/core/logger';
import type { AuthPort } from '@repo/db';
import type { AuthSession } from '@repo/db';

import type { SessionState } from '../domain/session';
import { isAuthenticated } from '../domain/session';

/** Authentication application service — wraps AuthPort (Supabase). */
export class SessionService extends BaseService {
  constructor(
    logger: Logger,
    private readonly authPort: AuthPort,
  ) {
    super(logger);
  }

  async getSession(): Promise<SessionState> {
    const session = await this.authPort.getSession();
    if (!session) {
      return { isAuthenticated: false };
    }
    return {
      isAuthenticated: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      userId: session.userId,
    };
  }

  async refreshSession(): Promise<SessionState> {
    const session = await this.authPort.refresh();
    this.logInfo('Session refreshed', { userId: session.userId });
    return {
      isAuthenticated: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      userId: session.userId,
    };
  }

  async logout(): Promise<void> {
    await this.authPort.logout();
    this.logInfo('User logged out');
  }

  mapPortSession(session: AuthSession): SessionState {
    return {
      isAuthenticated: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      userId: session.userId,
    };
  }

  assertAuthenticated(session: SessionState): asserts session is Extract<
    SessionState,
    { isAuthenticated: true }
  > {
    if (!isAuthenticated(session)) {
      throw new UnauthorizedError('Session is not authenticated');
    }
  }
}
