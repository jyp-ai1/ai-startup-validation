'use client';

import { CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ExecutionRoadmapItem } from '../../lib/founder-intelligence-engine';

type ExecutionRoadmapPanelProps = {
  items: ExecutionRoadmapItem[];
};

const HORIZON_ORDER: ExecutionRoadmapItem['horizon'][] = [
  'today',
  'week',
  'month',
  'quarter',
  'investment',
];

export function ExecutionRoadmapPanel({ items }: ExecutionRoadmapPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.execution');

  const sorted = [...items].sort(
    (a, b) => HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon),
  );

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5" aria-label={t('label')}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('label')}
      </p>
      <ol className="mt-4 space-y-3" role="list">
        {sorted.map((item, index) => (
          <li
            key={`${item.horizon}-${index}`}
            className={cn(
              'rounded-xl border px-4 py-3',
              item.horizon === 'today'
                ? 'border-primary/40 bg-primary/[0.06]'
                : 'border-border/60 bg-muted/20',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t(`horizons.${item.horizon}`)}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" aria-hidden />
                {t('minutes', { count: item.etaMinutes })}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium sm:text-base">{item.title}</p>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{t('confidenceImpact', { gain: item.confidenceImpact })}</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" aria-hidden />
                {t(`criteria.${item.completionCriteriaKey}`)}
              </span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
