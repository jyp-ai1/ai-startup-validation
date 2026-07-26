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
import type { WorkflowGoalId } from '../../types';
import { FounderStrategyDashboardLoader } from '../founder-ai-pm/founder-strategy-dashboard-loader';
import { JOURNEY_WIDE_MAIN } from '../journey-focused-shell';
import { WorkspaceShell } from '../workspace-shell';
import { AiPmInvestigationPreview } from './ai-pm-investigation-preview';
import { AiPmLiveConversation } from './ai-pm-live-conversation';
import { AiPmLiveTeamPanel } from './ai-pm-live-team-panel';
import { AiPmMicroQuestion } from './ai-pm-micro-question';

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

  const liveRail = (
    <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-xl sm:p-6">
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

      <AiPmInvestigationPreview completedCount={Math.max(0, stepProgress.current - 1)} />

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

      {!failed ? (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
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
  );

  const strategyPanel =
    projectId && projectName && goalId && confidence != null ? (
      <FounderStrategyDashboardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={confidence}
        compact
      />
    ) : (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
        {t('liveStrategyBuilding')}
      </div>
    );

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-live-title"
      aria-busy={!failed}
    >
      <div className={cn(JOURNEY_WIDE_MAIN, 'min-h-full py-8 sm:py-12')}>
        <WorkspaceShell embedded rail={liveRail} main={strategyPanel} />
      </div>
    </div>
  );
}
