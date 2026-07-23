'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceProgressStep } from '@/features/workspace-home/types';

type BlockProgressProps = {
  projectId: string;
  steps: WorkspaceProgressStep[];
};

function BlockBar({ percent, completed }: { percent: number; completed: boolean }) {
  const filled = completed ? 5 : Math.max(0, Math.min(5, Math.round(percent / 20)));

  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'h-2.5 w-4 rounded-sm transition-all duration-500 motion-safe:hover:scale-y-110',
            index < filled ? 'bg-primary' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

export function BlockProgress({ projectId, steps }: BlockProgressProps) {
  const t = useTranslations('workspace.home');
  const { trackEvent } = useAnalytics();

  function handleClick(stepId: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceProgressClick, {
      project_id: projectId,
      step_id: stepId,
    });
  }

  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <Link
          key={step.id}
          href={step.href}
          onClick={() => handleClick(step.id)}
          className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm motion-safe:hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold group-hover:text-primary">{t(step.labelKey as 'steps.research')}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{step.percent}%</p>
          </div>
          <BlockBar percent={step.percent} completed={step.completed} />
        </Link>
      ))}
    </div>
  );
}
