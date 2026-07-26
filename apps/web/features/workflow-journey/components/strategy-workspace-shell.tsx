'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { saveAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { getPreviousSuccessScore, syncLearningFromPipeline } from '@/lib/agents/learning-store';
import { runStrategyPipeline } from '@/lib/agents/run-strategy-pipeline';
import { BETA_VERSION } from '@/lib/site/beta-config';
import { Button, toast } from '@repo/ui';

import { getStrategyCoachState } from '../constants/decision-mock';
import { getStepGuideMeta } from '../constants/step-guides';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { useJourneyProject } from '../hooks/use-journey-project';
import { useWorkspaceExitCoach } from '../hooks/use-workspace-exit-coach';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { AiPmCompletionHandoff } from './ai-state/ai-pm-completion-handoff';
import { AiPmLiveWorkspace } from './ai-state/ai-pm-live-workspace';
import { DecisionOneLinePanel } from './founder-ai-pm/decision-one-line-panel';
import { BetaFeedbackModal } from './beta-feedback-modal';
import { CoachSkeleton } from './coach-skeleton';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';
import { WorkflowGuideCard } from './workflow-guide-card';
import { WorkspaceSkeleton } from './workspace-skeleton';
import { FounderTodayWorkspace } from './founder-today-workspace';
import { WorkspaceSettingsPanel } from './intelligence-workspace/workspace-settings-panel';
import { JourneyProjectPanel } from './intelligence-workspace/journey-project-panel';
import { JourneyProgressRing } from './intelligence-workspace/journey-progress-ring';
import { JourneyProjectSwitcher } from './intelligence-workspace/journey-project-switcher';
import { JourneyHistoryPanel } from './intelligence-workspace/journey-history-panel';
import {
  ProjectRegistrationPanel,
  loadProjectRegistration,
  type ProjectRegistrationData,
} from './project-registration-panel';
import {
  JourneyWorkspaceNav,
  type JourneyWorkspaceTab,
} from './intelligence-workspace/journey-workspace-nav';
import { AI_PM_WORK_COUNT } from '../lib/ai-pm-conversation';
import { WorkspaceJourneyGuide } from './workspace-journey-guide';
import { WorkspaceShell } from './workspace-shell';

import { DecisionDetailWorkspace } from './decision-detail-workspace';

const DecisionExperienceCoach = dynamic(
  () => import('./decision-experience-coach').then((m) => m.DecisionExperienceCoach),
  { loading: () => <CoachSkeleton /> },
);

type WorkspacePhase = 'registration' | 'thinking' | 'complete' | 'active';

type StrategyWorkspaceShellProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
  demoMode?: boolean;
};

const PIPELINE_AGENT_INTERVAL_MS = 2200;

export function StrategyWorkspaceShell({
  goalId,
  template,
  demoMode = false,
}: StrategyWorkspaceShellProps) {
  const t = useTranslations('workflow.workspace');
  const tg = useTranslations('workflow.goal');
  const coachState = getStrategyCoachState(goalId);
  const activeStepId = coachState.nextActionStepId;
  const activeStep = template.steps.find((s) => s.id === activeStepId) ?? template.steps[0];
  const stepMeta = getStepGuideMeta(activeStep?.id ?? 'context');
  const tt = useTranslations('workflow.toast');
  const analytics = useJourneyAnalytics(demoMode);

  const [phase, setPhase] = useState<WorkspacePhase>('registration');
  const [pipelineAgentIndex, setPipelineAgentIndex] = useState(0);
  const [thinkingFailed, setThinkingFailed] = useState(false);
  const { project, projectId, setProjectId, ready: projectReady } = useJourneyProject();
  const { append: appendHistory } = useJourneyHistory(projectId);
  const [tab, setTab] = useState<JourneyWorkspaceTab>('today');
  const [registration, setRegistration] = useState<ProjectRegistrationData | null>(null);

  useWorkspaceExitCoach(phase === 'active' && projectReady);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = loadProjectRegistration();
    if (saved) setRegistration(saved);
    if (sessionStorage.getItem('ll_project_started') === '1') {
      setPhase('active');
    }
    if (sessionStorage.getItem('workspace_toast') === '1') {
      sessionStorage.removeItem('workspace_toast');
      toast.success(tt('workspaceReady'));
    }
  }, [tt]);

  useEffect(() => {
    if (phase !== 'active' || !projectReady) return;
    analytics.trackWorkspaceLoaded(goalId, coachState.verdict);
  }, [analytics, coachState.verdict, goalId, phase, projectReady]);

  const showCompletionHandoff = useCallback(() => {
    setPipelineAgentIndex(AI_PM_WORK_COUNT);
    setPhase('complete');
  }, []);

  const enterTodayWorkspace = useCallback(() => {
    sessionStorage.setItem('ll_project_started', '1');
    setTab('today');
    setPhase('active');
    analytics.trackAnalysisStarted(goalId);
    toast.success(tt('analysisReady'));
  }, [analytics, goalId, tt]);

  const runAnalysis = useCallback(() => {
    setThinkingFailed(false);
    setPipelineAgentIndex(0);

    const reg = registration ?? loadProjectRegistration();
    if (!reg) {
      setThinkingFailed(true);
      return undefined;
    }

    analytics.trackAgentPipelineStarted(goalId, projectId);

    const agentTimer = window.setInterval(() => {
      setPipelineAgentIndex((prev) => Math.min(prev + 1, AI_PM_WORK_COUNT - 1));
    }, PIPELINE_AGENT_INTERVAL_MS);

    void runStrategyPipeline(
      {
        projectId,
        projectTitle: reg.projectName,
        ideaSummary: reg.ideaOneLiner ?? reg.projectName,
        goalId,
        locale: typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'ko',
        previousSuccessScore: getPreviousSuccessScore(projectId),
      },
      {
        onRetry: (attempt, error) => {
          analytics.trackAgentPipelineRetry(goalId, attempt, error);
        },
        onRecovery: () => {
          analytics.trackAgentPipelineRecovery(goalId);
        },
        onSuccess: (data, recovered) => {
          saveAgentPipelineResult(data);
          const score = data.founderOs?.successScore.percent ?? data.growth.metrics?.successScore ?? 0;
          syncLearningFromPipeline(projectId, data.learning, score);
          const verdict = data.decision?.verdict ?? coachState.verdict;
          analytics.trackAgentPipelineSuccess(goalId, verdict, { recovered });
          analytics.trackAnalysisCompleted(goalId, verdict);
          analytics.trackDecisionGenerated(verdict, goalId);
        },
        onFailure: (error, attempts) => {
          analytics.trackAgentPipelineFailed(goalId, error, attempts);
        },
      },
    ).then((outcome) => {
      window.clearInterval(agentTimer);
      if (outcome.ok) {
        showCompletionHandoff();
        return;
      }
      setThinkingFailed(true);
      void runStrategyPipeline(
        {
          projectId,
          projectTitle: reg.projectName,
          ideaSummary: reg.ideaOneLiner ?? reg.projectName,
          goalId,
          locale: typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'ko',
          previousSuccessScore: getPreviousSuccessScore(projectId),
        },
        { maxAttempts: 1, timeoutMs: 20_000 },
      ).then((retry) => {
        if (retry.ok) {
          saveAgentPipelineResult(retry.data);
          showCompletionHandoff();
        }
      });
    });

    return () => {
      window.clearInterval(agentTimer);
    };
  }, [analytics, coachState.verdict, goalId, projectId, registration, showCompletionHandoff]);

  useEffect(() => {
    if (phase !== 'thinking') return undefined;
    return runAnalysis();
  }, [phase, runAnalysis]);

  const handleRegistrationStart = (data: ProjectRegistrationData) => {
    setRegistration(data);
    analytics.trackProjectStarted(data.projectName, goalId);
    analytics.trackProjectCreated(data.projectName, goalId);
    appendHistory({
      category: 'workflow',
      title: 'projectStart',
      summary: data.projectName,
    });
    setPhase('thinking');
  };

  const guideStep =
    phase === 'registration' ? 'project' : phase === 'thinking' ? 'research' : 'decision';

  const projectDisplayName =
    registration?.projectName ?? project.name ?? tg(`options.${goalId}.title`);

  const renderActiveTab = () => {
    switch (tab) {
      case 'today':
        return (
          <FounderTodayWorkspace
            goalId={goalId}
            projectId={projectId}
            projectName={projectDisplayName}
            confidence={project.confidence}
          />
        );
      case 'project':
        return <JourneyProjectPanel />;
      case 'workflow':
        return activeStep ? (
          <WorkflowGuideCard
            stepId={activeStep.id}
            order={activeStep.order}
            meta={stepMeta}
            active
          />
        ) : null;
      case 'decision':
        return (
          <div className="space-y-8">
            <DecisionOneLinePanel fallbackConfidence={project.confidence} />
            <DecisionExperienceCoach
              goalId={goalId}
              projectId={projectId}
              className="w-full max-w-none"
              layout="action-first"
            />
            <DecisionDetailWorkspace goalId={goalId} />
          </div>
        );
      case 'history':
        return <JourneyHistoryPanel projectId={projectId} />;
      case 'settings':
        return (
          <WorkspaceSettingsPanel
            projectName={registration?.projectName}
            idea={registration?.ideaOneLiner}
          />
        );
      default:
        return null;
    }
  };

  if (phase === 'thinking') {
    return (
      <AiPmLiveWorkspace
        agentIndex={Math.min(pipelineAgentIndex, AI_PM_WORK_COUNT - 1)}
        failed={thinkingFailed}
        projectId={projectId}
        projectName={registration?.projectName ?? projectDisplayName}
        goalId={goalId}
        confidence={project.confidence}
        onRetry={() => {
          setThinkingFailed(false);
          setPhase('thinking');
        }}
        onCancel={() => {
          setThinkingFailed(false);
          setPhase('registration');
        }}
        onSkipToToday={showCompletionHandoff}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <JourneyLayout
        phase="workspace"
        width="wide"
        variant="intelligence"
        versionLabel={BETA_VERSION}
      >
        <AiPmCompletionHandoff
          onStartToday={enterTodayWorkspace}
          embedded
          projectId={projectId}
          projectName={registration?.projectName ?? projectDisplayName}
          goalId={goalId}
          confidence={project.confidence}
        />
      </JourneyLayout>
    );
  }

  return (
    <JourneyLayout
      phase="workspace"
      width="wide"
      variant="intelligence"
      versionLabel={BETA_VERSION}
      navSlot={
        phase === 'active' ? (
          <JourneyWorkspaceNav
            active={tab}
            onChange={(next) => {
              setTab(next);
              analytics.trackMockActionCompleted(`tab_${next}`, project.confidence);
            }}
          />
        ) : null
      }
    >
      <BetaFeedbackModal />
      {phase === 'registration' ? (
        <JourneyFade>
          <WorkspaceShell
            embedded
            rail={<WorkspaceJourneyGuide activeStep={guideStep} />}
            main={
              <ProjectRegistrationPanel
                goalLabel={tg(`options.${goalId}.title`)}
                onStart={handleRegistrationStart}
              />
            }
          />
        </JourneyFade>
      ) : !projectReady ? (
        <WorkspaceSkeleton />
      ) : tab === 'today' ? (
        <JourneyFade>
          <FounderTodayWorkspace
            goalId={goalId}
            projectId={projectId}
            projectName={projectDisplayName}
            confidence={project.confidence}
          />
        </JourneyFade>
      ) : (
        <JourneyFade>
          <WorkspaceShell
            embedded
            rail={<WorkspaceJourneyGuide activeStep={guideStep} />}
            main={
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <JourneyProjectSwitcher project={project} onSelect={setProjectId} />
                    <div>
                      <p className="text-sm text-muted-foreground">{projectDisplayName}</p>
                      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                        {t('title')}
                      </h1>
                    </div>
                  </div>
                  <JourneyProgressRing
                    value={project.confidence}
                    label={t('progressLabel')}
                    size={72}
                  />
                </div>
                {renderActiveTab()}
                <div className="pt-2">
                  <Button asChild size="lg" className="h-12 w-full rounded-xl sm:max-w-md">
                    <Link href="/auth/login?next=/workspace">
                      {demoMode ? t('ctaLogin') : t('ctaContinue')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </>
            }
          />
        </JourneyFade>
      )}
    </JourneyLayout>
  );
}
