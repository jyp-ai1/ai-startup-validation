'use client';

import { useTranslations } from 'next-intl';

import type { ExplainScore } from '@/features/decision';
import { CountUp } from '@/components/intelligence/count-up';

type DecisionExplainScoreProps = {
  explainScore: ExplainScore;
};

export function DecisionExplainScore({ explainScore }: DecisionExplainScoreProps) {
  const t = useTranslations('decision.explain');

  return (
    <section className="ll-consulting-card space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {t(explainScore.labelKey as 'startupReadiness')}
          </p>
          <p className="text-4xl font-semibold tabular-nums">
            <CountUp value={explainScore.total} />
            <span className="text-xl text-muted-foreground">%</span>
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {explainScore.components.map((component) => (
          <div key={component.id} className="flex items-center gap-4">
            <p className="w-32 shrink-0 text-sm text-muted-foreground">
              {t(component.labelKey as 'research')}
            </p>
            <div className="min-w-0 flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${Math.min(100, component.value)}%` }}
                />
              </div>
            </div>
            <p className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
              {component.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
