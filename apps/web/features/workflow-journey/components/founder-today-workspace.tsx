'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { applyActionCompletionUpdate } from '../lib/apply-action-completion-update';
import type { ActionCompletionUpdateResult } from '../lib/apply-action-completion-update';
import { recordFounderActionStarted } from '../lib/founder-behavior-store';
import { resolveActionById, resolveActionWorkspace } from '../lib/founder-action-resolver';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { GeneratedTodayAction } from '../lib/founder-intelligence-engine';
import type { WorkflowGoalId } from '../types';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { BusinessDeltaBrief } from './founder-ai-pm/business-delta-brief';
import { BusinessProgressPanel } from './founder-ai-pm/business-progress-panel';
import { DecisionIntelligencePathPanel } from './founder-ai-pm/decision-intelligence-path-panel';
import { DecisionOneLinePanel } from './founder-ai-pm/decision-one-line-panel';
import { FounderActionDebrief } from './founder-ai-pm/founder-action-debrief';
import { FounderActionHistoryPanel } from './founder-ai-pm/founder-action-history-panel';
import {
  FounderActionWorkspace,
  type ActionWorkspaceResult,
} from './founder-ai-pm/founder-action-workspace';
import { FounderAiPmWorkLog } from './founder-ai-pm/founder-ai-pm-work-log';
import { FounderDailyReviewPanel } from './founder-ai-pm/founder-daily-review-panel';
import { FounderEvidenceAutoPanel } from './founder-ai-pm/founder-evidence-auto-panel';
import { FounderGrowthTimelinePanel } from './founder-ai-pm/founder-growth-timeline-panel';
import { FounderJourneyMap } from './founder-ai-pm/founder-journey-map';
import { FounderMemoryRecallPanel } from './founder-ai-pm/founder-memory-recall-panel';
import { FounderOperatingTimelinePanel } from './founder-ai-pm/founder-operating-timeline-panel';
import { FounderProjectHealthDashboard } from './founder-ai-pm/founder-project-health-dashboard';
import { FounderSuccessScoreExplained } from './founder-ai-pm/founder-success-score-explained';
import { FounderSuccessScorePanel } from './founder-ai-pm/founder-success-score-panel';
import { FounderTodayActionFirst } from './founder-ai-pm/founder-today-action-first';
import { FounderTodayHero } from './founder-ai-pm/founder-today-hero';
import { FounderTodayOutcomeStrip } from './founder-ai-pm/founder-today-outcome-strip';
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

function isFriday(): boolean {
  return new Date().getDay() === 5;
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
  const t = useTranslations('workflow.founderAiPm.todayFirst');
  const analytics = useJourneyAnalytics();
  const { append } = useJourneyHistory(projectId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeAction, setActiveAction] = useState<ReturnType<typeof resolveActionWorkspace> | null>(
    null,
  );
  const [completionUpdate, setCompletionUpdate] = useState<ActionCompletionUpdateResult | null>(
    null,
  );
  const [recentScoreUpdate, setRecentScoreUpdate] = useState<{
    delta: number;
    after: number;
    actionTitle?: string;
  } | null>(null);

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId, refreshKey],
  );

  useMemo(() => loadAgentPipelineResult(), [intelligence.fromAgentPipeline, refreshKey]);

  useEffect(() => {
    trackReturnVisits(analytics, goalId);
    analytics.trackDecisionViewed(goalId);
  }, [analytics, goalId]);

  const openAction = (action: GeneratedTodayAction, source: string) => {
    analytics.trackNextActionStarted(goalId, source);
    recordFounderActionStarted(projectId, action.id);
    append({
      category: 'coach',
      title: 'todayHeroStart',
      summary: action.title ?? projectName,
    });
    setActiveAction(resolveActionWorkspace(action, intelligence.memoryAction));
  };

  const handleStartById = (source: string, actionId?: string) => {
    if (!actionId) {
      const fallback = intelligence.todayActions[0];
      if (fallback) openAction(fallback, source);
      return;
    }
    const action = intelligence.todayActions.find((item) => item.id === actionId);
    if (action) {
      openAction(action, source);
      return;
    }
    const resolved = resolveActionById(actionId, intelligence.todayActions, intelligence.memoryAction);
    if (resolved) setActiveAction(resolved);
  };

  const handleActionComplete = (result: ActionWorkspaceResult) => {
    const update = applyActionCompletionUpdate(
      {
        projectId,
        goalId,
        confidence,
        scoreBefore: intelligence.successScore.percent,
      },
      result,
    );

    append({
      category: 'evidence',
      title: 'evidenceGenerated',
      summary: update.evidenceSummary,
    });
    append({
      category: 'activity',
      title: 'actionCompleted',
      summary: result.title,
    });

    analytics.trackMockActionCompleted(result.actionId, update.scoreAfter);
    setActiveAction(null);
    setCompletionUpdate(update);
  };

  const handleDebriefContinue = () => {
    if (completionUpdate) {
      setRecentScoreUpdate({
        delta: completionUpdate.scoreDelta,
        after: completionUpdate.scoreAfter,
        actionTitle: completionUpdate.debrief.actionTitle,
      });
    }
    setCompletionUpdate(null);
    setRefreshKey((key) => key + 1);
  };

  const showWeeklyReview =
    (intelligence.behavior && intelligence.behavior.visitCount >= 2) || isFriday();

  const primaryAction = intelligence.todayActions[0];
  const actionHistory = intelligence.behavior?.actionHistory ?? [];
  const operatingState = intelligence.operatingState;
  const evidence = operatingState?.evidence ?? [];

  return (
    <>
      {activeAction ? (
        <FounderActionWorkspace
          workspace={activeAction}
          scoreBefore={intelligence.successScore.percent}
          onComplete={handleActionComplete}
          onClose={() => setActiveAction(null)}
        />
      ) : null}

      {completionUpdate ? (
        <FounderActionDebrief
          debrief={completionUpdate.debrief}
          onContinue={handleDebriefContinue}
        />
      ) : null}

      <div className="space-y-6">
        <FounderTodayHero
          score={intelligence.successScore}
          primaryAction={primaryAction}
          recentScoreUpdate={recentScoreUpdate}
          onStart={() =>
            handleStartById(
              primaryAction ? `hero_${primaryAction.id}` : 'hero_primary',
              primaryAction?.id,
            )
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
          <FounderTodayOutcomeStrip
            score={intelligence.successScore}
            primaryAction={primaryAction}
          />
          {operatingState?.timeline ? (
            <FounderAiPmWorkLog
              timeline={operatingState.timeline}
              evidence={evidence}
            />
          ) : null}
        </div>

        <details className="rounded-2xl border border-border/60 bg-muted/10">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted-foreground">
            {t('projectStateSummary')}
          </summary>
          <div className="space-y-8 border-t border-border/60 px-5 py-6">
            <FounderProjectHealthDashboard
              successScore={intelligence.successScore.percent}
              businessProgress={intelligence.businessProgress}
              behavior={intelligence.behavior}
            />

            <FounderJourneyMap
              businessProgress={intelligence.businessProgress}
              nextAction={primaryAction}
            />

            {operatingState?.timeline ? (
              <FounderOperatingTimelinePanel timeline={operatingState.timeline} />
            ) : null}

            <DecisionOneLinePanel fallbackConfidence={confidence} />

            <FounderSuccessScoreExplained
              score={intelligence.successScore}
              factors={intelligence.successScoreFactors}
              primaryAction={primaryAction}
            />

            <FounderTodayActionFirst
              score={intelligence.successScore}
              actions={intelligence.todayActions}
              totalMinutes={intelligence.totalEtaMinutes}
              onStartAction={(actionId) => handleStartById(`action_${actionId}`, actionId)}
            />

            <FounderEvidenceAutoPanel evidence={evidence} />

            <FounderActionHistoryPanel history={actionHistory} />

            {operatingState?.lastDebrief ? (
              <FounderDailyReviewPanel review={intelligence.dailyReview} />
            ) : null}

            {showWeeklyReview ? (
              <FounderWeeklyCeoReviewPanel review={intelligence.weeklyCeoReview} />
            ) : null}

            <FounderSuccessScorePanel
              score={intelligence.successScore}
              factors={intelligence.successScoreFactors}
            />

            <FounderMemoryRecallPanel
              memoryAction={intelligence.memoryAction}
              behavior={intelligence.behavior}
              onStart={() =>
                handleStartById('memory_action', intelligence.todayActions[0]?.id)
              }
            />

            <FounderGrowthTimelinePanel behavior={intelligence.behavior} />

            <div className="grid gap-6 lg:grid-cols-2">
              <BusinessProgressPanel dimensions={intelligence.businessProgress} />
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
          </div>
        </details>
      </div>
    </>
  );
}
