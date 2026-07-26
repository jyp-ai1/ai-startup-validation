'use client';

import { useEffect, useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { WorkflowGoalId } from '../types';
import { AiPmConversation } from './ai-state/ai-pm-conversation';
import { AiStateHero } from './ai-state/ai-state-hero';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { AiActionGeneratorPanel } from './founder-ai-pm/ai-action-generator-panel';
import { BusinessDeltaBrief } from './founder-ai-pm/business-delta-brief';
import { BusinessProgressPanel } from './founder-ai-pm/business-progress-panel';
import { DecisionIntelligencePathPanel } from './founder-ai-pm/decision-intelligence-path-panel';
import { DecisionOneLinePanel } from './founder-ai-pm/decision-one-line-panel';
import { FounderAiPreparedPanel } from './founder-ai-pm/founder-ai-prepared-panel';
import { FounderDailyReviewPanel } from './founder-ai-pm/founder-daily-review-panel';
import { FounderJourneyMap } from './founder-ai-pm/founder-journey-map';
import { FounderMemoryRecallPanel } from './founder-ai-pm/founder-memory-recall-panel';
import { FounderTodayActionHero } from './founder-ai-pm/founder-today-action-hero';

const DAILY_VISIT_KEY = 'll_daily_visit';
const WEEKLY_VISIT_KEY = 'll_weekly_visit';

function trackReturnVisits(analytics: ReturnType<typeof useJourneyAnalytics>, goalId: string) {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  const week = `${new Date().getFullYear()}-W${Math.ceil((new Date().getDate() + 6 - new Date().getDay()) / 7)}`;
  const lastDaily = sessionStorage.getItem(DAILY_VISIT_KEY);
  const lastWeekly = sessionStorage.getItem(WEEKLY_VISIT_KEY);

  if (lastDaily && lastDaily !== today) {
    analytics.trackDailyReturn(goalId);
  }
  if (lastWeekly && lastWeekly !== week) {
    analytics.trackWeeklyReturn(goalId);
  }

  sessionStorage.setItem(DAILY_VISIT_KEY, today);
  sessionStorage.setItem(WEEKLY_VISIT_KEY, week);
}

type FounderTodayWorkspaceProps = {
  goalId: WorkflowGoalId;
  projectId: string;
  projectName: string;
  confidence: number;
};

export function FounderTodayWorkspace({
  goalId,
  projectId,
  projectName,
  confidence,
}: FounderTodayWorkspaceProps) {
  const analytics = useJourneyAnalytics();
  const tpm = useTranslations('workflow.aiPm');
  const { append } = useJourneyHistory(projectId);

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId],
  );

  const pipeline = useMemo(() => loadAgentPipelineResult(), [intelligence.fromAgentPipeline]);
  const primaryAction = intelligence.todayActions[0];
  const primaryWhy =
    primaryAction?.whyText ??
    pipeline?.decision?.intelligence?.gap ??
    pipeline?.decision?.missingData?.[0];

  const pmMessages = useMemo(() => {
    const lines: string[] = [];
    if (intelligence.morningBrief) lines.push(intelligence.morningBrief);
    if (primaryAction?.title) {
      lines.push(tpm('todayFirstAction', { action: primaryAction.title }));
    }
    return lines;
  }, [intelligence.morningBrief, primaryAction?.title, tpm]);

  useEffect(() => {
    trackReturnVisits(analytics, goalId);
    analytics.trackDecisionViewed(goalId);
  }, [analytics, goalId]);

  const handleStartAction = (source = 'today_hero') => {
    analytics.trackNextActionStarted(goalId, source);
    append({
      category: 'coach',
      title: 'todayHeroStart',
      summary: projectName,
    });
    window.dispatchEvent(new CustomEvent('ll:start-today-action'));
  };

  return (
    <div className="space-y-8">
      <FounderJourneyMap confidence={confidence} verdict={pipeline?.decision?.verdict} />

      {pmMessages.length > 0 ? <AiPmConversation messages={pmMessages} /> : null}

      <AiStateHero
        context={{
          surface: 'today',
          hasPipelineResult: intelligence.fromAgentPipeline,
          primaryActionTitle: primaryAction?.title ?? primaryAction?.titleKey,
          primaryActionWhy: primaryWhy,
          primaryActionEta: primaryAction?.etaMinutes,
          primaryActionGoImpact: primaryAction?.goImpact,
          morningBrief: intelligence.morningBrief,
        }}
      />

      <FounderTodayActionHero
        goalId={goalId}
        confidence={confidence}
        whyText={primaryWhy}
        onStart={() => handleStartAction('today_hero')}
      />

      <FounderAiPreparedPanel
        items={
          intelligence.fromAgentPipeline
            ? ['marketDone', 'competitorDone', 'viabilityDone']
            : []
        }
      />

      <AiActionGeneratorPanel
        actions={intelligence.todayActions}
        totalEtaMinutes={intelligence.totalEtaMinutes}
        onStartAction={(actionId) => handleStartAction(`action_${actionId}`)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BusinessProgressPanel dimensions={intelligence.businessProgress} />
        <DecisionOneLinePanel fallbackConfidence={confidence} />
      </div>

      <BusinessDeltaBrief deltas={intelligence.businessDeltas} projectName={projectName} />

      <FounderMemoryRecallPanel
        memoryAction={intelligence.memoryAction}
        onStart={() => handleStartAction('memory_action')}
      />

      <DecisionIntelligencePathPanel path={intelligence.decisionPath} />

      <DecisionExperienceCoach
        id="journey-decision-coach"
        goalId={goalId}
        projectId={projectId}
        layout="action-first"
        className="w-full max-w-none scroll-mt-6"
        onNextActionStarted={() => analytics.trackNextActionStarted(goalId, 'coach_action')}
      />

      <FounderDailyReviewPanel review={intelligence.dailyReview} />
    </div>
  );
}
