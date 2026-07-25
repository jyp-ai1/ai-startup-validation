'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { BETA_VERSION } from '@/lib/site/beta-config';
import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { Button, toast } from '@repo/ui';

import { getStrategyCoachState } from '../constants/decision-mock';
import { getStepGuideMeta } from '../constants/step-guides';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { useJourneyProject } from '../hooks/use-journey-project';
import { useWorkspaceExitCoach } from '../hooks/use-workspace-exit-coach';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { AiThinkingOverlay } from './ai-thinking-overlay';
import { BetaFeedbackModal } from './beta-feedback-modal';
import { CoachSkeleton } from './coach-skeleton';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';
import { WorkflowGuideCard } from './workflow-guide-card';
import { WorkspaceSkeleton } from './workspace-skeleton';
import { JourneyDailyCoach } from './intelligence-workspace/journey-daily-coach';
import { WorkspaceMorningBrief } from './intelligence-workspace/workspace-morning-brief';
import { WorkspaceReportPreview } from './intelligence-workspace/workspace-report-preview';
import { WorkspaceSettingsPanel } from './intelligence-workspace/workspace-settings-panel';
import { WorkspaceWorkflowRecommendation } from './intelligence-workspace/workspace-workflow-recommendation';
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
import { WorkspaceJourneyGuide } from './workspace-journey-guide';

import { DecisionDetailWorkspace } from './decision-detail-workspace';

const DecisionExperienceCoach = dynamic(
  () => import('./decision-experience-coach').then((m) => m.DecisionExperienceCoach),
  { loading: () => <CoachSkeleton /> },
);

type WorkspacePhase = 'registration' | 'thinking' | 'active';

type StrategyWorkspaceShellProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
  demoMode?: boolean;
};

const ANALYSIS_MS = 2800;
const ANALYSIS_STEPS = 4;

export function StrategyWorkspaceShell({
  goalId,
  template,
  demoMode = false,
}: StrategyWorkspaceShellProps) {
  const t = useTranslations('workflow.workspace');
  const ta = useTranslations('workflow.analysis');
  const te = useTranslations('workflow.epic3');
  const tg = useTranslations('workflow.goal');
  const tc = useTranslations('workflow.compose.goals');
  const coachState = getStrategyCoachState(goalId);
  const activeStepId = coachState.nextActionStepId;
  const activeStep = template.steps.find((s) => s.id === activeStepId) ?? template.steps[0];
  const stepMeta = getStepGuideMeta(activeStep?.id ?? 'context');
  const tt = useTranslations('workflow.toast');
  const analytics = useJourneyAnalytics(demoMode);

  const analysisStepLabels = useMemo(
    () => [
      ta('steps.market'),
      ta('steps.competitor'),
      ta('steps.decision'),
      ta('steps.evidence'),
    ],
    [ta],
  );

  const [phase, setPhase] = useState<WorkspacePhase>('registration');
  const [thinkingStep, setThinkingStep] = useState(0);
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

  const runAnalysis = useCallback(() => {
    setThinkingFailed(false);
    setThinkingStep(0);
    let completed = false;

    const timeoutTimer = window.setTimeout(() => {
      if (!completed) setThinkingFailed(true);
    }, 10_000);

    const stepDelay = ANALYSIS_MS / ANALYSIS_STEPS;
    const timers = [
      window.setTimeout(() => setThinkingStep(1), stepDelay * 0.25),
      window.setTimeout(() => setThinkingStep(2), stepDelay * 0.5),
      window.setTimeout(() => setThinkingStep(3), stepDelay * 0.75),
      window.setTimeout(() => {
        completed = true;
        clearTimeout(timeoutTimer);
        setPhase('active');
        analytics.trackAnalysisStarted(goalId);
        analytics.trackDecisionGenerated(coachState.verdict, goalId);
        toast.success(tt('analysisReady'));
      }, ANALYSIS_MS),
    ];

    return () => {
      clearTimeout(timeoutTimer);
      timers.forEach(clearTimeout);
    };
  }, [analytics, coachState.verdict, goalId, tt]);

  useEffect(() => {
    if (phase !== 'thinking') return undefined;
    return runAnalysis();
  }, [phase, runAnalysis]);

  const handleRegistrationStart = (data: ProjectRegistrationData) => {
    setRegistration(data);
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
          <div className="space-y-8">
            <WorkspaceMorningBrief
              confidence={project.confidence}
              projectName={projectDisplayName}
            />
            <JourneyDailyCoach
              confidence={project.confidence}
              variant="hero"
              onStart={() => {
                analytics.trackMockActionCompleted('today_start', DAILY_COACH.confidenceAfter);
                appendHistory({
                  category: 'coach',
                  title: te('coach.startCta'),
                  summary: te('coach.focusLine', {
                    after: DAILY_COACH.confidenceAfter,
                  }),
                });
                document.getElementById('journey-decision-coach')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            />
            <DecisionExperienceCoach
              id="journey-decision-coach"
              goalId={goalId}
              projectId={projectId}
              className="w-full max-w-none scroll-mt-6"
            />
            <WorkspaceWorkflowRecommendation goalId={goalId} />
            <WorkspaceReportPreview
              projectName={projectDisplayName}
              confidence={project.confidence}
            />
          </div>
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
            <DecisionExperienceCoach
              goalId={goalId}
              projectId={projectId}
              className="w-full max-w-none"
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
      <AiThinkingOverlay
        goalLabel={registration?.projectName ?? tc(goalId)}
        titleOverride={ta('title')}
        stepLabels={analysisStepLabels}
        activeStep={thinkingStep}
        stepCount={ANALYSIS_STEPS}
        progressPercent={Math.min(100, ((thinkingStep + 1) / ANALYSIS_STEPS) * 100)}
        failed={thinkingFailed}
        onRetry={() => {
          setThinkingFailed(false);
          setPhase('thinking');
        }}
      />
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
          <div className="grid gap-6 lg:grid-cols-[minmax(200px,260px)_1fr] lg:items-start lg:gap-8">
            <WorkspaceJourneyGuide activeStep={guideStep} className="hidden sm:block" />
            <ProjectRegistrationPanel onStart={handleRegistrationStart} />
          </div>
        </JourneyFade>
      ) : !projectReady ? (
        <WorkspaceSkeleton />
      ) : (
        <JourneyFade>
          <div className="grid gap-6 lg:grid-cols-[minmax(200px,260px)_1fr] lg:items-start lg:gap-8">
            <WorkspaceJourneyGuide activeStep={guideStep} className="hidden lg:block" />
            <div className="min-w-0 space-y-6">
              {tab !== 'today' ? (
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
              ) : null}
              {renderActiveTab()}
              {tab !== 'today' ? (
                <div className="pt-2">
                  <Button asChild size="lg" className="h-12 w-full rounded-xl sm:max-w-md">
                    <Link href="/auth/login?next=/workspace">
                      {demoMode ? t('ctaLogin') : t('ctaContinue')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </JourneyFade>
      )}
    </JourneyLayout>
  );
}
