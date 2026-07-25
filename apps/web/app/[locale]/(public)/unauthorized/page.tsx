import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ErrorPageView } from '@/components/error-page-view';

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
    <ErrorPageView
      code="401"
      title={t('unauthorizedTitle')}
      description={t('unauthorizedDescription')}
      actionLabel={ta('signIn')}
      actionHref="/auth/login"
      secondaryLabel={t('backToHome')}
      secondaryHref="/"
    />
  );
}
