import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  ResetPasswordInput,
  SignUpInput,
  VerifyEmailInput,
} from '../types/auth.types';

/** Port — authentication operations (hexagonal). */
export interface AuthPort {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  refresh(): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
  createUser(input: SignUpInput): Promise<AuthUser>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  verifyEmail(input: VerifyEmailInput): Promise<void>;
}

export type { AuthSession, AuthUser, LoginCredentials, SignUpInput };
