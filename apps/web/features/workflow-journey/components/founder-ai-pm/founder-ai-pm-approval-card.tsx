'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderAiPmApprovalCardProps = {
  primaryAction?: GeneratedTodayAction;
  onApprove: () => void;
  className?: string;
};

export function FounderAiPmApprovalCard({
  primaryAction,
  onApprove,
  className,
}: FounderAiPmApprovalCardProps) {
  const t = useTranslations('workflow.founderAiPm.approval');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const minutes = primaryAction?.etaMinutes ?? 15;
  const impact = primaryAction?.goImpact ?? 4;
  const actionTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('defaultAction'),
  );

  const messages = [
    t('lead', { action: actionTitle }),
    `${t('effectLead')}\n\n+${impact}%`,
    `${t('timeLead')}\n\n${t('minutes', { count: minutes })}`,
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-7',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('aiPmLabel')}
      </p>

      <AiPmConversation messages={messages} />

      <Button
        type="button"
        size="lg"
        className="mt-6 h-14 w-full rounded-xl text-base font-semibold"
        onClick={onApprove}
      >
        {t('approveCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}
