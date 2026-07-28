import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { createServerClient, isSupabaseConfigured, isSupabaseBrowserConfigured } from '@repo/db';

import { LoginPanel } from '@/features/auth/components/login-panel';
import { getServerAuthUser } from '@/lib/auth/server-auth';

const ERROR_KEYS = {
  auth: 'loginError',
  cancelled: 'loginCancelled',
  session: 'loginSessionError',
  config: 'supabaseNotConfigured',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const tm = await getTranslations('meta');
  return {
    title: `${t('signIn')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; signed_out?: string }>;
};

async function purgeStaleSessionCookies(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const cookieStore = await cookies();
  const supabase = createServerClient({
    cookies: {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* route-only mutation */
        }
      },
    },
  });

  if (supabase) {
    await supabase.auth.signOut({ scope: 'global' });
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? '/workspace';
  const safeNext = next.startsWith('/') ? next : '/workspace';
  const signedOut = params.signed_out === '1';

  if (signedOut) {
    await purgeStaleSessionCookies();
  }

  const user = signedOut ? null : await getServerAuthUser();

  if (user) {
    redirect(safeNext);
  }

  const errorParam = params.error;
  const errorKey =
    errorParam && errorParam in ERROR_KEYS
      ? ERROR_KEYS[errorParam as keyof typeof ERROR_KEYS]
      : errorParam
        ? 'loginError'
        : null;

  return (
    <LoginPanel
      redirectTo={safeNext}
      errorKey={errorKey}
      signedOut={signedOut}
      supabaseReady={isSupabaseBrowserConfigured()}
    />
  );
}
