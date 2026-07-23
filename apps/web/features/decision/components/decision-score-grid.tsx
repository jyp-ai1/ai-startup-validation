'use client';

import { useTranslations } from 'next-intl';

import type { DecisionScores } from '@/features/decision';
import { CountUp } from '@/components/intelligence/count-up';

type DecisionScoreGridProps = {
  scores: DecisionScores;
  compact?: boolean;
};

export function DecisionScoreGrid({ scores, compact = false }: DecisionScoreGridProps) {
  const t = useTranslations('decision.scores');

  const items = [
    { label: t('decisionScore'), value: scores.decisionScore },
    { label: t('confidence'), value: scores.confidence },
    { label: t('investmentReadiness'), value: scores.investmentReadiness },
    { label: t('executionReadiness'), value: scores.executionReadiness },
  ];

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-2 gap-4 sm:grid-cols-4'
          : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
      }
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/60 bg-card px-5 py-4"
        >
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p
            className={
              compact
                ? 'mt-1 text-2xl font-semibold tabular-nums'
                : 'mt-2 text-4xl font-semibold tabular-nums tracking-tight'
            }
          >
            <CountUp value={item.value} />
            <span className="text-lg text-muted-foreground">%</span>
          </p>
        </div>
      ))}
    </div>
  );
}
