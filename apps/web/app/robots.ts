import type { MetadataRoute } from 'next';

import { env } from '@repo/core/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dev/',
        '/auth/',
        '/dashboard',
        '/demo/',
        '/projects/',
        '/build-info',
        '/health',
        '/version',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
