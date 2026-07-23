'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

type StrategyEmptyStateProps = {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  primaryLabelKey: string;
  primaryHref: string;
  sampleLabelKey?: string;
  sampleHref?: string;
  namespace?: string;
};

export function StrategyEmptyState({
  icon: Icon,
  titleKey,
  descriptionKey,
  primaryLabelKey,
  primaryHref,
  sampleLabelKey,
  sampleHref,
  namespace = 'strategyWorkspace',
}: StrategyEmptyStateProps) {
  const t = useTranslations(namespace);

  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-8" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">{t(titleKey as 'empty.defaultTitle')}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t(descriptionKey as 'empty.defaultDesc')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={primaryHref}>{t(primaryLabelKey as 'empty.start')}</Link>
        </Button>
        {sampleLabelKey && sampleHref ? (
          <Button variant="outline" asChild>
            <Link href={sampleHref}>{t(sampleLabelKey as 'empty.sample')}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
