import type { MetadataRoute } from 'next';

import { env } from '@repo/core/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const paths = [
    '/dashboard',
    '/projects',
    '/settings',
    '/research',
    '/evidence',
    '/voc',
    '/competitors',
    '/government-grants',
    '/reports',
    '/validation-score',
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/dashboard' ? 1 : 0.7,
  }));
}
