'use client';

import { useEffect, useMemo } from 'react';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { recordFounderActionStarted } from '../lib/founder-behavior-store';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { WorkflowGoalId } from '../types';
import { AiPmConversation } from './ai-state/ai-pm-conversation';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { AiActionGeneratorPanel } from './founder-ai-pm/ai-action-generator-panel';
import { BusinessDeltaBrief } from './founder-ai-pm/business-delta-brief';
import { BusinessProgressPanel } from './founder-ai-pm/business-progress-panel';
import { DecisionIntelligencePathPanel } from './founder-ai-pm/decision-intelligence-path-panel';
import { DecisionOneLinePanel } from './founder-ai-pm/decision-one-line-panel';
import { FounderAiPreparedPanel } from './founder-ai-pm/founder-ai-prepared-panel';
import { FounderDailyReviewPanel } from './founder-ai-pm/founder-daily-review-panel';
import { FounderGrowthTimelinePanel } from './founder-ai-pm/founder-growth-timeline-panel';
import { FounderJourneyMap } from './founder-ai-pm/founder-journey-map';
import { FounderMemoryRecallPanel } from './founder-ai-pm/founder-memory-recall-panel';
import { FounderSuccessScorePanel } from './founder-ai-pm/founder-success-score-panel';
import { FounderTodayActionHero } from './founder-ai-pm/founder-today-action-hero';
import { FounderWeeklyCeoReviewPanel } from './founder-ai-pm/founder-weekly-ceo-review-panel';

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
  const { append } = useJourneyHistory(projectId);

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId],
  );

  const pipeline = useMemo(() => loadAgentPipelineResult(), [intelligence.fromAgentPipeline]);
  const primaryAction = intelligence.todayActions[0];

  useEffect(() => {
    trackReturnVisits(analytics, goalId);
    analytics.trackDecisionViewed(goalId);
  }, [analytics, goalId]);

  const handleStartAction = (source = 'today_hero', actionId?: string) => {
    analytics.trackNextActionStarted(goalId, source);
    if (actionId) recordFounderActionStarted(projectId, actionId);
    append({
      category: 'coach',
      title: 'todayHeroStart',
      summary: projectName,
    });
    window.dispatchEvent(new CustomEvent('ll:start-today-action'));
  };

  const showWeeklyReview =
    intelligence.behavior && intelligence.behavior.visitCount >= 2;

  return (
    <div className="space-y-8">
      <FounderJourneyMap confidence={confidence} verdict={pipeline?.decision?.verdict} />

      <AiPmConversation messages={intelligence.personalizedMorningLines} />

      <FounderSuccessScorePanel
        score={intelligence.successScore}
        factors={intelligence.successScoreFactors}
      />

      <FounderTodayActionHero
        goalId={goalId}
        confidence={confidence}
        recommendationWhy={intelligence.personalized.recommendationWhy}
        onStart={() => handleStartAction('today_hero', primaryAction?.id)}
      />

      <FounderMemoryRecallPanel
        memoryAction={intelligence.memoryAction}
        behavior={intelligence.behavior}
        onStart={() => handleStartAction('memory_action', intelligence.memoryAction.actionTitleKey)}
      />

      <FounderGrowthTimelinePanel behavior={intelligence.behavior} />

      {showWeeklyReview ? (
        <FounderWeeklyCeoReviewPanel review={intelligence.weeklyCeoReview} />
      ) : null}

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
        onStartAction={(actionId) => handleStartAction(`action_${actionId}`, actionId)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BusinessProgressPanel dimensions={intelligence.businessProgress} />
        <DecisionOneLinePanel fallbackConfidence={confidence} />
      </div>

      <BusinessDeltaBrief deltas={intelligence.businessDeltas} projectName={projectName} />

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
