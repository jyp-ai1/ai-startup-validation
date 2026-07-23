'use client';

import { useEffect, useTransition } from 'react';
import {
  Bot,
  Check,
  Clock,
  DollarSign,
  Pause,
  Play,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button, Badge } from '@repo/ui';

import type { ExecutionCenterStats, ExecutionPlan, TaskNode } from '../services/orchestrator-types';
import {
  approveOrchestratorPlan,
  pauseOrchestratorNode,
  rejectOrchestratorPlan,
  rerunOrchestratorNode,
  resumeOrchestratorNode,
  startOrchestratorPlan,
} from '../actions/orchestrator-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

import { ConfidenceLineagePanel } from './confidence-lineage-panel';
import { ExecutionGraph } from './execution-graph';

type ExecutionCenterPanelProps = {
  stats: ExecutionCenterStats;
  projectId: string | null;
  projectTitle: string | null;
  projectType: string | null;
  plan: ExecutionPlan | null;
};

export function ExecutionCenterPanel({
  stats,
  projectId,
  projectTitle,
  projectType,
  plan,
}: ExecutionCenterPanelProps) {
  const t = useTranslations('orchestrator');
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [pending, startTransition] = useTransition();

  function handleStart() {
    if (!projectId) return;
    startTransition(async () => {
      trackEvent(ANALYTICS_EVENTS.plannerStart, {
        project_id: projectId,
        project_type: projectType ?? undefined,
      });
      const result = await startOrchestratorPlan(projectId);
      if (result.planId) {
        trackEvent(ANALYTICS_EVENTS.plannerComplete, {
          project_id: projectId,
          plan_id: result.planId,
        });
      }
      router.refresh();
    });
  }

  function handleApprove() {
    if (!plan || !projectId) return;
    startTransition(async () => {
      await approveOrchestratorPlan(plan.id, projectId);
      router.refresh();
    });
  }

  function handleReject() {
    if (!plan || !projectId) return;
    startTransition(async () => {
      await rejectOrchestratorPlan(plan.id, projectId);
      router.refresh();
    });
  }

  function handleRerun(node: TaskNode) {
    if (!plan || !projectId) return;
    startTransition(async () => {
      trackEvent(ANALYTICS_EVENTS.agentRetry, {
        project_id: projectId,
        agent_id: node.agentId,
        retry_count: node.retryCount,
      });
      await rerunOrchestratorNode(plan.id, node.id, projectId);
      router.refresh();
    });
  }

  function handlePause(node: TaskNode) {
    if (!plan || !projectId) return;
    startTransition(async () => {
      await pauseOrchestratorNode(plan.id, node.id, projectId);
      router.refresh();
    });
  }

  function handleResume(node: TaskNode) {
    if (!plan || !projectId) return;
    startTransition(async () => {
      await resumeOrchestratorNode(plan.id, node.id, projectId);
      router.refresh();
    });
  }

  const canApprove =
    plan &&
    plan.status === 'WAITING' &&
    plan.approvalStatus === 'PENDING_REVIEW';

  useEffect(() => {
    if (!plan || !projectId) return;
    if (plan.status === 'RUNNING') {
      trackEvent(ANALYTICS_EVENTS.agentSchedule, {
        project_id: projectId,
        plan_id: plan.id,
        queued_tasks: plan.nodes.filter((n) => n.status === 'QUEUED').length,
      });
    }
    if (plan.status === 'WAITING' && plan.mergedKnowledge.length > 0) {
      trackEvent(ANALYTICS_EVENTS.knowledgeMerge, {
        project_id: projectId,
        plan_id: plan.id,
        knowledge_nodes: plan.mergedKnowledge.length,
        evidence_items: plan.mergedEvidence.length,
      });
    }
  }, [plan, projectId, trackEvent]);

  return (
    <section className="ll-executive-panel space-y-8 px-8 py-8">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Zap className="size-5 text-primary" />} label={t('stats.activePlans')} value={String(stats.activePlans)} />
        <StatCard icon={<Bot className="size-5 text-primary" />} label={t('stats.runningTasks')} value={String(stats.runningTasks)} />
        <StatCard icon={<Clock className="size-5 text-muted-foreground" />} label={t('stats.queuedTasks')} value={String(stats.queuedTasks)} />
        <StatCard icon={<Check className="size-5 text-emerald-600" />} label={t('stats.completedPlans')} value={String(stats.completedPlans)} />
      </div>

      {projectId && projectTitle ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleStart} disabled={pending || !projectId}>
            <Play className="size-4" />
            {t('startPlan')}
          </Button>
          {plan ? (
            <Badge variant="outline">{t(`planStatus.${plan.status.toLowerCase()}`)}</Badge>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noProject')}</p>
      )}

      {plan ? (
        <>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('graphTitle')}
            </p>
            <ExecutionGraph plan={plan} />
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('taskQueue')}
            </p>
            <ul className="space-y-2">
              {plan.nodes
                .filter((n) => n.agentId !== 'DECISION')
                .map((node) => (
                  <TaskRow
                    key={node.id}
                    node={node}
                    pending={pending}
                    onRerun={() => handleRerun(node)}
                    onPause={() => handlePause(node)}
                    onResume={() => handleResume(node)}
                  />
                ))}
            </ul>
          </div>

          {plan.totalCostUsd > 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="size-4" />
              {t('totalCost', { cost: plan.totalCostUsd, ms: plan.totalDurationMs })}
            </div>
          ) : null}

          {plan.confidenceLineage ? (
            <ConfidenceLineagePanel lineage={plan.confidenceLineage} />
          ) : null}

          {canApprove ? (
            <div className="flex gap-3 border-t border-border/40 pt-6">
              <Button onClick={handleApprove} disabled={pending}>
                <Check className="size-4" />
                {t('approve')}
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={pending}>
                <X className="size-4" />
                {t('reject')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function TaskRow({
  node,
  pending,
  onRerun,
  onPause,
  onResume,
}: {
  node: TaskNode;
  pending: boolean;
  onRerun: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const t = useTranslations('orchestrator');

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{t(node.labelKey)}</p>
        <p className="text-xs text-muted-foreground">
          {t(`status.${node.status.toLowerCase()}`)}
          {node.cost
            ? ` · ${t('costSummary', {
                provider: node.cost.provider,
                tokens: node.cost.estimatedTokens,
                cost: node.cost.estimatedCostUsd,
                retries: node.cost.retryCount,
              })}`
            : null}
        </p>
      </div>
      <div className="flex gap-2">
        {node.status === 'COMPLETED' || node.status === 'FAILED' ? (
          <Button size="sm" variant="outline" onClick={onRerun} disabled={pending}>
            <RefreshCw className="size-3.5" />
            {t('rerun')}
          </Button>
        ) : null}
        {node.status === 'PAUSED' ? (
          <Button size="sm" variant="outline" onClick={onResume} disabled={pending}>
            <Play className="size-3.5" />
            {t('resume')}
          </Button>
        ) : node.status !== 'COMPLETED' && node.status !== 'FAILED' ? (
          <Button size="sm" variant="ghost" onClick={onPause} disabled={pending}>
            <Pause className="size-3.5" />
            {t('pause')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
