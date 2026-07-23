import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

function loginRedirect(origin: string, next: string, error = true) {
  const params = new URLSearchParams();
  if (error) params.set('error', 'auth');
  if (next) params.set('next', next);
  const query = params.toString();
  return `${origin}/auth/login${query ? `?${query}` : ''}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(loginRedirect(origin, safeNext));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient({
    cookies: {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        response.cookies.set(name, value, options);
      },
    },
  });

  if (!supabase) {
    return NextResponse.redirect(loginRedirect(origin, safeNext));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginRedirect(origin, safeNext));
  }

  return response;
}
