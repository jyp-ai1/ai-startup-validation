'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildAgentLiveTeam,
  buildPipelineMilestones,
  type AgentLiveEntry,
} from '../../lib/ai-state-engine';
import { AiStateHero } from './ai-state-hero';

type AgentLiveConsoleProps = {
  projectName?: string;
  agentIndex: number;
  progressPercent: number;
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
};

function StatusIcon({ status }: { status: AgentLiveEntry['status'] }) {
  if (status === 'done') return <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />;
  if (status === 'running')
    return <Loader2 className="size-4 shrink-0 animate-spin text-amber-600" aria-hidden />;
  if (status === 'failed') return <X className="size-4 shrink-0 text-destructive" aria-hidden />;
  return (
    <span
      className="size-4 shrink-0 rounded-full border border-muted-foreground/40"
      aria-hidden
    />
  );
}

export function AgentLiveConsole({
  projectName,
  agentIndex,
  progressPercent,
  failed = false,
  onRetry,
  className,
}: AgentLiveConsoleProps) {
  const t = useTranslations('workflow.aiState');
  const tm = useTranslations('workflow.aiState.milestones');
  const ta = useTranslations('workflow.aiState.agents');

  const milestones = buildPipelineMilestones(agentIndex, failed);
  const agents = buildAgentLiveTeam(agentIndex, failed);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-live-title"
      aria-busy={!failed}
    >
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div>
          <p id="agent-live-title" className="text-lg font-semibold">
            {t('consoleTitle')}
          </p>
          {projectName ? (
            <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
          ) : null}
        </div>

        <AiStateHero
          context={{
            surface: 'pipeline',
            pipelineAgentIndex: agentIndex,
            pipelineProgress: progressPercent,
            pipelineFailed: failed,
          }}
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t('milestonesLabel')}
          </p>
          <ol className="mt-3 space-y-2" role="list">
            {milestones.map((milestone, index) => (
              <li
                key={milestone.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  milestone.status === 'running' && 'bg-primary/5',
                  milestone.status === 'done' && 'text-muted-foreground',
                )}
              >
                <StatusIcon status={milestone.status} />
                <span className={milestone.status === 'running' ? 'font-medium' : undefined}>
                  {index + 1}. {tm(milestone.id)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t('teamLabel')}
          </p>
          <ul className="mt-3 space-y-3" role="list" aria-live="polite">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className={cn(
                  'rounded-xl border border-border/60 px-4 py-3',
                  agent.status === 'running' && 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={agent.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ta(`${agent.id}.name`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ta(`${agent.id}.${agent.status}`)}
                    </p>
                  </div>
                </div>
                {agent.status === 'running' && agent.progress != null ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {failed ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive">{t('failed')}</p>
            {onRetry ? (
              <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
                {t('retry')}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">{t('stayOnPage')}</p>
        )}
      </div>
    </div>
  );
}
