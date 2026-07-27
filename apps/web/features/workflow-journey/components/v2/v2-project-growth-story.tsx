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
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.growthStory');
  const chapters = buildProjectGrowthStory(entries, reviewCount);

  if (chapters.length === 0) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{t('empty')}</p>
    );
  }

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ol className="space-y-0 border-t border-border/40 pt-4">
        {chapters.map((chapter, index) => {
          const memoryId = chapter.id.startsWith('memory-')
            ? chapter.id.replace('memory-', '')
            : null;
          const active = memoryId != null && activeMemoryId === memoryId;
          const isLast = index === chapters.length - 1;

          return (
            <li key={chapter.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[1.125rem] top-8 h-[calc(100%-1rem)] w-px bg-border/60"
                  aria-hidden
                />
              ) : null}
              <div className="flex size-9 shrink-0 flex-col items-center">
                <span className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-xs font-bold">
                  {chapter.monthLabel}
                </span>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                {memoryId && onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(memoryId)}
                    className={cn(
                      'text-left text-sm font-semibold',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {chapter.headline}
                  </button>
                ) : (
                  <p className="text-sm font-semibold">{chapter.headline}</p>
                )}
                {chapter.outcome ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                    <ArrowDown className="size-3 rotate-[-90deg]" aria-hidden />
                    {chapter.outcome}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">{chapter.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
