'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import {
  buildDecisionStory,
  groupStoryByPeriod,
  type StoryPeriod,
} from '../../lib/v2-decision-story';

type V2DecisionMemoryStoryProps = {
  entries: DecisionMemoryEntry[];
  lastReviewAt: Date | null;
  reviewCount: number;
  activeMemoryId: string | null;
  onSelect?: (entryId: string) => void;
  className?: string;
  compact?: boolean;
};

export function V2DecisionMemoryStory({
  entries,
  lastReviewAt,
  reviewCount,
  activeMemoryId,
  onSelect,
  className,
  compact = false,
}: V2DecisionMemoryStoryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.memoryStory');
  const locale = useLocale();
  const beats = buildDecisionStory(entries, lastReviewAt, locale, reviewCount);
  const groups = groupStoryByPeriod(beats);

  const [expanded, setExpanded] = useState<Record<StoryPeriod, boolean>>({
    today: true,
    yesterday: false,
    lastWeek: false,
  });

  if (beats.length === 0) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{t('empty')}</p>
    );
  }

  const toggle = (period: StoryPeriod) => {
    setExpanded((prev) => ({ ...prev, [period]: !prev[period] }));
  };

  return (
    <section className={cn('space-y-3', className)}>
      {!compact ? (
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      ) : null}

      <div className={cn('space-y-2', compact ? '' : 'border-t border-border/40 pt-4')}>
        {groups.map((group) => {
          const isOpen = expanded[group.period];
          return (
            <div key={group.period} className="rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => toggle(group.period)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
              >
                {t(`periods.${group.period}`)}
                <ChevronDown
                  className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <ol className="space-y-0 border-t border-border/40 px-3 pb-3 pt-2">
                  {group.beats.map((beat, index) => {
                    const isAi = beat.actor === 'ai';
                    const memoryId = beat.id.startsWith('memory-')
                      ? beat.id.replace('memory-', '')
                      : null;
                    const active = memoryId != null && activeMemoryId === memoryId;

                    return (
                      <li key={beat.id} className="relative flex gap-3 pb-3 last:pb-0">
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                            isAi ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {isAi ? 'AI' : t('founderShort')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground">{beat.dateLabel}</p>
                          {memoryId && onSelect ? (
                            <button
                              type="button"
                              onClick={() => onSelect(memoryId)}
                              className={cn(
                                'mt-0.5 block w-full text-left text-sm leading-relaxed',
                                active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {beat.text}
                            </button>
                          ) : (
                            <p className="mt-0.5 text-sm leading-relaxed">{beat.text}</p>
                          )}
                          {beat.narrative ? (
                            <p className="mt-0.5 text-xs font-medium text-primary">{beat.narrative}</p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
