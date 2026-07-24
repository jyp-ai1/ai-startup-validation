'use client';

import { useEffect, useTransition } from 'react';
import { Bot, Check, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { ResearchJob } from '@/features/agents/research';
import {
  approveResearchJob,
  rejectResearchJob,
  startResearchAgent,
} from '@/features/agents/research';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button, Badge } from '@repo/ui';

import { AiErrorRetry } from '@/components/ai-error-retry';

import { AgentTimeline } from './agent-timeline';

type ResearchAgentPanelProps = {
  projectId: string;
  projectType: string;
  jobs: ResearchJob[];
  providerId?: string;
};

export function ResearchAgentPanel({
  projectId,
  projectType,
  jobs,
  providerId = 'mock',
}: ResearchAgentPanelProps) {
  const t = useTranslations('researchAgent');
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [pending, startTransition] = useTransition();

  const latestJob = jobs[0] ?? null;
  const isRunning =
    latestJob &&
    latestJob.state !== 'COMPLETED' &&
    latestJob.state !== 'FAILED';

  useEffect(() => {
    if (!latestJob) return;
    if (latestJob.state === 'COMPLETED') {
      trackEvent(ANALYTICS_EVENTS.agentComplete, {
        project_id: projectId,
        project_type: projectType,
        provider: latestJob.providerId,
        duration: latestJob.durationMs ?? 0,
        status: latestJob.approvalStatus,
      });
    }
    if (latestJob.state === 'FAILED') {
      trackEvent(ANALYTICS_EVENTS.agentFailed, {
        project_id: projectId,
        project_type: projectType,
        provider: latestJob.providerId,
      });
    }
  }, [latestJob, projectId, projectType, trackEvent]);

  function handleStart() {
    startTransition(async () => {
      trackEvent(ANALYTICS_EVENTS.agentStart, {
        project_id: projectId,
        project_type: projectType,
        provider: providerId,
      });
      const result = await startResearchAgent(projectId);
      if (result.jobId) {
        trackEvent(ANALYTICS_EVENTS.researchExecute, {
          project_id: projectId,
          project_type: projectType,
          provider: providerId,
        });
      }
      router.refresh();
    });
  }

  function handleApprove(jobId: string) {
    startTransition(async () => {
      await approveResearchJob(jobId, projectId);
      trackEvent(ANALYTICS_EVENTS.researchReview, {
        project_id: projectId,
        status: 'approved',
      });
      router.refresh();
    });
  }

  function handleReject(jobId: string) {
    startTransition(async () => {
      await rejectResearchJob(jobId, projectId);
      trackEvent(ANALYTICS_EVENTS.researchReview, {
        project_id: projectId,
        status: 'rejected',
      });
      router.refresh();
    });
  }

  return (
    <section className="ll-executive-panel space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
            {t('eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        </div>
        <Button onClick={handleStart} disabled={pending || Boolean(isRunning)} className="gap-2">
          <Bot className="size-4" />
          {pending || isRunning ? t('running') : t('start')}
        </Button>
      </div>

      {latestJob ? (
        <>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('timelineLabel')}
            </p>
            <AgentTimeline job={latestJob} />
          </div>

          {latestJob.state === 'COMPLETED' && latestJob.result ? (
            <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{t('resultTitle')}</h3>
                <ApprovalBadge status={latestJob.approvalStatus} />
              </div>
              <p className="text-sm leading-relaxed">
                {t(latestJob.result.summaryKey as 'result.summary', latestJob.result.summaryParams ?? {})}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <InsightCard
                  label={t('marketInsight')}
                  value={t(latestJob.result.market.insightKey as 'result.marketInsight')}
                />
                <InsightCard
                  label={t('competitorInsight')}
                  value={t(latestJob.result.competitor.insightKey as 'result.competitorInsight')}
                />
                <InsightCard
                  label={t('governmentInsight')}
                  value={t(latestJob.result.government.insightKey as 'result.governmentInsight')}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('evidenceGenerated', { count: latestJob.evidenceCount })}
                </p>
                <ul className="mt-2 space-y-2">
                  {latestJob.result.evidence.map((ev) => (
                    <li key={ev.id} className="rounded-lg bg-background px-4 py-3 text-sm">
                      <p className="font-medium">{ev.title ?? t(ev.titleKey as 'evidence.marketSize.title')}</p>
                      <p className="mt-1 text-muted-foreground">
                        {ev.summary ?? t(ev.summaryKey as 'evidence.marketSize.summary')}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              {latestJob.approvalStatus === 'PENDING_REVIEW' ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(latestJob.id)}
                    disabled={pending}
                    className="gap-1"
                  >
                    <Check className="size-4" />
                    {t('approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(latestJob.id)}
                    disabled={pending}
                    className="gap-1"
                  >
                    <X className="size-4" />
                    {t('reject')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {latestJob.state === 'FAILED' ? (
            <AiErrorRetry
              message={latestJob.errorMessage ?? t('failed')}
              disabled={pending}
              onRetry={handleStart}
            />
          ) : null}

          {latestJob.state === 'COMPLETED' ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" />
              {t('duration', { ms: latestJob.durationMs ?? 0 })}
              {' · '}
              {t('confidence', { value: latestJob.result?.confidence ?? 0 })}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noRuns')}</p>
      )}
    </section>
  );
}

function ApprovalBadge({ status }: { status: ResearchJob['approvalStatus'] }) {
  const t = useTranslations('researchAgent.approval');
  const variant =
    status === 'APPROVED' ? 'default' : status === 'REJECTED' ? 'destructive' : 'secondary';
  return (
    <Badge variant={variant}>
      {t(status.toLowerCase() as 'pending_review')}
    </Badge>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
