import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

/**
 * Refreshes Supabase auth session cookies on each request.
 * Required for session persistence after OAuth callback + page reload.
 *
 * Sprint 4.8 — set cookies on the existing response (fixes session loss with intl middleware).
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient({
    cookies: {
      getAll: () => request.cookies.getAll(),
      set: (name, value, options) => {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      },
    },
  });

  if (!supabase) return response;

  await supabase.auth.getUser();
  return response;
}
