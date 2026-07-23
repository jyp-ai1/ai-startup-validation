import { NextResponse } from 'next/server';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const cookieStore = await import('next/headers').then((m) => m.cookies());
  const store = await cookieStore;

  const supabase = createServerClient({
    cookies: {
      getAll: () => store.getAll(),
      set: (name, value, options) => {
        store.set(name, value, options);
      },
    },
  });

  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/dashboard'}`);
}
