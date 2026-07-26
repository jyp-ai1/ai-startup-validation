'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { OperatingTimelineMilestone } from '../../lib/founder-project-state-store';

const STATUS_ICON: Record<OperatingTimelineMilestone['status'], string> = {
  done: '✔',
  running: '●',
  upcoming: '○',
};

type FounderOperatingTimelinePanelProps = {
  timeline: OperatingTimelineMilestone[];
  className?: string;
};

export function FounderOperatingTimelinePanel({
  timeline,
  className,
}: FounderOperatingTimelinePanelProps) {
  const t = useTranslations('workflow.founderAiPm.operating.timeline');

  if (timeline.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <h2 className="text-base font-semibold">{t('title')}</h2>
      <ol className="mt-4 space-y-2" role="list">
        {timeline.map((item, index) => (
          <li key={item.key} className="flex items-center gap-3">
            <span aria-hidden className="w-4 shrink-0 text-center">
              {STATUS_ICON[item.status]}
            </span>
            <span
              className={cn(
                'text-sm',
                item.status === 'running' && 'font-semibold text-primary',
                item.status === 'done' && 'text-emerald-700 dark:text-emerald-400',
                item.status === 'upcoming' && 'text-muted-foreground',
              )}
            >
              {t(`milestones.${item.key}.${item.status}`)}
            </span>
            {index < timeline.length - 1 ? (
              <span className="ml-auto text-muted-foreground" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
