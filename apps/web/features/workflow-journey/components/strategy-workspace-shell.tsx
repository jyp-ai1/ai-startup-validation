'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
import { JourneyProjectPanel } from './intelligence-workspace/journey-project-panel';
import { JourneyProjectSwitcher } from './intelligence-workspace/journey-project-switcher';
import { JourneyTimelinePanel } from './intelligence-workspace/journey-timeline-panel';
import {
  JourneyWorkspaceNav,
  type JourneyWorkspaceTab,
} from './intelligence-workspace/journey-workspace-nav';

const DecisionExperienceCoach = dynamic(
  () => import('./decision-experience-coach').then((m) => m.DecisionExperienceCoach),
  { loading: () => <CoachSkeleton /> },
);

type StrategyWorkspaceShellProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
  demoMode?: boolean;
};

export function StrategyWorkspaceShell({
  goalId,
  template,
  demoMode = false,
}: StrategyWorkspaceShellProps) {
  const t = useTranslations('workflow.workspace');
  const te = useTranslations('workflow.epic3');
  const tg = useTranslations('workflow.goal');
  const coachState = getStrategyCoachState(goalId);
  const activeStepId = coachState.nextActionStepId;
  const activeStep = template.steps.find((s) => s.id === activeStepId) ?? template.steps[0];
  const stepMeta = getStepGuideMeta(activeStep?.id ?? 'context');
  const progress = Math.round((1 / template.stepCount) * 100);
  const tt = useTranslations('workflow.toast');
  const analytics = useJourneyAnalytics(demoMode);
  const { project, setProjectId, ready: projectReady } = useJourneyProject();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<JourneyWorkspaceTab>('today');

  useWorkspaceExitCoach(!loading && projectReady);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setLoading(false);
      analytics.trackWorkspaceLoaded(goalId, coachState.verdict);
    }, 380);
    if (sessionStorage.getItem('workspace_toast') === '1') {
      sessionStorage.removeItem('workspace_toast');
      toast.success(tt('workspaceReady'));
    }
    return () => clearTimeout(id);
  }, [analytics, coachState.verdict, goalId, tt]);

  const renderTabContent = () => {
    switch (tab) {
      case 'today':
        return (
          <div className="space-y-6">
            <JourneyDailyCoach confidence={project.confidence} />
            <JourneyNextActionCta confidence={project.confidence} />
            <DecisionExperienceCoach goalId={goalId} className="w-full max-w-none" />
            <div className="grid gap-6 lg:grid-cols-2">
              <JourneyAchievementsPanel />
              <JourneyAiMemoryPanel />
            </div>
          </div>
        );
      case 'project':
        return <JourneyProjectPanel />;
      case 'workflow':
        return (
          <div className="space-y-6">
            {activeStep ? (
              <WorkflowGuideCard
                stepId={activeStep.id}
                order={activeStep.order}
                meta={stepMeta}
                active
              />
            ) : null}
            <section className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 sm:p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('inputPlaceholderLabel')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('inputPlaceholder')}</p>
            </section>
            <DecisionExperienceCoach goalId={goalId} className="w-full max-w-none" />
          </div>
        );
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
            <p className="mt-4 text-xs font-medium text-muted-foreground">{BETA_VERSION}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>{te('settings.mockNote')}</li>
              <li>{te('settings.locale')}</li>
            </ul>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <JourneyLayout
      phase="workspace"
      width="wide"
      variant="intelligence"
      versionLabel={BETA_VERSION}
      navSlot={
        <JourneyWorkspaceNav
          active={tab}
          onChange={(next) => {
            setTab(next);
            analytics.trackMockActionCompleted(`tab_${next}`, project.confidence);
          }}
        />
      }
    >
      <BetaFeedbackModal />
      {loading || !projectReady ? (
        <WorkspaceSkeleton />
      ) : (
        <JourneyFade>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <JourneyProjectSwitcher project={project} onSelect={setProjectId} />
              <div>
                <p className="text-sm text-muted-foreground">{tg(`options.${goalId}.title`)}</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                  {t('title')}
                </h1>
              </div>
            </div>
            <JourneyProgressRing value={progress} label={t('progressLabel')} size={80} />
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-8">{renderTabContent()}</div>

          <div className="mt-8">
            <Button asChild size="lg" className="h-12 w-full rounded-xl sm:max-w-md">
              <Link href="/auth/login?next=/workspace">
                {demoMode ? t('ctaLogin') : t('ctaContinue')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
              {t('legacyHint')}{' '}
              <Link href="/dashboard" className="underline-offset-2 hover:underline">
                {t('legacyLink')}
              </Link>
            </p>
          </div>
        </JourneyFade>
      )}
    </JourneyLayout>
  );
}
