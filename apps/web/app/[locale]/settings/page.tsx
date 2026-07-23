import type { Metadata } from 'next';
import Link from 'next/link';
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
    <>
      <FeatureEmptyPage
        title={t('nav.settings')}
        description={t('nav.settingsDesc')}
        emptyTitle={t('settings.emptyTitle')}
        emptyDescription={t('settings.emptyDescription')}
      />
      <div className="mt-4">
        <Link
          href="/dev/localization"
          className="text-sm text-primary hover:underline"
        >
          {t('settings.localizationTestLink')}
        </Link>
      </div>
    </>
  );
}
