import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { env } from '@repo/core/env';
import { isAppLocale, type AppLocale } from '@repo/i18n/config';

import { buildLocaleAlternates, buildOpenGraphLocale } from '@/lib/i18n/locale-seo';

type BuildPageMetadataOptions = {
  titleKey: string;
  descriptionKey?: string;
  namespace?: string;
  path?: string;
  index?: boolean;
};

export async function buildPageMetadata({
  titleKey,
  descriptionKey,
  namespace = 'meta',
  path = '',
  index = false,
}: BuildPageMetadataOptions): Promise<Metadata> {
  const t = await getTranslations(namespace);
  const tm = await getTranslations('meta');
  const localeRaw = await getLocale();
  const locale: AppLocale = isAppLocale(localeRaw) ? localeRaw : 'ko';
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const title = t(titleKey);
  const description = descriptionKey ? t(descriptionKey) : tm('appDescription');
  const ogLocale = buildOpenGraphLocale(locale);
  const fullTitle = `${title} | ${tm('titleSuffix')}`;

  return {
    title: fullTitle,
    description,
    alternates: buildLocaleAlternates(baseUrl, path),
    openGraph: {
      type: 'website',
      locale: ogLocale.locale,
      alternateLocale: ogLocale.alternateLocale,
      url: `${baseUrl.replace(/\/$/, '')}${path}`,
      siteName: tm('appName'),
      title: fullTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
    robots: {
      index,
      follow: index,
    },
  };
}
