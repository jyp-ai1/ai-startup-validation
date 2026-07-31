import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

import {
  clearAppAuthCookiesOnResponse,
  clearAuthCookiesOnResponse,
} from '@/lib/auth/clear-auth-cookies';

/**
 * Terminate Supabase session and clear auth cookies on the response.
 * Route handler (not Server Action) so cookie mutations attach to the redirect — same pattern as /auth/callback.
 */
async function handleLogout(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const cookieNames = cookieStore.getAll().map((c) => c.name);
  clearAuthCookiesOnResponse(cookieNames, response);

  if (isSupabaseConfigured()) {
    const supabase = createServerClient({
      cookies: {
        getAll: () => cookieStore.getAll(),
        set: (name, value, options) => {
          response.cookies.set(name, value, options);
        },
      },
    });

    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('[auth/logout] signOut failed', { message: error.message });
      }
    }
  }

  clearAuthCookiesOnResponse(cookieNames, response);
  clearAppAuthCookiesOnResponse(response);

  return response;
}

export async function GET(request: Request) {
  return handleLogout(request);
}

export async function POST(request: Request) {
  return handleLogout(request);
}
