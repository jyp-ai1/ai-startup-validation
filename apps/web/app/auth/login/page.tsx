import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LoginPanel } from '@/features/auth/components/login-panel';
import { getServerAuthUser } from '@/lib/auth/server-auth';

function isSupabaseReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

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
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? '/workspace';
  const safeNext = next.startsWith('/') ? next : '/workspace';
  const user = await getServerAuthUser();

  if (user) {
    redirect(safeNext);
  }

  const errorKey =
    params.error && params.error in ERROR_KEYS
      ? ERROR_KEYS[params.error as keyof typeof ERROR_KEYS]
      : params.error
        ? 'loginError'
        : null;

  return (
    <LoginPanel
      redirectTo={safeNext}
      errorKey={errorKey}
      supabaseReady={isSupabaseReady()}
    />
  );
}
