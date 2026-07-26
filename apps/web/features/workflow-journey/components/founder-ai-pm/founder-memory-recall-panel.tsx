'use client';

import { Brain, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import type { MemoryGeneratedAction } from '../../lib/founder-memory-store';

type FounderMemoryRecallPanelProps = {
  memoryAction: MemoryGeneratedAction;
  onStart: () => void;
};

export function FounderMemoryRecallPanel({ memoryAction, onStart }: FounderMemoryRecallPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.memory');
  const { recall, pipelineAction } = memoryAction;

  if (!recall.isReturning) return null;

  const questions = pipelineAction?.questions ?? memoryAction.questionKeys.map((key) => t(`questions.${key}`));
  const actionTitle =
    pipelineAction?.actionTitle ??
    t(`actions.${memoryAction.actionTitleKey}`, { count: memoryAction.questionKeys.length });
  const etaMinutes = pipelineAction?.etaMinutes ?? memoryAction.etaMinutes;

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

      <div className="mt-5 rounded-xl border border-violet-200/60 bg-background/80 p-4 dark:border-violet-900">
        <p className="text-sm font-semibold">{t('actionReady')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{actionTitle}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {t('eta', { minutes: etaMinutes })}
        </p>
        <ol className="mt-3 space-y-1.5 text-sm" role="list">
          {questions.map((question, index) => (
            <li key={`${index}-${question.slice(0, 12)}`} className="flex gap-2 rounded-lg bg-muted/30 px-3 py-2">
              <span className="shrink-0 font-semibold text-violet-700 dark:text-violet-300">
                {index + 1}.
              </span>
              <span>{question}</span>
            </li>
          ))}
        </ol>
        <Button type="button" className="mt-4 w-full rounded-xl sm:w-auto" onClick={onStart}>
          {t('startCta')}
        </Button>
      </div>
    </section>
  );
}
