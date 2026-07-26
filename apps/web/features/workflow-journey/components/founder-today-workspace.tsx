'use client';

import { useEffect, useMemo } from 'react';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { WorkflowGoalId } from '../types';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { AiActionGeneratorPanel } from './founder-ai-pm/ai-action-generator-panel';
import { BusinessDeltaBrief } from './founder-ai-pm/business-delta-brief';
import { BusinessProgressPanel } from './founder-ai-pm/business-progress-panel';
import { DecisionIntelligencePathPanel } from './founder-ai-pm/decision-intelligence-path-panel';
import { ExecutionRoadmapPanel } from './founder-ai-pm/execution-roadmap-panel';
import { FounderAiPmOperatingPanel } from './founder-ai-pm/founder-ai-pm-operating-panel';
import { FounderDailyReviewPanel } from './founder-ai-pm/founder-daily-review-panel';
import { FounderMemoryRecallPanel } from './founder-ai-pm/founder-memory-recall-panel';
import { FounderSuccessScorePanel } from './founder-ai-pm/founder-success-score-panel';
import { FounderTodayActionHero } from './founder-ai-pm/founder-today-action-hero';
import { GrowthIntelligencePanel } from './founder-ai-pm/growth-intelligence-panel';

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
      <FounderSuccessScorePanel score={intelligence.successScore} />

      <BusinessProgressPanel dimensions={intelligence.businessProgress} />

      <AiActionGeneratorPanel
        actions={intelligence.todayActions}
        totalEtaMinutes={intelligence.totalEtaMinutes}
        onStartAction={(actionId) => handleStartAction(`action_${actionId}`)}
      />

      <FounderMemoryRecallPanel
        memoryAction={intelligence.memoryAction}
        onStart={() => handleStartAction('memory_action')}
      />

      <BusinessDeltaBrief deltas={intelligence.businessDeltas} projectName={projectName} />

      <FounderAiPmOperatingPanel
        variant="morning"
        goalId={goalId}
        confidence={confidence}
        projectName={projectName}
        hideMorningAlert
      />

      <FounderTodayActionHero
        goalId={goalId}
        confidence={confidence}
        onStart={() => handleStartAction('today_hero')}
      />

      <DecisionIntelligencePathPanel path={intelligence.decisionPath} />

      <ExecutionRoadmapPanel items={intelligence.executionRoadmap} />

      {intelligence.showGrowth ? (
        <GrowthIntelligencePanel items={intelligence.growthPath} />
      ) : null}

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
