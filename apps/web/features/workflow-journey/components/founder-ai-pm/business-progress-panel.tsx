'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { BusinessProgressDimension } from '../../lib/founder-intelligence-engine';

type BusinessProgressPanelProps = {
  dimensions: BusinessProgressDimension[];
  className?: string;
};

export function BusinessProgressPanel({ dimensions, className }: BusinessProgressPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.businessProgress');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <ul className="mt-5 space-y-4" role="list">
        {dimensions.map((dimension) => (
          <li key={dimension.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{t(`dimensions.${dimension.key}`)}</span>
              <span className="tabular-nums font-semibold text-primary">{dimension.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${dimension.percent}%` }}
                role="progressbar"
                aria-valuenow={dimension.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(`dimensions.${dimension.key}`)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
