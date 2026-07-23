'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowDown, CheckCircle2, Circle, Loader2 } from 'lucide-react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceTimelineEntry } from '../services/strategy-workspace-types';

type WorkspaceTimelineProps = {
  timeline: WorkspaceTimelineEntry[];
  projectId: string;
};

const STATUS_ICON = {
  completed: CheckCircle2,
  current: Loader2,
  upcoming: Circle,
};

export function WorkspaceTimeline({ timeline, projectId }: WorkspaceTimelineProps) {
  const t = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  return (
    <section className="rounded-xl border border-border/50 bg-card p-5">
      <h3 className="text-sm font-semibold">{t('timeline.title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('timeline.desc')}</p>
      <ol className="mt-4 space-y-1">
        {timeline.map((entry, index) => {
          const Icon = STATUS_ICON[entry.status];
          return (
            <li key={entry.id}>
              {index > 0 ? (
                <ArrowDown className="mx-auto my-0.5 size-3 text-muted-foreground/40" />
              ) : null}
              <Link
                href={entry.href}
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.timelineClick, {
                    project_id: projectId,
                    stage_id: entry.id,
                  })
                }
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                  entry.status === 'current' && 'bg-primary/5 font-medium',
                  entry.status === 'completed' && 'text-muted-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    entry.status === 'completed' && 'text-emerald-600',
                    entry.status === 'current' && 'animate-spin text-primary',
                    entry.status === 'upcoming' && 'text-muted-foreground',
                  )}
                />
                <span>{t(entry.labelKey as 'checklist.research')}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t(`timeline.status.${entry.status}` as 'timeline.status.current')}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
