import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

import { GoogleSignInButton } from '@/features/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';
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
  const next = params.next ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  const user = await getServerAuthUser();
  const t = await getTranslations('auth');
  const tm = await getTranslations('meta');

  if (user) {
    redirect(safeNext);
  }

  const supabaseReady = isSupabaseReady();
  const errorKey =
    params.error && params.error in ERROR_KEYS
      ? ERROR_KEYS[params.error as keyof typeof ERROR_KEYS]
      : params.error
        ? 'loginError'
        : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 sm:px-6">
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{tm('appName')}</h1>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{t('loginDesc')}</p>

        {errorKey ? (
          <p
            className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            role="alert"
          >
            {t(errorKey)}
          </p>
        ) : null}

        {!supabaseReady && !errorKey ? (
          <p
            className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            role="status"
          >
            {t('supabaseNotConfigured')}
          </p>
        ) : null}

        <div className="mt-6">
          <GoogleSignInButton redirectTo={safeNext} className="h-11 w-full rounded-xl" />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('demoHint')}{' '}
          <Link
            href="/demo/enter"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {t('demoLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
