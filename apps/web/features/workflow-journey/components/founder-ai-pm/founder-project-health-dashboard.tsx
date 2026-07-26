'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { BusinessProgressDimension } from '../../lib/founder-intelligence-engine';
import type { FounderBehaviorProfile } from '../../lib/founder-behavior-store';

type FounderProjectHealthDashboardProps = {
  successScore: number;
  businessProgress: BusinessProgressDimension[];
  behavior: FounderBehaviorProfile | null;
  className?: string;
};

const DIMENSION_KEYS = ['market', 'customer', 'pricing', 'investment'] as const;

export function FounderProjectHealthDashboard({
  successScore,
  businessProgress,
  behavior,
  className,
}: FounderProjectHealthDashboardProps) {
  const t = useTranslations('workflow.founderAiPm.operating.health');

  const snapshots = behavior?.scoreSnapshots ?? [];
  const weekAgo = snapshots.length >= 2 ? snapshots[snapshots.length - 2]!.score : successScore - 6;
  const weekDelta = successScore - weekAgo;

  const mvpPercent = Math.min(
    100,
    Math.round(
      ((businessProgress.find((d) => d.key === 'customer')?.percent ?? 0) +
        (businessProgress.find((d) => d.key === 'pricing')?.percent ?? 0)) /
        2,
    ),
  );

  const bars = [
    ...DIMENSION_KEYS.map((key) => ({
      key,
      percent: businessProgress.find((d) => d.key === key)?.percent ?? 0,
    })),
    { key: 'mvp' as const, percent: mvpPercent },
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-sm font-medium text-muted-foreground">{t('scoreLabel')}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">{successScore}%</p>

      <div className="my-5 h-px bg-border/70" aria-hidden />

      <ul className="space-y-3" role="list">
        {bars.map((bar) => (
          <li key={bar.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{t(`dimensions.${bar.key}`)}</span>
              <span className="tabular-nums text-muted-foreground">{bar.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${bar.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="my-5 h-px bg-border/70" aria-hidden />

      <p className="text-sm text-muted-foreground">
        {t('weekDelta', { delta: weekDelta > 0 ? `+${weekDelta}` : `${weekDelta}` })}
      </p>
    </section>
  );
}
