'use client';

import { GitBranch, LineChart, Milestone, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DECISION_TIMELINE } from '@/features/project-intelligence/constants/timeline-mock';
import { formatRelativeTime } from '@repo/utils/date';

const ICONS = {
  decision: GitBranch,
  confidence: LineChart,
  activity: Zap,
  milestone: Milestone,
} as const;

export function JourneyTimelinePanel() {
  const t = useTranslations('workflow.epic3.timeline');

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 lg:p-8">
      <h3 className="text-base font-semibold tracking-tight sm:text-lg">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
      <ol className="mt-6 space-y-0">
        {DECISION_TIMELINE.map((entry, index) => {
          const Icon = ICONS[entry.type];
          const isLast = index === DECISION_TIMELINE.length - 1;
          return (
            <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[15px] top-9 h-[calc(100%-12px)] w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted shadow-sm">
                <Icon className="size-3.5 text-primary" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <p className="text-sm font-semibold">{t(`entries.${entry.labelKey}`)}</p>
                {entry.value ? (
                  <p className="mt-1 text-xs font-medium text-primary">{entry.value}</p>
                ) : null}
                <time className="mt-2 block text-[11px] text-muted-foreground">
                  {formatRelativeTime(new Date(entry.at))}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
