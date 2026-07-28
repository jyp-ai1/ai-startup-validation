import type { NextResponse } from 'next/server';

/** Supabase SSR auth cookies — sb-<project-ref>-auth-token (+ chunks). */
export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith('sb-') && name.includes('auth-token');
}

export function clearAuthCookiesOnResponse(
  cookieNames: Iterable<string>,
  response: NextResponse,
): void {
  for (const name of cookieNames) {
    if (isSupabaseAuthCookie(name)) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }
}

export const APP_AUTH_COOKIES = ['WORKSPACE_MODE', 'ACTIVE_PROJECT_ID'] as const;

export function clearAppAuthCookiesOnResponse(response: NextResponse): void {
  for (const name of APP_AUTH_COOKIES) {
    response.cookies.delete(name);
  }
}
