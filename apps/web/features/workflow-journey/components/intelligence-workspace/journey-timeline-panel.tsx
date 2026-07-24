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
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('desc')}</p>
      <ol className="mt-5 space-y-4">
        {DECISION_TIMELINE.map((entry) => {
          const Icon = ICONS[entry.type];
          return (
            <li key={entry.id} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 border-l border-border/50 pl-3">
                <p className="text-sm font-medium">{t(`entries.${entry.labelKey}`)}</p>
                {entry.value ? (
                  <p className="text-xs text-primary">{entry.value}</p>
                ) : null}
                <time className="mt-0.5 block text-[11px] text-muted-foreground">
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
