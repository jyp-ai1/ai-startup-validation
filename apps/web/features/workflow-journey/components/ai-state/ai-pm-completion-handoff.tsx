'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from './ai-pm-conversation';
import { FounderAiPmDiscoveryPanel } from '../founder-ai-pm/founder-ai-pm-discovery-panel';
import {
  FounderAiPmStrategyPanel,
  FounderCompetitorComparePanel,
  FounderMarketGapPanel,
  FounderWinStrategyPanel,
} from '../founder-ai-pm/founder-competitive-intelligence-panels';
import { FounderAiPmMeetingClose } from '../founder-ai-pm/founder-ai-pm-meeting-close';
import { FounderAiPmMeetingPanel } from '../founder-ai-pm/founder-ai-pm-meeting-panel';
import { FounderAiRecommendationPanel } from '../founder-ai-pm/founder-ai-recommendation-panel';
import { FounderDecisionBoxPanel } from '../founder-ai-pm/founder-decision-box-panel';
import { FounderResearchCompletePanel } from '../founder-ai-pm/founder-research-complete-panel';
import { FounderResearchSourcePanel } from '../founder-ai-pm/founder-research-source-panel';
import { buildCompetitiveIntelligence } from '../../lib/founder-competitive-intelligence';
import { buildExplainableJudgment } from '../../lib/founder-explainable-judgment';
import {
  buildAiPmDecisionBox,
  buildAiPmMeetingBrief,
  buildAiPmRecommendationBrief,
  buildMeetingCloseNarrative,
} from '../../lib/founder-ai-pm-meeting';
import { buildResearchInsightItems } from '../../lib/founder-research-insights';
import { countResearchMaterials } from '../../lib/founder-research-sources';
import {
  buildAiPmSurpriseFindings,
  buildCompetitorCompareVerification,
  buildResearchCompleteBrief,
} from '../../lib/founder-research-trust';
import { buildExplainableScoreFactors } from '../../lib/founder-personalization-engine';

type AiPmCompletionHandoffProps = {
  onStartToday: () => void;
  className?: string;
};

const HANDOFF_DWELL_MS = 2500;

export function AiPmCompletionHandoff({ onStartToday, className }: AiPmCompletionHandoffProps) {
  const t = useTranslations('workflow.aiPm.completion');
  const [readyToContinue, setReadyToContinue] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyToContinue(true), HANDOFF_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const pipeline = loadAgentPipelineResult();
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const successScore = pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? 62;

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

  const researchSources = useMemo(() => buildResearchInsightItems(pipeline), [pipeline]);
  const researchMaterialCount = useMemo(() => countResearchMaterials(pipeline), [pipeline]);
  const competitiveIntelligence = useMemo(
    () => buildCompetitiveIntelligence(pipeline, businessProgress),
    [businessProgress, pipeline],
  );
  const researchComplete = useMemo(
    () => buildResearchCompleteBrief(pipeline, researchMaterialCount),
    [pipeline, researchMaterialCount],
  );
  const surpriseFindings = useMemo(
    () => buildAiPmSurpriseFindings(pipeline, businessProgress),
    [businessProgress, pipeline],
  );
  const competitorVerification = useMemo(
    () =>
      buildCompetitorCompareVerification(
        pipeline,
        competitiveIntelligence.competitors.map((item) => item.name),
      ),
    [competitiveIntelligence.competitors, pipeline],
  );

  const meetingBrief = useMemo(
    () => buildAiPmMeetingBrief(pipeline, explainableJudgment, businessProgress),
    [businessProgress, explainableJudgment, pipeline],
  );
  const decisionBox = useMemo(
    () => buildAiPmDecisionBox(pipeline, businessProgress, primaryAction),
    [businessProgress, pipeline, primaryAction],
  );
  const recommendationBrief = useMemo(
    () => buildAiPmRecommendationBrief(pipeline, explainableJudgment, businessProgress),
    [businessProgress, explainableJudgment, pipeline],
  );
  const meetingCloseMessages = useMemo(
    () => buildMeetingCloseNarrative(meetingBrief, decisionBox),
    [decisionBox, meetingBrief],
  );

  const narrativeMessages = [t('greeting'), t('goodNews')];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-complete-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <AiPmConversation messages={narrativeMessages} />

        <FounderResearchCompletePanel brief={researchComplete} />

        <FounderAiPmDiscoveryPanel findings={surpriseFindings} />

        <FounderResearchSourcePanel
          items={researchSources}
          totalCount={researchMaterialCount}
          providerId={pipeline?.research.providerId}
        />

        <FounderCompetitorComparePanel
          brief={competitiveIntelligence}
          verification={competitorVerification}
        />

        <FounderMarketGapPanel brief={competitiveIntelligence} />

        <FounderWinStrategyPanel brief={competitiveIntelligence} />

        <FounderAiPmStrategyPanel brief={competitiveIntelligence} />

        <FounderAiPmMeetingPanel meeting={meetingBrief} judgment={explainableJudgment} />

        <FounderAiRecommendationPanel recommendation={recommendationBrief} />

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
      </div>
    </div>
  );
}
