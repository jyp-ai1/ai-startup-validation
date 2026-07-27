'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type V2ReviewSummaryProps = {
  reviewCount: number;
  className?: string;
};

export function V2ReviewSummary({ reviewCount, className }: V2ReviewSummaryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.reviewSummary');

  if (reviewCount === 0) return null;

  return (
    <section id="review-summary" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>

      <div className="space-y-4 rounded-xl border border-border/40 bg-muted/5 p-4">
        <div>
          <p className="text-sm font-medium">{t('goodTitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('goodBody')}</p>
        </div>
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm font-medium">{t('riskTitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('riskBody')}</p>
        </div>
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm font-medium">{t('needsTitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('needsBody')}</p>
        </div>
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm font-medium">{t('aiRecommendTitle')}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-primary">{t('aiRecommendBody')}</p>
        </div>
      </div>
    </section>
  );
}
