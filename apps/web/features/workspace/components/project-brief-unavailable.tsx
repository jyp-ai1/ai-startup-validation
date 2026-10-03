import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@repo/ui';

export async function ProjectBriefUnavailable() {
  const t = await getTranslations('projectBrief');
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 sm:py-10" data-testid="project-brief-unavailable">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <h1 className="text-base font-medium">{t('unavailable.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('unavailable.body')}</p>
      </div>
      <Button asChild size="lg" className="h-12 w-full">
        <Link href="/workspace">{t('unavailable.cta')}</Link>
      </Button>
    </div>
  );
}
