'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { BETA_VERSION } from '@/lib/site/beta-config';
import { Button, toast } from '@repo/ui';

import { getStrategyCoachState } from '../constants/decision-mock';
import { getStepGuideMeta } from '../constants/step-guides';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
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
import { JourneyAchievementsPanel } from './intelligence-workspace/journey-achievements-panel';
import { JourneyAiMemoryPanel } from './intelligence-workspace/journey-ai-memory-panel';
import { JourneyDailyCoach } from './intelligence-workspace/journey-daily-coach';
import { JourneyNextActionCta } from './intelligence-workspace/journey-next-action-cta';
import { JourneyProgressRing } from './intelligence-workspace/journey-progress-ring';
import { JourneyProjectSwitcher } from './intelligence-workspace/journey-project-switcher';
import { JourneyTimelinePanel } from './intelligence-workspace/journey-timeline-panel';
import {
  ProjectRegistrationPanel,
  type ProjectRegistrationData,
} from './project-registration-panel';
import {
  JourneyWorkspaceNav,
  type JourneyWorkspaceTab,
} from './intelligence-workspace/journey-workspace-nav';
import { WorkspaceJourneyGuide } from './workspace-journey-guide';

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

const ANALYSIS_MS = 2400;

export function StrategyWorkspaceShell({
  goalId,
  template,
  demoMode = false,
}: StrategyWorkspaceShellProps) {
  const t = useTranslations('workflow.workspace');
  const te = useTranslations('workflow.epic3');
  const tg = useTranslations('workflow.goal');
  const tc = useTranslations('workflow.compose.goals');
  const coachState = getStrategyCoachState(goalId);
  const activeStepId = coachState.nextActionStepId;
  const activeStep = template.steps.find((s) => s.id === activeStepId) ?? template.steps[0];
  const stepMeta = getStepGuideMeta(activeStep?.id ?? 'context');
  const progress = Math.round((1 / template.stepCount) * 100);
  const tt = useTranslations('workflow.toast');
  const analytics = useJourneyAnalytics(demoMode);

  const [phase, setPhase] = useState<WorkspacePhase>('registration');
  const [thinkingStep, setThinkingStep] = useState(0);
  const [thinkingFailed, setThinkingFailed] = useState(false);
  const { project, setProjectId, ready: projectReady } = useJourneyProject();
  const [tab, setTab] = useState<JourneyWorkspaceTab>('today');
  const [registration, setRegistration] = useState<ProjectRegistrationData | null>(null);

  useWorkspaceExitCoach(phase === 'active' && projectReady);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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

    const timers = [
      window.setTimeout(() => setThinkingStep(1), 500),
      window.setTimeout(() => setThinkingStep(2), 1000),
      window.setTimeout(() => setThinkingStep(3), 1500),
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
    setPhase('thinking');
  };

  const guideStep =
    phase === 'registration' ? 'project' : phase === 'thinking' ? 'research' : 'decision';

  const renderActiveTab = () => {
    switch (tab) {
      case 'today':
        return (
          <div className="space-y-6">
            <JourneyDailyCoach confidence={project.confidence} />
            <JourneyNextActionCta confidence={project.confidence} />
            <DecisionExperienceCoach goalId={goalId} className="w-full max-w-none" />
          </div>
        );
      case 'project':
        return (
          <ProjectRegistrationPanel
            onStart={handleRegistrationStart}
            disabled={phase === 'thinking'}
          />
        );
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
        return <DecisionExperienceCoach goalId={goalId} className="w-full max-w-none" />;
      case 'history':
        return (
          <div className="space-y-6">
            <JourneyTimelinePanel />
            <JourneyAiMemoryPanel />
          </div>
        );
      case 'settings':
        return (
          <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold">{te('settings.title')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{te('settings.desc')}</p>
            {registration ? (
              <p className="mt-4 text-sm font-medium">{registration.projectName}</p>
            ) : null}
          </section>
        );
      default:
        return null;
    }
  };

  if (phase === 'thinking') {
    return (
      <AiThinkingOverlay
        goalLabel={registration?.projectName ?? tc(goalId)}
        activeStep={thinkingStep}
        stepCount={4}
        progressPercent={Math.min(100, ((thinkingStep + 1) / 4) * 100)}
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
          <div className="grid gap-8 lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-start">
            <WorkspaceJourneyGuide activeStep={guideStep} />
            <ProjectRegistrationPanel onStart={handleRegistrationStart} />
          </div>
        </JourneyFade>
      ) : !projectReady ? (
        <WorkspaceSkeleton />
      ) : (
        <JourneyFade>
          <div className="grid gap-8 lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-start">
            <WorkspaceJourneyGuide activeStep={guideStep} />
            <div className="min-w-0 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-3">
                  <JourneyProjectSwitcher project={project} onSelect={setProjectId} />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {registration?.projectName ?? tg(`options.${goalId}.title`)}
                    </p>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                      {t('title')}
                    </h1>
                  </div>
                </div>
                <JourneyProgressRing value={project.confidence} label={t('progressLabel')} size={80} />
              </div>
              {renderActiveTab()}
              <div className="pt-4">
                <Button asChild size="lg" className="h-12 w-full rounded-xl sm:max-w-md">
                  <Link href="/auth/login?next=/workspace">
                    {demoMode ? t('ctaLogin') : t('ctaContinue')}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </JourneyFade>
      )}
    </JourneyLayout>
  );
}
