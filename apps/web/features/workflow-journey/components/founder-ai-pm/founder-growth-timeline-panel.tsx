'use client';

import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderBehaviorProfile } from '../../lib/founder-behavior-store';
import { getFounderTimeline } from '../../lib/founder-behavior-store';

type FounderGrowthTimelinePanelProps = {
  behavior: FounderBehaviorProfile | null;
  className?: string;
};

export function FounderGrowthTimelinePanel({ behavior, className }: FounderGrowthTimelinePanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.timeline');
  const entries = getFounderTimeline(behavior);

  if (entries.length < 2) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <TrendingUp className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <ol className="mt-5 space-y-4" role="list">
        {entries.map((entry, index) => (
          <li key={entry.month} className="relative flex gap-4 pl-1">
            {index < entries.length - 1 ? (
              <span
                className="absolute left-[7px] top-6 h-[calc(100%+4px)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span className="mt-1 size-3.5 shrink-0 rounded-full border-2 border-primary bg-background" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{entry.month}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {entry.score}%
              </p>
              {entry.milestone ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`milestones.${entry.milestone}`)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
