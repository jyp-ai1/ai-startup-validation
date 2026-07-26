'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  estimateRemainingSeconds,
  getLiveWorkspaceStepProgress,
  getMicroQuestionId,
} from '../../lib/ai-pm-conversation';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
} from '../../lib/founder-micro-interaction-store';
import { AiPmLiveConversation } from './ai-pm-live-conversation';
import { AiPmLiveTeamPanel } from './ai-pm-live-team-panel';
import { AiPmMicroQuestion } from './ai-pm-micro-question';

type AiPmLiveWorkspaceProps = {
  agentIndex: number;
  failed?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  onSkipToToday?: () => void;
  className?: string;
};

export function AiPmLiveWorkspace({
  agentIndex,
  failed = false,
  onRetry,
  onCancel,
  onSkipToToday,
  className,
}: AiPmLiveWorkspaceProps) {
  const t = useTranslations('workflow.aiPm');
  const remaining = estimateRemainingSeconds(agentIndex);
  const microQuestionId = getMicroQuestionId(agentIndex);
  const stepProgress = getLiveWorkspaceStepProgress(agentIndex);
  const [microAnswers, setMicroAnswers] = useState(loadFounderMicroAnswers);

  const handleMicroSelect = (value: NonNullable<(typeof microAnswers)['targetCustomer']>) => {
    saveFounderMicroAnswer('targetCustomer', value);
    setMicroAnswers({ ...microAnswers, targetCustomer: value });
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-live-title"
      aria-busy={!failed}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col p-4 sm:p-6">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
          <div className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('liveStep.label')}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {t('liveStep.progress', {
                current: stepProgress.current,
                total: stepProgress.total,
              })}
            </p>
            <p className="mt-1 text-sm font-medium">
              {t(`liveStep.phases.${stepProgress.workId}`)}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-center">
            <p id="ai-pm-live-title" className="whitespace-pre-line text-base font-semibold leading-relaxed sm:text-lg">
              {t('liveHero')}
            </p>
            {!failed ? (
              <p className="mt-3 text-sm tabular-nums text-muted-foreground">
                {t('remaining', { seconds: remaining })}
              </p>
            ) : null}
          </div>

          <AiPmLiveTeamPanel agentIndex={agentIndex} failed={failed} />

          <AiPmLiveConversation agentIndex={agentIndex} failed={failed} />

          {microQuestionId && !failed ? (
            <AiPmMicroQuestion
              questionId={microQuestionId}
              selected={microAnswers.targetCustomer}
              onSelect={handleMicroSelect}
            />
          ) : null}

          {failed ? (
            <div className="space-y-3">
              <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {t('failedHint')}
              </p>
              <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
                {t('retry')}
              </Button>
              {onSkipToToday ? (
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onSkipToToday}>
                  {t('continueAnyway')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!failed ? (
          <div className="mt-4 shrink-0 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
            <p className="whitespace-pre-line text-center text-sm font-medium leading-relaxed">
              {t('waitInstructionSticky')}
            </p>
            {onCancel ? (
              <Button type="button" variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={onCancel}>
                {t('cancelAnalysis')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
