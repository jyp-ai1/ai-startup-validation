import type { MetadataRoute } from 'next';

import { env } from '@repo/core/env';

/** Public marketing/legal pages only — app routes are noindex via page metadata. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const paths = ['/', '/about', '/privacy', '/terms'];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '/' ? 1 : 0.5,
  }));
}
