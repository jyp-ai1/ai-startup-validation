'use client';

import { Clock, Target, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceMorningBriefProps = {
  confidence: number;
  projectName?: string;
  className?: string;
};

export function WorkspaceMorningBrief({
  confidence,
  projectName,
  className,
}: WorkspaceMorningBriefProps) {
  const t = useTranslations('workflow.epic3.morningBrief');

  return (
    <section
      className={cn(
        'grid gap-3 sm:grid-cols-3',
        className,
      )}
      aria-label={t('label')}
    >
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {t('todayGoal')}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{t('todayGoalValue')}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-3.5" aria-hidden />
          {t('progress')}
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{confidence}%</p>
        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
          → {DAILY_COACH.confidenceAfter}%
        </p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="size-3.5" aria-hidden />
          {t('decision')}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {projectName ? t('decisionValueNamed', { name: projectName }) : t('decisionValue')}
        </p>
      </div>
    </section>
  );
}
