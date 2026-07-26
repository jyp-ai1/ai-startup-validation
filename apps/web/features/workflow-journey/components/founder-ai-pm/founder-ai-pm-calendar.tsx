'use client';

import { CalendarRange } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { ExecutionRoadmapItem, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderAiPmCalendarProps = {
  roadmap: ExecutionRoadmapItem[];
  primaryAction?: GeneratedTodayAction;
  className?: string;
};

const HORIZON_ORDER = ['today', 'week', 'month', 'quarter', 'investment'] as const;

const FALLBACK_KEYS: Record<(typeof HORIZON_ORDER)[number], string> = {
  today: 'todayFallback',
  week: 'weekFallback',
  month: 'monthFallback',
  quarter: 'quarterFallback',
  investment: 'investmentFallback',
};

export function FounderAiPmCalendar({
  roadmap,
  primaryAction,
  className,
}: FounderAiPmCalendarProps) {
  const t = useTranslations('workflow.founderAiPm.calendar');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const todayTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('todayFallback'),
  );

  const items = HORIZON_ORDER.map((horizon) => {
    const match = roadmap.find((item) => item.horizon === horizon);
    let title = match?.title ?? t(FALLBACK_KEYS[horizon]);
    if (horizon === 'today' && primaryAction) {
      title = todayTitle;
    }
    const minutes = horizon === 'today' ? (primaryAction?.etaMinutes ?? match?.etaMinutes) : match?.etaMinutes;
    return { horizon, title, minutes };
  });

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <div className="flex items-center gap-2">
        <CalendarRange className="size-4 text-primary" aria-hidden />
        <p className="text-base font-semibold">{t('title')}</p>
      </div>

      <ol className="mt-5 space-y-0" role="list">
        {items.map((item, index) => (
          <li key={item.horizon} className="relative flex gap-4 pb-6 last:pb-0">
            {index < items.length - 1 ? (
              <span
                className="absolute left-[11px] top-7 h-[calc(100%-12px)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`horizons.${item.horizon}`)}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug">{item.title}</p>
              {item.horizon === 'today' && item.minutes ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('minutes', { count: item.minutes })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
