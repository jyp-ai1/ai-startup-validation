import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '@repo/core/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { AuthPort } from '../../../auth/auth.port';
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  ResetPasswordInput,
  SignUpInput,
  VerifyEmailInput,
} from '../../../types/auth.types';
import { getBrowserClient } from '../browser';
import { getServerClient } from '../server';

function mapSession(
  session: NonNullable<
    Awaited<
      ReturnType<SupabaseClient['auth']['getSession']>
    >['data']['session']
  >,
): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date(session.expires_at! * 1000).toISOString(),
    userId: session.user.id,
  };
}

function mapUser(user: { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    emailVerified: Boolean(user.email_confirmed_at),
    metadata: user.user_metadata ?? {},
  };
}

type SupabaseAuthAdapterOptions = {
  /** Prefer server client when available (API routes). */
  preferServer?: boolean;
};

/** Supabase implementation of AuthPort. */
export class SupabaseAuthAdapter implements AuthPort {
  private readonly preferServer: boolean;

  constructor(options: SupabaseAuthAdapterOptions = {}) {
    this.preferServer = options.preferServer ?? false;
  }

  private getClient(): SupabaseClient {
    if (this.preferServer) {
      try {
        return getServerClient();
      } catch {
        return getBrowserClient();
      }
    }
    return getBrowserClient();
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data, error } = await this.getClient().auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new UnauthorizedError(error.message);
    }
    if (!data.session) {
      throw new UnauthorizedError('Login failed — no session returned');
    }

    return mapSession(data.session);
  }

  async logout(): Promise<void> {
    const { error } = await this.getClient().auth.signOut();
    if (error) {
      throw new InternalServerError(error.message);
    }
  }

  async refresh(): Promise<AuthSession> {
    const { data, error } = await this.getClient().auth.refreshSession();
    if (error || !data.session) {
      throw new UnauthorizedError(error?.message ?? 'Unable to refresh session');
    }
    return mapSession(data.session);
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.getClient().auth.getSession();
    if (error) {
      throw new InternalServerError(error.message);
    }
    return data.session ? mapSession(data.session) : null;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data, error } = await this.getClient().auth.getUser();
    if (error) {
      throw new UnauthorizedError(error.message);
    }
    return data.user ? mapUser(data.user) : null;
  }

  async createUser(input: SignUpInput): Promise<AuthUser> {
    const { data, error } = await this.getClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName ?? null },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new ConflictError('Email already registered');
      }
      throw new InternalServerError(error.message);
    }
    if (!data.user) {
      throw new InternalServerError('Sign up failed — no user returned');
    }

    return mapUser(data.user);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { error } = await this.getClient().auth.resetPasswordForEmail(
      input.email,
    );
    if (error) {
      throw new InternalServerError(error.message);
    }
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const { error } = await this.getClient().auth.verifyOtp({
      token_hash: input.token,
      type: input.type,
    });
    if (error) {
      throw new InternalServerError(error.message);
    }
  }
}
