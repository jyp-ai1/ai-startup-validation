'use client';

import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import type { ActionDebriefSnapshot } from '../../lib/founder-project-state-store';
import type { WorkflowGoalId } from '../../types';
import { AiPmOfficeChat, type AiPmChatMessage } from '../ai-state/ai-pm-office-chat';
import { JourneyFocusedShell } from '../journey-focused-shell';
import { FounderExecutiveDecisionBoardLoader } from './founder-executive-decision-board-loader';

type FounderActionDebriefProps = {
  debrief: ActionDebriefSnapshot;
  onContinue: () => void;
  className?: string;
  projectId?: string;
  projectName?: string;
  goalId?: WorkflowGoalId;
  confidence?: number;
};

export function FounderActionDebrief({
  debrief,
  onContinue,
  className,
  projectId,
  projectName,
  goalId,
  confidence,
}: FounderActionDebriefProps) {
  const t = useTranslations('workflow.founderAiPm.operating.debrief');

  const tomorrowAction = debrief.nextActionTitle ?? t('tomorrowDefault');
  const chatMessages = useMemo(
    (): AiPmChatMessage[] => [
      { role: 'ai', text: t('lead', { action: debrief.actionTitle }) },
      {
        role: 'ai',
        text: t('scoreNarrative', {
          before: debrief.scoreBefore,
          after: debrief.scoreAfter,
        }),
      },
      { role: 'ai', text: t('projectUpdated') },
      {
        role: 'ai',
        text: t('tomorrowLine', {
          action: tomorrowAction,
          minutes: debrief.nextActionMinutes ?? 15,
        }),
      },
    ],
    [debrief, t, tomorrowAction],
  );

  const strategyPanel =
    projectId && projectName && goalId && confidence != null ? (
      <FounderExecutiveDecisionBoardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={confidence}
      />
    ) : null;

  return (
    <JourneyFocusedShell
      ariaLabel={t('scoreLabel')}
      className={className}
      activeStep="execution"
      right={strategyPanel ?? undefined}
    >
      <AiPmOfficeChat
        messages={chatMessages}
        footer={
          <Button type="button" size="lg" className="h-12 w-full rounded-xl font-semibold" onClick={onContinue}>
            {t('continueCta')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        }
      />
    </JourneyFocusedShell>
  );
}
