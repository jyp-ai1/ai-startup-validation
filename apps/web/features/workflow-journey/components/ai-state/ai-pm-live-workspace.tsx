'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import {
  estimateRemainingSeconds,
  getLiveWorkspaceStepProgress,
  getMicroQuestionId,
} from '../../lib/ai-pm-conversation';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
} from '../../lib/founder-micro-interaction-store';
import type { WorkflowGoalId } from '../../types';
import { FounderExecutiveDecisionBoardLoader } from '../founder-ai-pm/founder-executive-decision-board-loader';
import { DecisionBoardPlaceholder, FounderWorkspaceLayout } from '../founder-workspace-layout';
import { AiPmLiveConversation } from './ai-pm-live-conversation';
import { AiPmMicroQuestion } from './ai-pm-micro-question';
import { AiPmOfficeChat, type AiPmChatMessage } from './ai-pm-office-chat';

type AiPmLiveWorkspaceProps = {
  agentIndex: number;
  failed?: boolean;
  projectId?: string;
  projectName?: string;
  goalId?: WorkflowGoalId;
  confidence?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  onSkipToToday?: () => void;
  className?: string;
};

export function AiPmLiveWorkspace({
  agentIndex,
  failed = false,
  projectId,
  projectName,
  goalId,
  confidence,
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

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    const list: AiPmChatMessage[] = [{ role: 'ai', text: t('liveHero') }];
    list.push({
      role: 'ai',
      text: t('liveStep.progress', {
        current: stepProgress.current,
        total: stepProgress.total,
      }),
    });
    list.push({ role: 'ai', text: t(`liveStep.phases.${stepProgress.workId}`) });
    if (!failed) {
      list.push({ role: 'ai', text: t('remaining', { seconds: remaining }) });
    }
    return list;
  }, [failed, remaining, stepProgress, t]);

  const chatFooter = failed ? (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('failedHint')}</p>
      <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
        {t('retry')}
      </Button>
      {onSkipToToday ? (
        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onSkipToToday}>
          {t('continueAnyway')}
        </Button>
      ) : null}
    </div>
  ) : (
    <div className="space-y-3">
      {microQuestionId ? (
        <AiPmMicroQuestion
          questionId={microQuestionId}
          selected={microAnswers.targetCustomer}
          onSelect={handleMicroSelect}
        />
      ) : null}
      <p className="whitespace-pre-line text-center text-sm text-muted-foreground">{t('waitInstructionSticky')}</p>
      {onCancel ? (
        <Button type="button" variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={onCancel}>
          {t('cancelAnalysis')}
        </Button>
      ) : null}
    </div>
  );

  const center = (
    <AiPmOfficeChat messages={chatMessages} footer={chatFooter} className={className}>
      <AiPmLiveConversation agentIndex={agentIndex} failed={failed} />
    </AiPmOfficeChat>
  );

  const right =
    projectId && projectName && goalId && confidence != null ? (
      <FounderExecutiveDecisionBoardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={confidence}
        compact
      />
    ) : (
      <DecisionBoardPlaceholder />
    );

  return (
    <FounderWorkspaceLayout embedded activeStep="analysis" center={center} right={right} />
  );
}
