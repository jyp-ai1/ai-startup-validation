import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

import { GoogleSignInButton } from '@/features/auth';
import { getServerAuthUser } from '@/lib/auth/server-auth';
import { isSupabaseConfigured } from '@repo/db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: `${t('signIn')} | LaunchLens`,
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

  if (user) {
    redirect(safeNext);
  }

  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.06] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">LaunchLens</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('tagline')}</p>
          </div>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t('loginDesc')}</p>

        {params.error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {t('loginError')}
          </p>
        ) : null}

        {!supabaseReady ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            {t('supabaseNotConfigured')}
          </p>
        ) : null}

        <div className="mt-6">
          <GoogleSignInButton redirectTo={safeNext} className="h-11 w-full rounded-xl" />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {t('demoHint')}{' '}
          <Link
            href="/demo/enter"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            {t('demoLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
