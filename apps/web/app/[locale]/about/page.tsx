import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { BetaBadge } from '@/components/beta-badge';
import { getBuildInfo } from '@/lib/analytics/server/build-info';
import { SITE_LINKS } from '@/lib/site/beta-config';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return { title: t('title') };
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  const build = getBuildInfo();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6">
        <BetaBadge />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">{t('desc')}</p>

      <dl className="mt-10 space-y-4 rounded-xl border border-border/60 bg-card p-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('version')}</dt>
          <dd className="font-mono">{build.version}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('commit')}</dt>
          <dd className="font-mono text-xs">{build.commit.slice(0, 7)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('environment')}</dt>
          <dd>{build.environment}</dd>
        </div>
      </dl>

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <a href={`mailto:${SITE_LINKS.email}`} className="text-primary hover:underline">
          {t('contact')}
        </a>
        <a href={SITE_LINKS.github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          GitHub
        </a>
        <Link href="/privacy" className="text-primary hover:underline">
          {t('privacy')}
        </Link>
        <Link href="/terms" className="text-primary hover:underline">
          {t('terms')}
        </Link>
      </div>
    </div>
  );
}
