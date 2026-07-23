import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { env } from '@repo/core/env';

export async function generateLandingMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.meta');
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const title = t('title');
  const description = t('description');
  const keywords = t('keywords');

  return {
    title,
    description,
    keywords: keywords.split(',').map((k) => k.trim()),
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
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
