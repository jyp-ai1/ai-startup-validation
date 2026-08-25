import type { MetadataRoute } from 'next';

import { env } from '@repo/core/env';

import { BRAND_CONFIG } from '@/lib/brand/brand-config';

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    name: BRAND_CONFIG.displayName,
    short_name: BRAND_CONFIG.shortName,
    description: `${BRAND_CONFIG.tagline} ${BRAND_CONFIG.secondaryTagline}`,
    start_url: baseUrl,
    display: 'standalone',
    background_color: '#0f1419',
    theme_color: '#0f1419',
    lang: 'ko',
    icons: [
      {
        src: BRAND_CONFIG.favicon,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
