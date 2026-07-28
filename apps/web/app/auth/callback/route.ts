import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

import {
  mapCallbackErrorToOAuthCode,
  recordOAuthFailure,
  recordOAuthSuccess,
} from '@/lib/auth/oauth-analytics';
import { WORKSPACE_MODE_COOKIE } from '@/lib/auth/server-auth';

function loginRedirect(origin: string, next: string, errorCode = 'auth') {
  const params = new URLSearchParams();
  params.set('error', errorCode);
  if (next) params.set('next', next);
  const query = params.toString();
  return `${origin}/auth/login${query ? `?${query}` : ''}`;
}

function logCallbackError(phase: string, error: unknown, context: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('[auth/callback] unhandled error', {
    phase,
    message: err.message,
    stack: err.stack,
    name: err.name,
    ...context,
  });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/workspace';
  const safeNext = next.startsWith('/') ? next : '/workspace';
  const oauthError = searchParams.get('error');
  const promoteDemo = safeNext.includes('promote=1');

  try {
    if (oauthError === 'access_denied') {
      recordOAuthFailure({
        errorCode: 'access_denied',
        next: safeNext,
        message: oauthError,
      });
      return NextResponse.redirect(loginRedirect(origin, safeNext, 'cancelled'));
    }

    if (!isSupabaseConfigured()) {
      recordOAuthFailure({ errorCode: 'config_missing', next: safeNext });
      return NextResponse.redirect(loginRedirect(origin, safeNext, 'config'));
    }

    if (!code) {
      const mapped = oauthError ? mapCallbackErrorToOAuthCode('auth') : 'access_denied';
      recordOAuthFailure({
        errorCode: mapped,
        next: safeNext,
        message: oauthError ?? 'missing_code',
      });
      return NextResponse.redirect(
        loginRedirect(origin, safeNext, oauthError ? 'auth' : 'cancelled'),
      );
    }

    let cookieStore: Awaited<ReturnType<typeof cookies>>;
    try {
      cookieStore = await cookies();
    } catch (error) {
      logCallbackError('cookies', error, { safeNext });
      throw error;
    }

    const redirectUrl = new URL(`${origin}${safeNext}`);
    redirectUrl.searchParams.set('auth', 'complete');
    const response = NextResponse.redirect(redirectUrl.toString());

    let supabase: ReturnType<typeof createServerClient>;
    try {
      supabase = createServerClient({
        cookies: {
          getAll: () => cookieStore.getAll(),
          set: (name, value, options) => {
            response.cookies.set(name, value, options);
          },
        },
      });
    } catch (error) {
      logCallbackError('createServerClient', error, { safeNext });
      throw error;
    }

    if (!supabase) {
      recordOAuthFailure({ errorCode: 'config_missing', next: safeNext });
      return NextResponse.redirect(loginRedirect(origin, safeNext, 'config'));
    }

    let exchangeError: { message: string } | null = null;
    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      exchangeError = result.error;
    } catch (error) {
      logCallbackError('exchangeCodeForSession', error, { safeNext, hasCode: Boolean(code) });
      recordOAuthFailure({
        errorCode: 'exchange_failed',
        next: safeNext,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.redirect(loginRedirect(origin, safeNext, 'session'));
    }

    if (exchangeError) {
      const errorCode = mapCallbackErrorToOAuthCode('session', exchangeError.message);
      console.error('[auth/callback] exchangeCodeForSession returned error', {
        message: exchangeError.message,
        safeNext,
      });
      recordOAuthFailure({
        errorCode,
        next: safeNext,
        message: exchangeError.message,
      });
      return NextResponse.redirect(loginRedirect(origin, safeNext, 'session'));
    }

    response.cookies.delete(WORKSPACE_MODE_COOKIE);
    response.cookies.delete('ACTIVE_PROJECT_ID');

    try {
      recordOAuthSuccess({
        next: safeNext,
        durationMs: Date.now() - startedAt,
        promoted: promoteDemo,
      });
    } catch (error) {
      logCallbackError('recordOAuthSuccess', error, { safeNext });
      /* analytics must not block auth redirect */
    }

    console.info('[auth/callback] session established', {
      safeNext,
      durationMs: Date.now() - startedAt,
      promoted: promoteDemo,
    });

    return response;
  } catch (error) {
    logCallbackError('GET', error, { safeNext, hasCode: Boolean(code) });
    recordOAuthFailure({
      errorCode: 'unknown',
      next: safeNext,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(loginRedirect(origin, safeNext, 'session'));
  }
}
