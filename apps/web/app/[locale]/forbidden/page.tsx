import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ErrorPageView } from '@/components/error-page-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('errors');
  return {
    title: t('forbiddenTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function ForbiddenPage() {
  const t = await getTranslations('errors');

  return (
    <ErrorPageView
      code="403"
      title={t('forbiddenTitle')}
      description={t('forbiddenDescription')}
      actionLabel={t('backToDashboard')}
      actionHref="/dashboard"
      secondaryLabel={t('backToHome')}
      secondaryHref="/"
    />
  );
}
