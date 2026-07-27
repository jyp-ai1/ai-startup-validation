'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { MOCK_REVIEW_SUMMARY } from '../../lib/v2-project-health';

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
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>{t(`lines.${MOCK_REVIEW_SUMMARY.leadKey}`)}</p>
        <p>{t(`lines.${MOCK_REVIEW_SUMMARY.caveatKey}`)}</p>
        <p>{t(`lines.${MOCK_REVIEW_SUMMARY.recommendationKey}`)}</p>
      </div>
    </div>
  );
}
