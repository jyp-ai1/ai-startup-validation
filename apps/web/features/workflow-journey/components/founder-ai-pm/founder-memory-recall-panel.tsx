'use client';

import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import { hasRepeatedDeferral, type FounderBehaviorProfile } from '../../lib/founder-behavior-store';
import type { MemoryGeneratedAction } from '../../lib/founder-memory-store';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderMemoryRecallPanelProps = {
  memoryAction: MemoryGeneratedAction;
  behavior?: FounderBehaviorProfile | null;
  onStart: () => void;
};

export function FounderMemoryRecallPanel({
  memoryAction,
  behavior,
  onStart,
}: FounderMemoryRecallPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.memory');
  const { recall, pipelineAction } = memoryAction;
  const gapKey = behavior?.currentGapKey ?? recall.lastWeekGapKey;

  const showPanel =
    recall.isReturning ||
    (behavior && hasRepeatedDeferral(behavior, gapKey)) ||
    (behavior && behavior.visitCount > 1);

  if (!showPanel) return null;

  const isInterviewDefer =
    behavior &&
    hasRepeatedDeferral(behavior, gapKey) &&
    (gapKey === 'vocGap' || gapKey.includes('voc'));

  const recallMessages = isInterviewDefer
    ? [t('interviewDeferRecall')]
    : behavior && hasRepeatedDeferral(behavior, gapKey)
      ? [t('deferredRecall', { gap: t(`gap.${gapKey}`) })]
      : [
          t('recall', {
            lastFocus: t(`focus.${recall.lastWeekFocusKey}`),
            lastGap: t(`gap.${recall.lastWeekGapKey}`),
            thisFocus: t(`focus.${recall.thisWeekFocusKey}`),
          }),
        ];

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

      <div className="mt-4">
        <AiPmConversation messages={recallMessages} />
      </div>

      <div className="mt-5 rounded-xl border border-violet-200/60 bg-background/80 p-4">
        <p className="text-sm font-semibold">{t('actionReady')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{actionTitle}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t('eta', { minutes: etaMinutes })}</p>
        <Button type="button" className="mt-4 w-full rounded-xl sm:w-auto" onClick={onStart}>
          {t('startCta')}
        </Button>
      </div>
    </section>
  );
}
