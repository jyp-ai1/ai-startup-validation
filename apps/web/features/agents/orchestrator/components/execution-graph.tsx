'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, CheckCircle2, Circle, Loader2, Pause, XCircle } from 'lucide-react';

import type { ExecutionPlan, TaskNode, TaskNodeStatus } from '../services/orchestrator-types';
import { cn } from '@repo/ui/lib/utils';

type ExecutionGraphProps = {
  plan: ExecutionPlan;
};

const STATUS_ICON: Record<TaskNodeStatus, React.ReactNode> = {
  PLANNING: <Circle className="size-4 text-muted-foreground" />,
  QUEUED: <Circle className="size-4 text-muted-foreground" />,
  RUNNING: <Loader2 className="size-4 animate-spin text-primary" />,
  WAITING: <Circle className="size-4 text-amber-500" />,
  COMPLETED: <CheckCircle2 className="size-4 text-emerald-600" />,
  FAILED: <XCircle className="size-4 text-destructive" />,
  PAUSED: <Pause className="size-4 text-amber-600" />,
  SKIPPED: <Circle className="size-4 text-muted-foreground/50" />,
};

export function ExecutionGraph({ plan }: ExecutionGraphProps) {
  const t = useTranslations('orchestrator');

  const groups = [...new Set(plan.nodes.map((n) => n.parallelGroup))].sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
        {STATUS_ICON[plan.status === 'PLANNING' ? 'PLANNING' : 'RUNNING']}
        <span className="text-sm font-medium">{t('graph.planning')}</span>
      </div>

      {groups.map((group) => {
        const nodes = plan.nodes.filter((n) => n.parallelGroup === group);
        return (
          <div key={group}>
            <ArrowDown className="mx-auto my-1 size-4 text-muted-foreground/50" />
            <div
              className={cn(
                'grid gap-2',
                nodes.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
              )}
            >
              {nodes.map((node) => (
                <GraphNode key={node.id} node={node} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GraphNode({ node }: { node: TaskNode }) {
  const t = useTranslations('orchestrator');

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 transition-colors',
        node.status === 'RUNNING' && 'border-primary/50 bg-primary/5',
        node.status === 'COMPLETED' && 'border-emerald-500/30 bg-emerald-500/5',
        node.status === 'FAILED' && 'border-destructive/30 bg-destructive/5',
        node.status === 'PAUSED' && 'border-amber-500/30 bg-amber-500/5',
        node.status !== 'RUNNING' &&
          node.status !== 'COMPLETED' &&
          node.status !== 'FAILED' &&
          node.status !== 'PAUSED' &&
          'border-border/50 bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        {STATUS_ICON[node.status]}
        <span className="text-sm font-medium">{t(node.labelKey)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t(`status.${node.status.toLowerCase()}`)}</p>
      {node.result ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {t('confidence', { value: node.result.confidence })}
        </p>
      ) : null}
    </div>
  );
}
