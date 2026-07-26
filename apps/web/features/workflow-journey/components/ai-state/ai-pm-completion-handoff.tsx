'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { AiPmConversation } from './ai-pm-conversation';
import { FounderDecisionBoxPanel } from '../founder-ai-pm/founder-decision-box-panel';
import { FounderExecutiveDecisionBoardLoader } from '../founder-ai-pm/founder-executive-decision-board-loader';
import { FounderResearchCompletePanel } from '../founder-ai-pm/founder-research-complete-panel';
import { FounderAiPmMeetingClose } from '../founder-ai-pm/founder-ai-pm-meeting-close';
import { buildCompetitiveIntelligence } from '../../lib/founder-competitive-intelligence';
import { buildExplainableJudgment } from '../../lib/founder-explainable-judgment';
import {
  buildAiPmDecisionBox,
  buildAiPmMeetingBrief,
  buildMeetingCloseNarrative,
} from '../../lib/founder-ai-pm-meeting';
import { buildResearchCompleteBrief } from '../../lib/founder-research-trust';
import { countResearchMaterials } from '../../lib/founder-research-sources';
import { buildExplainableScoreFactors } from '../../lib/founder-personalization-engine';
import type { WorkflowGoalId } from '../../types';
import { JourneyFocusedShell } from '../journey-focused-shell';

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

  const researchMaterialCount = useMemo(() => countResearchMaterials(pipeline), [pipeline]);
  const researchComplete = useMemo(
    () => buildResearchCompleteBrief(pipeline, researchMaterialCount),
    [pipeline, researchMaterialCount],
  );

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

  const narrativeMessages = [t('greeting'), t('goodNews')];

  const handoffRail = (
    <>
      <AiPmConversation messages={narrativeMessages} />
      <FounderResearchCompletePanel brief={researchComplete} />
      <FounderDecisionBoxPanel
        decision={decisionBox}
        onSelect={readyToContinue ? () => onStartToday() : () => undefined}
      />
      {!readyToContinue ? (
        <p className="text-center text-sm text-muted-foreground">{t('readingWait')}</p>
      ) : (
        <>
          <FounderAiPmMeetingClose messages={meetingCloseMessages} onStart={onStartToday} />
          <p className="whitespace-pre-line text-center text-sm leading-relaxed text-muted-foreground">
            {t('operatingHandoff')}
          </p>
        </>
      )}
    </>
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
      className={className}
      activeStep="judgment"
      right={decisionBoard ?? undefined}
    >
      {handoffRail}
    </JourneyFocusedShell>
  );
}
