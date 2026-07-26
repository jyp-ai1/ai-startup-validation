'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { buildLiveTeamRoles } from '../../lib/ai-pm-live-team';

type AiPmLiveTeamPanelProps = {
  agentIndex: number;
  failed?: boolean;
  className?: string;
};

export function AiPmLiveTeamPanel({ agentIndex, failed = false, className }: AiPmLiveTeamPanelProps) {
  const t = useTranslations('workflow.aiPm.liveTeam');
  const roles = buildLiveTeamRoles(agentIndex, failed);

  return (
    <div className={cn('space-y-0 divide-y divide-border/60 rounded-2xl border border-border/70', className)}>
      {roles.map((role) => {
        const isRunning = role.status === 'running';
        const isDone = role.status === 'done';

        return (
          <div
            key={role.id}
            className={cn(
              'px-4 py-4 sm:px-5',
              isRunning && 'bg-amber-50/50 dark:bg-amber-950/20',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`roles.${role.id}.title`)}
                </p>
                <p className={cn('mt-1 text-sm font-medium', isRunning && 'text-foreground')}>
                  {t(`roles.${role.id}.${role.status}`)}
                </p>
              </div>
              {isDone ? (
                <Check className="size-5 shrink-0 text-emerald-600" aria-hidden />
              ) : null}
            </div>
            {isRunning ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${role.progress}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
