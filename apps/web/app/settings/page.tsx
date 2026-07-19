import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FeatureEmptyPage } from '@/components/feature-empty-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.settings')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function SettingsPage() {
  const t = await getTranslations();

  return (
    <FeatureEmptyPage
      title={t('nav.settings')}
      description={t('nav.settingsDesc')}
      emptyTitle={t('settings.emptyTitle')}
      emptyDescription={t('settings.emptyDescription')}
    />
  );
}
