'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { applyActionCompletionUpdate } from '../lib/apply-action-completion-update';
import type { ActionCompletionUpdateResult } from '../lib/apply-action-completion-update';
import { recordFounderActionStarted } from '../lib/founder-behavior-store';
import { resolveActionById, resolveActionWorkspace } from '../lib/founder-action-resolver';
import { resolveFounderActionTitle } from '../lib/founder-action-display';
import { buildAiPmInboxItems } from '../lib/founder-ai-pm-inbox';
import { resolveStageIndex } from '../lib/founder-ai-pm-engine';
import {
  buildAiPmDailyReport,
  buildAiPmMemoryBrief,
} from '../lib/founder-autonomous-ai-pm';
import { buildLivingProjectBrief } from '../lib/founder-living-project';
import { buildAiOperatingSystemBrief } from '../lib/founder-ai-operating-system';
import {
  buildAiPmDecisionBox,
  buildAiPmMeetingBrief,
  buildAiPmRecommendationBrief,
  buildMeetingCloseNarrative,
} from '../lib/founder-ai-pm-meeting';
import { buildDailyCeoOperatingBrief } from '../lib/founder-daily-ceo-loop';
import { buildDailyCeoHabitBrief } from '../lib/founder-daily-ceo-habit';
import {
  mergeHabitWithOvernightSnapshot,
  runOvernightInvestigation,
  type OvernightInvestigationSnapshot,
} from '../lib/founder-background-ai';
import {
  loadOvernightSnapshot,
  saveOvernightSnapshot,
  shouldRunOvernightSync,
} from '../lib/founder-background-ai-store';
import {
  approveActionId,
  loadApprovedActionIds,
  loadOvernightViewed,
  loadTodayApproval,
  markOvernightViewed,
  type TodayApprovalChoice,
} from '../lib/founder-daily-ceo-store';
import { buildCompetitiveIntelligence } from '../lib/founder-competitive-intelligence';
import { buildExplainableJudgment } from '../lib/founder-explainable-judgment';
import { computeFounderIntelligenceBrief } from '../lib/founder-intelligence-engine';
import type { GeneratedTodayAction } from '../lib/founder-intelligence-engine';
import {
  buildAiPmSurpriseFindings,
  buildCompetitorCompareVerification,
  buildResearchCompleteBrief,
} from '../lib/founder-research-trust';
import {
  buildResearchInsightItems,
} from '../lib/founder-research-insights';
import {
  countResearchMaterials,
} from '../lib/founder-research-sources';
import type { WorkflowGoalId } from '../types';
import { DecisionExperienceCoach } from './decision-experience-coach';
import { WorkspaceShell } from './workspace-shell';
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
import {
  FounderAiPmOfficeHeader,
  FounderAiPmOvernightReportPanel,
  FounderAiPmDailyReportPanel,
  FounderAiPmMemoryBriefPanel,
  FounderCeoInboxPanel,
  FounderCeoMorningBriefPanel,
  FounderTodayFocusPanel,
  FounderWhatChangedPanel,
} from './founder-ai-pm/founder-daily-ceo-panels';
import {
  FounderLivingDailyJournalPanel,
  FounderLivingFounderPatternPanel,
  FounderLivingMilestoneCelebrationPanel,
  FounderLivingMomentumPanel,
  FounderLivingProjectHistoryPanel,
  FounderLivingStuckAlertPanel,
  FounderLivingWeeklyStoryPanel,
  FounderOvernightInvestigationPanel,
} from './founder-ai-pm/founder-living-project-panels';
import { FounderAiOperatingSystemSection } from './founder-ai-pm/founder-ai-os-panels';
import { FounderAiPmLiveWorkPanel } from './founder-ai-pm/founder-ai-pm-live-work-panel';
import { FounderInformationBuilder } from './founder-ai-pm/founder-information-builder';
import { FounderCompetitiveGapMap } from './founder-ai-pm/founder-competitive-gap-map';
import { FounderAiPmDiscoveryPanel } from './founder-ai-pm/founder-ai-pm-discovery-panel';
import { FounderAiPmCalendar } from './founder-ai-pm/founder-ai-pm-calendar';
import {
  FounderAiPmStrategyPanel,
  FounderCompetitorComparePanel,
  FounderMarketGapPanel,
  FounderWinStrategyPanel,
} from './founder-ai-pm/founder-competitive-intelligence-panels';
import { FounderAiPmMeetingClose } from './founder-ai-pm/founder-ai-pm-meeting-close';
import { FounderAiPmMeetingPanel } from './founder-ai-pm/founder-ai-pm-meeting-panel';
import { FounderAiRecommendationPanel } from './founder-ai-pm/founder-ai-recommendation-panel';
import { FounderDecisionBoxPanel } from './founder-ai-pm/founder-decision-box-panel';
import {
  FounderAiPmPreparedTasks,
} from './founder-ai-pm/founder-ai-pm-work-console';
import { FounderResearchCompletePanel } from './founder-ai-pm/founder-research-complete-panel';
import { FounderResearchSourcePanel } from './founder-ai-pm/founder-research-source-panel';
import { FounderValidationAccuracyPanel } from './founder-ai-pm/founder-validation-accuracy-panel';
import { FounderAiPmInbox } from './founder-ai-pm/founder-ai-pm-inbox';
import { FounderAiPmProactiveQuestion } from './founder-ai-pm/founder-ai-pm-proactive-question';
import { FounderAiPmWorkLog } from './founder-ai-pm/founder-ai-pm-work-log';
import { FounderDailyGoalPanel } from './founder-ai-pm/founder-daily-goal-panel';
import { FounderDailyReviewPanel } from './founder-ai-pm/founder-daily-review-panel';
import { FounderEvidenceAutoPanel } from './founder-ai-pm/founder-evidence-auto-panel';
import { FounderGrowthTimelinePanel } from './founder-ai-pm/founder-growth-timeline-panel';
import { FounderJourneyMap } from './founder-ai-pm/founder-journey-map';
import { FounderOperatingTimelinePanel } from './founder-ai-pm/founder-operating-timeline-panel';
import { FounderProjectHealthDashboard } from './founder-ai-pm/founder-project-health-dashboard';
import { FounderSuccessScoreExplained } from './founder-ai-pm/founder-success-score-explained';
import { FounderSuccessScorePanel } from './founder-ai-pm/founder-success-score-panel';
import { FounderTodayActionFirst } from './founder-ai-pm/founder-today-action-first';
import { FounderExecutiveDecisionBoardLoader } from './founder-ai-pm/founder-executive-decision-board-loader';
import { FounderExecutiveOperatingRail } from './founder-ai-pm/founder-executive-operating-rail';
import { FounderTodayOutcomeStrip } from './founder-ai-pm/founder-today-outcome-strip';
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
  const tDaily = useTranslations('workflow.founderAiPm.dailyCeo');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const analytics = useJourneyAnalytics();
  const { entries: historyEntries, append } = useJourneyHistory(projectId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [infoRefreshKey, setInfoRefreshKey] = useState(0);
  const [activeAction, setActiveAction] = useState<ReturnType<typeof resolveActionWorkspace> | null>(
    null,
  );
  const [completionUpdate, setCompletionUpdate] = useState<ActionCompletionUpdateResult | null>(
    null,
  );
  const [approvalChoice, setApprovalChoice] = useState<TodayApprovalChoice>('pending');
  const [approvedActionIds, setApprovedActionIds] = useState<string[]>([]);
  const [liveWorkActionId, setLiveWorkActionId] = useState<string | null>(null);
  const [liveWorkTitle, setLiveWorkTitle] = useState('');
  const [overnightViewed, setOvernightViewed] = useState(false);
  const [overnightSnapshot, setOvernightSnapshot] = useState<OvernightInvestigationSnapshot | null>(
    null,
  );
  const [overnightSyncing, setOvernightSyncing] = useState(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const overnightSyncStarted = useRef(false);

  useEffect(() => {
    overnightSyncStarted.current = false;
  }, [projectId]);

  useEffect(() => {
    setApprovalChoice(loadTodayApproval(projectId));
    setApprovedActionIds(loadApprovedActionIds(projectId));
    setOvernightViewed(loadOvernightViewed(projectId));
    setOvernightSnapshot(loadOvernightSnapshot(projectId));
  }, [projectId, refreshKey]);

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId, refreshKey],
  );

  useEffect(() => {
    if (overnightSyncStarted.current) return;
    if (!shouldRunOvernightSync(projectId)) return;
    overnightSyncStarted.current = true;
    setOvernightSyncing(true);

    const ideaSummary = intelligence.behavior?.ideaSummary ?? projectName;
    void runOvernightInvestigation({
      projectId,
      projectTitle: projectName,
      ideaSummary,
      goalId,
      previousSuccessScore: intelligence.successScore.percent,
    })
      .then((snapshot) => {
        saveOvernightSnapshot(snapshot);
        setOvernightSnapshot(snapshot);
        setRefreshKey((key) => key + 1);
      })
      .finally(() => {
        setOvernightSyncing(false);
      });
  }, [
    goalId,
    intelligence.behavior?.ideaSummary,
    intelligence.successScore.percent,
    projectId,
    projectName,
  ]);

  const pipeline = useMemo(
    () => loadAgentPipelineResult(),
    [intelligence.fromAgentPipeline, refreshKey],
  );

  const explainableJudgment = useMemo(
    () =>
      buildExplainableJudgment(
        pipeline,
        intelligence.successScore.percent,
        intelligence.businessProgress,
        intelligence.successScoreFactors,
      ),
    [intelligence.businessProgress, intelligence.successScore.percent, intelligence.successScoreFactors, pipeline],
  );

  const researchSources = useMemo(() => buildResearchInsightItems(pipeline), [pipeline]);
  const researchMaterialCount = useMemo(() => countResearchMaterials(pipeline), [pipeline]);

  const competitiveIntelligence = useMemo(
    () => buildCompetitiveIntelligence(pipeline, intelligence.businessProgress),
    [intelligence.businessProgress, pipeline],
  );

  const researchComplete = useMemo(
    () => buildResearchCompleteBrief(pipeline, researchMaterialCount),
    [pipeline, researchMaterialCount],
  );

  const surpriseFindings = useMemo(
    () => buildAiPmSurpriseFindings(pipeline, intelligence.businessProgress),
    [intelligence.businessProgress, pipeline],
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
    () => buildAiPmMeetingBrief(pipeline, explainableJudgment, intelligence.businessProgress),
    [explainableJudgment, intelligence.businessProgress, pipeline],
  );

  const decisionBox = useMemo(
    () => buildAiPmDecisionBox(pipeline, intelligence.businessProgress, intelligence.todayActions[0]),
    [intelligence.businessProgress, intelligence.todayActions, pipeline],
  );

  const recommendationBrief = useMemo(
    () => buildAiPmRecommendationBrief(pipeline, explainableJudgment, intelligence.businessProgress),
    [explainableJudgment, intelligence.businessProgress, pipeline],
  );

  const meetingCloseMessages = useMemo(
    () => buildMeetingCloseNarrative(meetingBrief, decisionBox),
    [decisionBox, meetingBrief],
  );

  const primaryAction = intelligence.todayActions[0];
  const actionHistory = intelligence.behavior?.actionHistory ?? [];
  const operatingState = intelligence.operatingState;
  const evidence = operatingState?.evidence ?? [];

  const inboxItems = useMemo(
    () => buildAiPmInboxItems(intelligence.businessDeltas, evidence, intelligence.todayActions),
    [evidence, intelligence.businessDeltas, intelligence.todayActions],
  );

  const dailyCeoBrief = useMemo(
    () =>
      buildDailyCeoOperatingBrief({
        projectId,
        behavior: intelligence.behavior,
        scorePercent: intelligence.successScore.percent,
        primaryAction,
        businessDeltas: intelligence.businessDeltas,
        evidence,
        todayActions: intelligence.todayActions,
        dailyReview: intelligence.dailyReview,
        weeklyReview: intelligence.weeklyCeoReview,
        pipeline,
      }),
    [
      evidence,
      intelligence.behavior,
      intelligence.businessDeltas,
      intelligence.dailyReview,
      intelligence.successScore.percent,
      intelligence.todayActions,
      intelligence.weeklyCeoReview,
      pipeline,
      primaryAction,
      projectId,
    ],
  );

  const resolveActionTitle = (action: GeneratedTodayAction) =>
    resolveFounderActionTitle(action, td, tDaily('approvalQueue.fallbackAction'));

  const dailyReport = useMemo(
    () =>
      buildAiPmDailyReport({
        behavior: intelligence.behavior,
        scorePercent: intelligence.successScore.percent,
        dailyReview: intelligence.dailyReview,
        tomorrowFocus: resolveActionTitle(primaryAction ?? intelligence.todayActions[0]!),
        goImpact: dailyCeoBrief.todayGoImpact,
      }),
    [
      dailyCeoBrief.todayGoImpact,
      intelligence.behavior,
      intelligence.dailyReview,
      intelligence.successScore.percent,
      intelligence.todayActions,
      primaryAction,
      td,
      tDaily,
    ],
  );

  const livingBrief = useMemo(
    () =>
      buildLivingProjectBrief({
        projectId,
        behavior: intelligence.behavior,
        progress: intelligence.businessProgress,
        stageIndex: resolveStageIndex(confidence),
        weeklyReview: intelligence.weeklyCeoReview,
        dailyReview: intelligence.dailyReview,
        scorePercent: intelligence.successScore.percent,
        todayActions: intelligence.todayActions,
        resolveTitle: resolveActionTitle,
      }),
    [
      confidence,
      intelligence.behavior,
      intelligence.businessProgress,
      intelligence.dailyReview,
      intelligence.successScore.percent,
      intelligence.todayActions,
      intelligence.weeklyCeoReview,
      projectId,
      td,
      tDaily,
    ],
  );

  const osBrief = useMemo(
    () =>
      buildAiOperatingSystemBrief({
        behavior: intelligence.behavior,
        progress: intelligence.businessProgress,
        weeklyReview: intelligence.weeklyCeoReview,
        dailyReview: intelligence.dailyReview,
        scorePercent: intelligence.successScore.percent,
        stuck: livingBrief.stuckAlert,
        todayActions: intelligence.todayActions,
        resolveTitle: resolveActionTitle,
      }),
    [
      intelligence.behavior,
      intelligence.businessProgress,
      intelligence.dailyReview,
      intelligence.successScore.percent,
      intelligence.todayActions,
      intelligence.weeklyCeoReview,
      livingBrief.stuckAlert,
      td,
      tDaily,
    ],
  );

  const memoryBrief = useMemo(
    () =>
      buildAiPmMemoryBrief({
        behavior: intelligence.behavior,
        memoryAction: intelligence.memoryAction,
        todayActions: intelligence.todayActions,
        resolveTitle: resolveActionTitle,
      }),
    [intelligence.behavior, intelligence.memoryAction, intelligence.todayActions, td, tDaily],
  );

  const habitBriefBase = useMemo(
    () =>
      buildDailyCeoHabitBrief({
        projectId,
        behavior: intelligence.behavior,
        businessDeltas: intelligence.businessDeltas,
        todayActions: intelligence.todayActions,
        resolveTitle: resolveActionTitle,
      }),
    [
      intelligence.behavior,
      intelligence.businessDeltas,
      intelligence.todayActions,
      projectId,
      td,
      tDaily,
    ],
  );

  const habitBrief = useMemo(() => {
    const merged = mergeHabitWithOvernightSnapshot(
      overnightSnapshot,
      habitBriefBase.morningChanges,
      habitBriefBase.whatChanged,
      habitBriefBase.overnightReport,
    );
    return {
      ...habitBriefBase,
      morningChanges: merged.morningChanges,
      whatChanged: merged.whatChanged,
      overnightReport: merged.overnightReport,
    };
  }, [habitBriefBase, overnightSnapshot]);

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

  const startByIdRef = useRef(handleStartById);
  startByIdRef.current = handleStartById;

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
    setCompletionUpdate(null);
    setRefreshKey((key) => key + 1);
  };

  const showWeeklyReview =
    (intelligence.behavior && intelligence.behavior.visitCount >= 2) || isFriday();

  const handleOvernightView = () => {
    markOvernightViewed(projectId);
    setOvernightViewed(true);
    setShowAnalysisDetails(true);
  };

  const handleApproveQueueItem = (actionId: string) => {
    const action = intelligence.todayActions.find((entry) => entry.id === actionId);
    const approved = approveActionId(projectId, actionId);
    setApprovedActionIds(approved);
    setApprovalChoice('approved');
    setLiveWorkTitle(action ? resolveActionTitle(action) : tDaily('approvalQueue.fallbackAction'));
    setLiveWorkActionId(actionId);
  };

  const handleLiveWorkComplete = useCallback(() => {
    setLiveWorkActionId((currentId) => {
      if (currentId) {
        startByIdRef.current(`ceo_queue_${currentId}`, currentId);
      }
      return null;
    });
  }, []);

  return (
    <>
      {activeAction ? (
        <FounderActionWorkspace
          workspace={activeAction}
          scoreBefore={intelligence.successScore.percent}
          onComplete={handleActionComplete}
          onClose={() => setActiveAction(null)}
          projectId={projectId}
          projectName={projectName}
          goalId={goalId}
          confidence={confidence}
        />
      ) : null}

      {completionUpdate ? (
        <FounderActionDebrief
          debrief={completionUpdate.debrief}
          onContinue={handleDebriefContinue}
          projectId={projectId}
          projectName={projectName}
          goalId={goalId}
          confidence={confidence}
        />
      ) : null}

      <WorkspaceShell
        embedded
        rail={
          <>
            <FounderExecutiveOperatingRail
              habit={habitBrief}
              livingMorningContext={livingBrief.morningContext}
              overnightSnapshot={overnightSnapshot}
              overnightSyncing={overnightSyncing}
              approvedActionIds={approvedActionIds}
              liveWorkActionId={liveWorkActionId}
              liveWorkTitle={liveWorkTitle}
              onApprove={handleApproveQueueItem}
              onLiveWorkComplete={handleLiveWorkComplete}
              onOvernightView={handleOvernightView}
              scoreBefore={completionUpdate?.scoreBefore}
              scoreAfter={completionUpdate?.scoreAfter}
              lastActionTitle={completionUpdate?.debrief.actionTitle}
            />
            <details className="rounded-2xl border border-border/60 bg-muted/10">
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted-foreground">
                {tDaily('analysisDetails')}
              </summary>
              <div className="space-y-6 border-t border-border/60 px-5 py-6">
                <FounderAiPmWorkLog evidence={evidence} history={historyEntries} />
                <FounderCeoInboxPanel
                  items={inboxItems}
                  pendingCount={dailyCeoBrief.pendingInboxCount}
                  onReview={(actionId) => handleStartById(`ceo_inbox_${actionId ?? 'primary'}`, actionId)}
                />
                <FounderAiOperatingSystemSection brief={osBrief} onApprove={handleApproveQueueItem} />
              </div>
            </details>
          </>
        }
        main={
          <FounderExecutiveDecisionBoardLoader
            projectId={projectId}
            projectName={projectName}
            goalId={goalId}
            confidence={confidence}
            onStartAction={(actionId) => handleStartById(`decision_${actionId}`, actionId)}
            onApproveAction={handleApproveQueueItem}
          />
        }
      />
    </>
  );
}
