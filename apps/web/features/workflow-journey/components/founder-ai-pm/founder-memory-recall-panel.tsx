'use client';

import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FounderMemoryRecall } from '../../lib/founder-memory-store';

type FounderMemoryRecallPanelProps = {
  recall: FounderMemoryRecall;
};

export function FounderMemoryRecallPanel({ recall }: FounderMemoryRecallPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.memory');

  if (!recall.isReturning) return null;

  return (
    <section
      className="rounded-2xl border border-violet-300/50 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/30"
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-800 dark:text-violet-300">
        <Brain className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <p className="mt-3 text-base leading-relaxed text-foreground">
        {t('recall', {
          lastFocus: t(`focus.${recall.lastWeekFocusKey}`),
          lastGap: t(`gap.${recall.lastWeekGapKey}`),
          thisFocus: t(`focus.${recall.thisWeekFocusKey}`),
        })}
      </p>
    </section>
  );
}
