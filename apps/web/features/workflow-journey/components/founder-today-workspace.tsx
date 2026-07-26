'use client';

import { useEffect, useMemo } from 'react';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { WorkflowGoalId } from '../types';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { BusinessDeltaBrief } from './founder-ai-pm/business-delta-brief';
import { DecisionIntelligencePathPanel } from './founder-ai-pm/decision-intelligence-path-panel';
import { ExecutionRoadmapPanel } from './founder-ai-pm/execution-roadmap-panel';
import { FounderAiPmOperatingPanel } from './founder-ai-pm/founder-ai-pm-operating-panel';
import { FounderMemoryRecallPanel } from './founder-ai-pm/founder-memory-recall-panel';
import { FounderTodayActionHero } from './founder-ai-pm/founder-today-action-hero';
import { GrowthIntelligencePanel } from './founder-ai-pm/growth-intelligence-panel';
import { WorkspaceEveningSummary } from './intelligence-workspace/workspace-evening-summary';

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

  const handleStartAction = () => {
    analytics.trackNextActionStarted(goalId, 'today_hero');
    append({
      category: 'coach',
      title: 'todayHeroStart',
      summary: projectName,
    });
    window.dispatchEvent(new CustomEvent('ll:start-today-action'));
  };

  return (
    <div className="space-y-8">
      <FounderMemoryRecallPanel recall={intelligence.memoryRecall} />

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
        onStart={handleStartAction}
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

      <WorkspaceEveningSummary gain={DAILY_COACH.confidenceAfter - confidence} />
    </div>
  );
}
