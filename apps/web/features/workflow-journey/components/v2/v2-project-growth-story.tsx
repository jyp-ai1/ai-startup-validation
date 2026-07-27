'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import { buildProjectGrowthStory } from '../../lib/v2-project-growth-story';

type V2ProjectGrowthStoryProps = {
  entries: DecisionMemoryEntry[];
  reviewCount: number;
  activeMemoryId?: string | null;
  onSelect?: (entryId: string) => void;
  className?: string;
};

export function V2ProjectGrowthStory({
  entries,
  reviewCount,
  activeMemoryId = null,
  onSelect,
  className,
}: V2ProjectGrowthStoryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.growthStory');
  const chapters = buildProjectGrowthStory(entries, reviewCount);

  if (chapters.length === 0) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{t('empty')}</p>
    );
  }

  return (
    <section id="growth-story" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>

      <ol className="space-y-2 border-t border-border/40 pt-4">
        {chapters.map((chapter, index) => {
          const memoryId = chapter.id.startsWith('memory-')
            ? chapter.id.replace('memory-', '')
            : null;
          const active = memoryId != null && activeMemoryId === memoryId;
          const isLast = index === chapters.length - 1;

          return (
            <li key={chapter.id}>
              <div className="text-center">
                <p
                  className={cn(
                    'text-xs font-semibold',
                    chapter.isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {chapter.monthLabel}
                </p>
                {memoryId && onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(memoryId)}
                    className={cn(
                      'mt-1 text-sm font-semibold',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {chapter.headline}
                  </button>
                ) : (
                  <p className="mt-1 text-sm font-semibold">{chapter.headline}</p>
                )}
                {chapter.outcome ? (
                  <p className="mt-1 text-xs text-primary">{chapter.outcome}</p>
                ) : null}
              </div>
              {!isLast ? (
                <div className="flex justify-center py-2 text-muted-foreground" aria-hidden>
                  <ArrowDown className="size-4" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
