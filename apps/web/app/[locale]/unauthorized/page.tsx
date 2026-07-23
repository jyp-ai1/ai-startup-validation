import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@repo/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('errors');
  return {
    title: t('unauthorizedTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function UnauthorizedPage() {
  const t = await getTranslations('errors');
  const ta = await getTranslations('auth');

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">401</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('unauthorizedTitle')}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('unauthorizedDescription')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/auth/login">{ta('signIn')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('backToHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
