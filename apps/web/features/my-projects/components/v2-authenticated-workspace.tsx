'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { displayName } from '@/features/my-projects/lib/my-project-utils';
import { useJourneyAnalytics } from '@/features/workflow-journey/hooks/use-journey-analytics';
import { V2DailyReportTimeline } from '@/features/workflow-journey/components/v2/v2-daily-report-timeline';
import { V2InvestigationDiscoveries } from '@/features/workflow-journey/components/v2/v2-investigation-discoveries';
import { V2InvestigationLog } from '@/features/workflow-journey/components/v2/v2-investigation-log';
import { V2InvestigationProgress } from '@/features/workflow-journey/components/v2/v2-investigation-progress';
import { V2MorningInvestigationBrief } from '@/features/workflow-journey/components/v2/v2-morning-investigation-brief';
import { V2PmReport } from '@/features/workflow-journey/components/v2/v2-pm-report';
import { useAlphaFunnelTracking } from '@/features/workflow-journey/hooks/use-alpha-funnel-tracking';
import { buildSampleInvestigationContext } from '@/features/workflow-journey/lib/v2-investigation-engine';
import { resolveWorkspaceLifecycle } from '@/lib/project/investigation-lifecycle';
import { shouldShowMorningReport } from '@/lib/project/morning-report-eligibility';
import { deriveWorkspaceRestoreState } from '@/lib/release/workspace-restore';
import { resolveMorningBriefNamespace } from '@/lib/project/morning-brief-namespace';
import { workspaceLastVisitKey } from '@/lib/project/project-context-store';
import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
} from '@/lib/analytics/product-analytics';

type V2AuthenticatedWorkspaceProps = {
  project: StartupProject;
  userName: string | null;
  userEmail: string;
  welcome?: boolean;
  promoted?: boolean;
  className?: string;
};

export function V2AuthenticatedWorkspace({
  project,
  userName,
  userEmail,
  welcome = false,
  promoted = false,
  className,
}: V2AuthenticatedWorkspaceProps) {
  const t = useTranslations('myProjects.v2Workspace');
  const analytics = useJourneyAnalytics();
  const alpha = useAlphaFunnelTracking();
  const investigation = useMemo(
    () => ({ ...buildSampleInvestigationContext(), surface: 'workspace' as const }),
    [project.id],
  );
  const restoreState = useMemo(() => deriveWorkspaceRestoreState(project), [project]);
  const showMorning = shouldShowMorningReport(project);
  const greetingName = displayName(userName, userEmail);
  const [phase, setPhase] = useState<'inbox' | 'review'>('inbox');
  const isFirstSession = welcome || promoted;

  const lifecycle = resolveWorkspaceLifecycle({
    showMorning,
    phase,
    isFirstSession,
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const visitKey = workspaceLastVisitKey(project.id);
    const lastVisit = localStorage.getItem(visitKey);
    const isReturn = lastVisit !== null && lastVisit !== today;

    if (isReturn) {
      analytics.trackDailyReturn(project.id);
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.workspaceReturned, {
        project_id: project.id,
        project_name: project.title,
      });
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.returningUser, {
        project_id: project.id,
        project_name: project.title,
      });
    } else {
      analytics.trackWorkspaceLoaded(project.id);
    }

    localStorage.setItem(visitKey, today);
    if (showMorning) {
      alpha.trackMorningReportView(project.id);
    }
  }, [alpha, analytics, project.id, project.title, showMorning]);

  useEffect(() => {
    if (phase !== 'review') return;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.artifactGenerated, {
      project_id: project.id,
    });
  }, [phase, project.id]);

  const headline = isFirstSession
    ? t('welcomeHeadline', { name: greetingName })
    : t('returnContinuityHeadline', { name: greetingName });

  const lead = isFirstSession
    ? showMorning
      ? t('welcomeLead')
      : t('welcomeLeadFirstDay')
    : t('returnContinuityLead', {
        competitors: 2,
        searchDelta: '+18%',
      });

  return (
    <div className={cn('mx-auto max-w-2xl space-y-6 py-4', className)}>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t('label')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{headline}</h1>
        <p className="text-muted-foreground">{lead}</p>
        {!isFirstSession && showMorning ? (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {t('returnActionNeeded')}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t('lifecycleLabel')}: {lifecycle}
        </p>
      </header>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('projectLabel')}
        </p>
        <p className="mt-2 text-lg font-semibold">{project.title}</p>
        {project.summary ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{project.summary}</p>
        ) : null}
      </div>

      {!isFirstSession && showMorning ? (
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('lastWorkLabel')}
          </p>
          <p className="mt-2 text-sm font-medium">{restoreState.lastWorkLabel}</p>
        </div>
      ) : null}

      {phase === 'inbox' ? (
        <div className="space-y-4">
          {!showMorning ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 py-6 text-center">
              <p className="text-sm font-medium">{t('morningPendingTitle')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('morningPendingLead')}</p>
            </div>
          ) : (
            <>
              <V2MorningInvestigationBrief
                briefing={investigation.morningBriefing!}
                namespace={resolveMorningBriefNamespace({
                  projectId: project.id,
                  welcome,
                  promoted,
                })}
              />

              <V2InvestigationProgress
                items={investigation.workProgress}
                namespace="investigationSample"
              />

              {investigation.dailyReport ? (
                <V2DailyReportTimeline
                  entries={investigation.dailyReport}
                  reportDate={investigation.reportDate}
                  namespace="investigationSample"
                />
              ) : null}

              <V2InvestigationLog
                entries={investigation.logEntries}
                namespace="investigationSample"
                variant="workJournal"
              />

              <V2InvestigationDiscoveries items={investigation.discoveries} />
            </>
          )}

          <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-background px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">AI PM</p>
            <p className="mt-2 text-sm leading-relaxed">
              {showMorning ? t('continuePrompt') : t('continuePromptFirstDay')}
            </p>
          </div>

          <Button
            type="button"
            className="w-full gap-2 rounded-lg"
            onClick={() => {
              void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.reviewCompleted, {
                project_id: project.id,
              });
              alpha.trackFounderMemoWritten(project.id);
              setPhase('review');
            }}
          >
            <Sparkles className="size-4" aria-hidden />
            {t('continueCta')}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <V2PmReport stats={investigation.report} />
          <Button type="button" variant="outline" className="w-full rounded-lg" onClick={() => setPhase('inbox')}>
            {t('backToInbox')}
          </Button>
        </div>
      )}
    </div>
  );
}
