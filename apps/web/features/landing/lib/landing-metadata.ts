import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { env } from '@repo/core/env';
import { isAppLocale, type AppLocale } from '@repo/i18n/config';

import { buildLocaleAlternates, buildOpenGraphLocale } from '@/lib/i18n/locale-seo';

export async function generateLandingMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.meta');
  const localeRaw = await getLocale();
  const locale: AppLocale = isAppLocale(localeRaw) ? localeRaw : 'ko';
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const title = t('title');
  const description = t('description');
  const keywords = t('keywords');
  const ogLocale = buildOpenGraphLocale(locale);

  return {
    title,
    description,
    keywords: keywords.split(',').map((k) => k.trim()),
    alternates: buildLocaleAlternates(baseUrl),
    openGraph: {
      type: 'website',
      locale: ogLocale.locale,
      alternateLocale: ogLocale.alternateLocale,
      url: baseUrl,
      siteName: title,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
