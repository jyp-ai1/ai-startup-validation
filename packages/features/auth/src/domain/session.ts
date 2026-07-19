import type { ID, ISODateString } from '@repo/types';

import type { AuthRole } from './role';

/** Authenticated session — authentication layer (Who are you?). */
export type AuthDomainSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: ISODateString;
  userId: ID;
  isAuthenticated: true;
};

export type UnauthenticatedSession = {
  isAuthenticated: false;
};

export type SessionState = AuthDomainSession | UnauthenticatedSession;

export function isAuthenticated(
  session: SessionState,
): session is AuthDomainSession {
  return session.isAuthenticated === true;
}
