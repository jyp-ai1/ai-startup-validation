import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

function loginRedirect(origin: string, next: string, errorCode = 'auth') {
  const params = new URLSearchParams();
  params.set('error', errorCode);
  if (next) params.set('next', next);
  const query = params.toString();
  return `${origin}/auth/login${query ? `?${query}` : ''}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  const oauthError = searchParams.get('error');

  if (oauthError === 'access_denied') {
    return NextResponse.redirect(loginRedirect(origin, safeNext, 'cancelled'));
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(loginRedirect(origin, safeNext, 'config'));
  }

  if (!code) {
    return NextResponse.redirect(loginRedirect(origin, safeNext, oauthError ? 'auth' : 'cancelled'));
  }

  const cookieStore = await cookies();
  const redirectUrl = new URL(`${origin}${safeNext}`);
  redirectUrl.searchParams.set('auth', 'complete');
  const response = NextResponse.redirect(redirectUrl.toString());

  const supabase = createServerClient({
    cookies: {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        response.cookies.set(name, value, options);
      },
    },
  });

  if (!supabase) {
    return NextResponse.redirect(loginRedirect(origin, safeNext, 'config'));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginRedirect(origin, safeNext, 'session'));
  }

  return response;
}
