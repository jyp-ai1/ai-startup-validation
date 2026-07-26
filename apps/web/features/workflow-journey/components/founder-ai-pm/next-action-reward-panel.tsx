'use client';

import { Clock, Target, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { FounderAiPmBrief } from '../../lib/founder-ai-pm-engine';

type NextActionRewardPanelProps = {
  actionTitle: string;
  brief: FounderAiPmBrief;
  actionLabel: string;
  onAction: () => void;
  className?: string;
};

export function NextActionRewardPanel({
  actionTitle,
  brief,
  actionLabel,
  onAction,
  className,
}: NextActionRewardPanelProps) {
  const t = useTranslations('workflow.founderAiPm.nextAction');
  const { nextAction } = brief;

  return (
    <div className={cn('rounded-xl border border-primary/25 bg-background/90 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('label')}</p>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {nextAction.priority}
        </span>
      </div>
      <p className="mt-2 text-base font-semibold text-foreground">{actionTitle}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2 text-center">
          <dt className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            {t('duration')}
          </dt>
          <dd className="mt-1 text-sm font-bold tabular-nums">
            {t('minutes', { count: nextAction.durationMinutes })}
          </dd>
        </div>
        <div className="rounded-lg border border-emerald-300/40 bg-emerald-50/50 px-2 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <dt className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp className="size-3" aria-hidden />
            {t('confidenceGain')}
          </dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            +{nextAction.confidenceGain}%
          </dd>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/[0.04] px-2 py-2 text-center">
          <dt className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Target className="size-3" aria-hidden />
            {t('goGain')}
          </dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-primary">
            +{nextAction.goProbabilityGain}%
          </dd>
        </div>
      </dl>
      <Button type="button" className="mt-4 w-full rounded-xl" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
