'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button } from '@repo/ui';

import { FounderExecutiveDecisionBoardLoader } from '../founder-ai-pm/founder-executive-decision-board-loader';
import { buildExplainableJudgment } from '../../lib/founder-explainable-judgment';
import {
  buildAiPmDecisionBox,
  buildAiPmMeetingBrief,
  buildMeetingCloseNarrative,
} from '../../lib/founder-ai-pm-meeting';
import { buildExplainableScoreFactors } from '../../lib/founder-personalization-engine';
import type { WorkflowGoalId } from '../../types';
import { JourneyFocusedShell } from '../journey-focused-shell';
import { AiPmOfficeChat, type AiPmChatMessage } from './ai-pm-office-chat';

type AiPmCompletionHandoffProps = {
  onStartToday: () => void;
  className?: string;
  embedded?: boolean;
  projectId?: string;
  projectName?: string;
  goalId?: WorkflowGoalId;
  confidence?: number;
};

const HANDOFF_DWELL_MS = 2500;

export function AiPmCompletionHandoff({
  onStartToday,
  className,
  embedded = false,
  projectId,
  projectName = 'LaunchLens',
  goalId = 'business-viability',
  confidence = 62,
}: AiPmCompletionHandoffProps) {
  const t = useTranslations('workflow.aiPm.completion');
  const [readyToContinue, setReadyToContinue] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyToContinue(true), HANDOFF_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const pipeline = loadAgentPipelineResult();
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const successScore = pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? confidence;

  const businessProgress = useMemo(
    () =>
      pipeline?.founderOs?.businessProgress ?? [
        { key: 'market' as const, percent: Math.min(85, successScore + 10) },
        { key: 'customer' as const, percent: Math.max(30, successScore - 15) },
        { key: 'pricing' as const, percent: Math.max(20, successScore - 30) },
        { key: 'investment' as const, percent: Math.max(10, successScore - 45) },
      ],
    [pipeline?.founderOs?.businessProgress, successScore],
  );

  const explainableJudgment = useMemo(() => {
    const factors = buildExplainableScoreFactors(businessProgress, pipeline?.decision.reasons ?? []);
    return buildExplainableJudgment(pipeline, successScore, businessProgress, factors);
  }, [businessProgress, pipeline, successScore]);

  const meetingBrief = useMemo(
    () => buildAiPmMeetingBrief(pipeline, explainableJudgment, businessProgress),
    [businessProgress, explainableJudgment, pipeline],
  );
  const decisionBox = useMemo(
    () => buildAiPmDecisionBox(pipeline, businessProgress, primaryAction),
    [businessProgress, pipeline, primaryAction],
  );
  const meetingCloseMessages = useMemo(
    () => buildMeetingCloseNarrative(meetingBrief, decisionBox),
    [decisionBox, meetingBrief],
  );

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    const messages: AiPmChatMessage[] = [
      { role: 'ai', text: t('greeting') },
      { role: 'ai', text: t('goodNews') },
      ...meetingCloseMessages.map((text) => ({ role: 'ai' as const, text })),
    ];
    if (readyToContinue) {
      const verdictText =
        meetingBrief.verdictKey === 'GO_CONDITIONAL'
          ? t('verdictConditional')
          : meetingBrief.verdictKey === 'GO'
            ? t('verdictGo')
            : t('verdictHold');
      messages.push({ role: 'ai', text: t('verdictChat', { verdict: verdictText }) });
      messages.push({ role: 'ai', text: t('operatingHandoff') });
    }
    return messages;
  }, [meetingBrief.verdictKey, meetingCloseMessages, readyToContinue, t]);

  const center = (
    <AiPmOfficeChat
      className={className}
      messages={chatMessages}
      footer={
        readyToContinue ? (
          <Button type="button" size="lg" className="h-12 w-full rounded-xl font-semibold" onClick={onStartToday}>
            {t('startTodayCta')}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t('readingWait')}</p>
        )
      }
    />
  );

  const decisionBoard =
    projectId && goalId ? (
      <FounderExecutiveDecisionBoardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={successScore}
      />
    ) : null;

  return (
    <JourneyFocusedShell
      embedded={embedded}
      ariaLabel={t('title')}
      activeStep="judgment"
      companyProgressPercent={successScore}
      right={decisionBoard ?? undefined}
    >
      {center}
    </JourneyFocusedShell>
  );
}
