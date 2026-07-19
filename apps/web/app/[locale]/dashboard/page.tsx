import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FeatureEmptyPage } from '@/components/feature-empty-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.dashboard')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function DashboardPage() {
  const t = await getTranslations();

  return (
    <FeatureEmptyPage
      title={t('nav.dashboard')}
      description={t('nav.dashboardDesc')}
      emptyTitle={t('dashboard.emptyTitle')}
      emptyDescription={t('dashboard.emptyDescription')}
    />
  );
}
