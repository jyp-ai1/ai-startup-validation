import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { isSupabaseBrowserConfigured } from '@repo/db';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { QaPasswordLoginForm } from '@/features/auth/components/qa-password-login-form';
import { AlabomLogo } from '@/lib/brand/alabom-logo';
import { getServerAuthUser } from '@/lib/auth/server-auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const tm = await getTranslations('meta');
  return {
    title: `${t('qaSignIn')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type QaLoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function QaLoginPage({ searchParams }: QaLoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? '/workspace';
  const safeNext = next.startsWith('/') ? next : '/workspace';
  const t = await getTranslations('auth');
  const user = await getServerAuthUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 sm:px-6">
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-8">
        <div className="space-y-2">
          <h1>
            <AlabomLogo withWordmark withKorean markClassName="size-10" />
          </h1>
          <p className="text-sm text-muted-foreground">{t('qaLoginDesc')}</p>
        </div>
        {isSupabaseBrowserConfigured() ? (
          <QaPasswordLoginForm redirectTo={safeNext} />
        ) : (
          <p className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
            {t('supabaseNotConfigured')}
          </p>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/auth/login" className="font-medium text-foreground underline-offset-2 hover:underline">
            {t('continueWithGoogle')}
          </Link>
        </p>
      </div>
    </main>
  );
}
