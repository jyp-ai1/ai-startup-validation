'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderTodayDailyBriefProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  deltaReason?: string;
  onStartPrimary: () => void;
  className?: string;
};

export function FounderTodayDailyBrief({
  score,
  primaryAction,
  deltaReason,
  onStartPrimary,
  className,
}: FounderTodayDailyBriefProps) {
  const t = useTranslations('workflow.founderAiPm.todayDaily');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const delta = score.delta > 0 ? score.delta : 3;
  const minutes = primaryAction?.etaMinutes ?? 15;
  const actionTitle =
    primaryAction?.title ??
    (primaryAction?.titleKey
      ? td(primaryAction.titleKey as 'primaryStep', primaryAction.titleParams ?? {})
      : t('todayFocusDefault'));

  const reason =
    deltaReason ??
    score.reasons?.[0] ??
    t('deltaReasonDefault');

  const messages = [
    t('greeting'),
    `${t('deltaLead')}\n\n${t('deltaValue', { delta })}`,
    `${t('deltaReasonLead')}\n\n${reason}`,
    `${t('todayFocusLead')}\n\n${actionTitle}`,
    t('etaLead', { minutes }),
  ];

  return (
    <section className={cn('space-y-5', className)} aria-label={t('label')}>
      <AiPmConversation messages={messages} />

      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-xl text-base font-semibold"
        onClick={onStartPrimary}
      >
        {t('startCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}
