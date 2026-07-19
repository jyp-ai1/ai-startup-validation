import type { ID, ISODateString } from '@repo/types';

/** Authenticated session snapshot. */
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: ISODateString;
  userId: ID;
};

/** Sign-in credentials. */
export type LoginCredentials = {
  email: string;
  password: string;
};

/** Sign-up payload. */
export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string | null;
};

/** Password reset request. */
export type ResetPasswordInput = {
  email: string;
};

/** Email verification payload. */
export type VerifyEmailInput = {
  token: string;
  type: 'signup' | 'recovery' | 'email_change';
};

/** Auth user snapshot (adapter-level, may differ from domain User). */
export type AuthUser = {
  id: ID;
  email: string;
  emailVerified: boolean;
  metadata: Record<string, unknown>;
};
