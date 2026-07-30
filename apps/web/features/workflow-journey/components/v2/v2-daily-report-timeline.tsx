'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DailyReportEntry } from '../../lib/v2-investigation-types';
import { formatRelativeMinutesAgo } from '../../lib/format-relative-time';

type V2DailyReportTimelineProps = {
  entries: DailyReportEntry[];
  reportDate: string;
  namespace?: 'investigation' | 'investigationSample';
  className?: string;
};

export function V2DailyReportTimeline({
  entries,
  reportDate,
  namespace = 'investigationSample',
  className,
}: V2DailyReportTimelineProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}.dailyReport`);
  const tRelative = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}`);

  const relativeLabels = {
    justNow: tRelative('relative.justNow'),
    minutesAgo: (minutes: number) => tRelative('relative.minutesAgo', { minutes }),
  };

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title', { date: reportDate })}
      </p>
      <ol className="relative mt-4 space-y-3 border-l border-border/60 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative text-sm">
            <span className="absolute -left-[1.35rem] top-1.5 size-2 rounded-full bg-primary" />
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeMinutesAgo(entry.minutesAgo, relativeLabels)}
            </span>
            <p className="font-medium">{t(`steps.${entry.id}`)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
