import type { MetadataRoute } from 'next';

import { env } from '@repo/core/env';

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    name: 'LaunchLens',
    short_name: 'LaunchLens',
    description: 'AI Strategy Consultant — research, validation, and executive reports.',
    start_url: baseUrl,
    display: 'standalone',
    background_color: '#0f1419',
    theme_color: '#0f1419',
    lang: 'ko',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
