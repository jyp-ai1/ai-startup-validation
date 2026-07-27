'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type V2ReviewSummaryProps = {
  reviewCount: number;
  className?: string;
};

export function V2ReviewSummary({ reviewCount, className }: V2ReviewSummaryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.reviewSummary');

  if (reviewCount === 0) return null;

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/5 p-4', className)}>
      <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            {t('goodTitle')}
          </dt>
          <dd className="mt-1 leading-relaxed">{t('goodBody')}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
            {t('riskTitle')}
          </dt>
          <dd className="mt-1 leading-relaxed text-muted-foreground">{t('riskBody')}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('needsTitle')}
          </dt>
          <dd className="mt-1 leading-relaxed text-muted-foreground">{t('needsBody')}</dd>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            {t('aiRecommendTitle')}
          </dt>
          <dd className="mt-1 font-medium leading-relaxed">{t('aiRecommendBody')}</dd>
        </div>
      </dl>
    </div>
  );
}
