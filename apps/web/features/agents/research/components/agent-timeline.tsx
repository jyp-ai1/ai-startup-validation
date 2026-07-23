'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AgentWorkflowState, ResearchJob } from '@/features/agents/research';
import { WORKFLOW_PIPELINE } from '@/features/agents/research';
import { cn } from '@repo/ui/lib/utils';

type AgentTimelineProps = {
  job: ResearchJob | null;
  compact?: boolean;
};

const TIMELINE_STATES = WORKFLOW_PIPELINE.filter((s) => s !== 'FAILED');

function stateIndex(state: AgentWorkflowState): number {
  if (state === 'FAILED') return -1;
  return TIMELINE_STATES.indexOf(state);
}

export function AgentTimeline({ job, compact }: AgentTimelineProps) {
  const t = useTranslations('researchAgent.timeline');

  if (!job) {
    return (
      <p className="text-sm text-muted-foreground">{t('empty')}</p>
    );
  }

  const currentIdx = stateIndex(job.state);
  const failed = job.state === 'FAILED';

  return (
    <ol className={cn('flex', compact ? 'flex-col gap-3' : 'flex-wrap items-start gap-2 md:gap-0')}>
      {TIMELINE_STATES.map((state, index) => {
        const done = !failed && currentIdx > index;
        const active = !failed && currentIdx === index;
        const isLast = index === TIMELINE_STATES.length - 1;

        return (
          <li
            key={state}
            className={cn(
              'flex items-center',
              !compact && !isLast && 'md:flex-1',
            )}
          >
            <div className="flex items-center gap-2">
              {failed && index === Math.max(0, currentIdx) ? (
                <XCircle className="size-5 shrink-0 text-rose-600" />
              ) : done ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : active ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  active && 'text-primary',
                  done && 'text-foreground',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {t(state.toLowerCase() as 'queued')}
              </span>
            </div>
            {!compact && !isLast ? (
              <div
                className={cn(
                  'mx-3 hidden h-px flex-1 md:block',
                  done ? 'bg-emerald-500/50' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
