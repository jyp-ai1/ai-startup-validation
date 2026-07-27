'use client';

import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import { buildMemoryTimeline } from '../../lib/v2-memory-timeline';

type V2DecisionMemoryTimelineProps = {
  entries: DecisionMemoryEntry[];
  lastReviewAt: Date | null;
  activeMemoryId: string | null;
  onSelect: (entryId: string) => void;
  className?: string;
};

export function V2DecisionMemoryTimeline({
  entries,
  lastReviewAt,
  activeMemoryId,
  onSelect,
  className,
}: V2DecisionMemoryTimelineProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.memoryTimeline');
  const locale = useLocale();
  const events = buildMemoryTimeline(entries, lastReviewAt, locale);

  if (events.length === 0) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{t('empty')}</p>
    );
  }

  return (
    <ul className={cn('space-y-3', className)}>
      {events.map((event) => {
        const active = event.memoryId != null && activeMemoryId === event.memoryId;

        if (event.type === 'review') {
          return (
            <li key={event.id} className="relative border-l border-border/50 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {event.dateLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('events.marketReview')}
                <span className="mt-0.5 block text-xs">{t('events.evidenceGenerated')}</span>
              </p>
            </li>
          );
        }

        return (
          <li key={event.id} className="relative border-l border-border/50 pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {event.dateLabel}
            </p>
            <button
              type="button"
              onClick={() => onSelect(event.memoryId!)}
              className={cn(
                'mt-1 block w-full text-left text-sm transition-colors',
                active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {event.subtitle}
              <span className="mt-0.5 block text-xs text-primary">{t('view')}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
