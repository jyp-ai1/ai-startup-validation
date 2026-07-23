'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Loader2, Pause, XCircle } from 'lucide-react';

import type { ExecutionPlan, TaskNodeStatus } from '@/features/agents/orchestrator';
import { cn } from '@repo/ui/lib/utils';

type ExecutiveExecutionStatusProps = {
  plan: ExecutionPlan | null;
};

const STATUS_ICON: Record<TaskNodeStatus, React.ReactNode> = {
  PLANNING: <Circle className="size-3.5 text-muted-foreground" />,
  QUEUED: <Circle className="size-3.5 text-muted-foreground" />,
  RUNNING: <Loader2 className="size-3.5 animate-spin text-primary" />,
  WAITING: <Circle className="size-3.5 text-amber-500" />,
  COMPLETED: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  FAILED: <XCircle className="size-3.5 text-destructive" />,
  PAUSED: <Pause className="size-3.5 text-amber-600" />,
  SKIPPED: <Circle className="size-3.5 text-muted-foreground/50" />,
};

export function ExecutiveExecutionStatus({ plan }: ExecutiveExecutionStatusProps) {
  const t = useTranslations('executive');
  const to = useTranslations('orchestrator');

  if (!plan) {
    return (
      <section className="rounded-xl border border-dashed border-border/60 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t('execution.noPlan')}</p>
      </section>
    );
  }

  const planStatusKey = plan.status.toLowerCase() as 'planning' | 'running' | 'waiting' | 'completed' | 'failed';

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('execution.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('execution.desc')}</p>
        </div>
        <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          {to(`planStatus.${planStatusKey}`)}
        </span>
      </div>

      <div className="space-y-2">
        {plan.nodes.map((node) => (
          <div
            key={node.id}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
              node.status === 'RUNNING' && 'border-primary/40 bg-primary/5',
              node.status === 'COMPLETED' && 'border-emerald-500/30 bg-emerald-500/5',
              node.status !== 'RUNNING' && node.status !== 'COMPLETED' && 'border-border/50',
            )}
          >
            <div className="flex items-center gap-3">
              {STATUS_ICON[node.status]}
              <span className="font-medium">{to(node.labelKey as 'agents.market')}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {to(`status.${node.status.toLowerCase()}` as 'status.running')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
