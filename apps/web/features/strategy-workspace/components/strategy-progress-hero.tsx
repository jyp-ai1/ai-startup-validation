'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import type { StrategyWorkspaceViewModel } from '../services/strategy-workspace-types';
import { QuickActionsBar } from './quick-actions-bar';

type StrategyProgressHeroProps = {
  strategy: StrategyWorkspaceViewModel;
  projectTitle: string;
};

export function StrategyProgressHero({ strategy, projectTitle }: StrategyProgressHeroProps) {
  const t = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (strategy.overallProgress === 0) {
      trackEvent(ANALYTICS_EVENTS.strategyStart, { project_id: strategy.projectId });
    } else if (strategy.isComplete) {
      trackEvent(ANALYTICS_EVENTS.strategyComplete, { project_id: strategy.projectId });
    } else {
      trackEvent(ANALYTICS_EVENTS.strategyContinue, {
        project_id: strategy.projectId,
        progress: strategy.overallProgress,
      });
    }
  }, [strategy, trackEvent]);

  const filledBlocks = Math.round(strategy.overallProgress / 14.28);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card px-6 py-8 md:px-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t('progress.eyebrow')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t(strategy.greetingKey, { project: projectTitle })}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {t(strategy.introKey)}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('progress.label')}</span>
              <span className="tabular-nums font-bold text-primary">{strategy.overallProgress}%</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 flex-1 rounded-sm transition-colors',
                    i < filledBlocks ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              {t('progress.currentStage')}:{' '}
              <strong className="text-foreground">
                {t(strategy.currentStageLabelKey as 'checklist.research')}
              </strong>
            </span>
            <span>{t('progress.estimatedTime', { min: strategy.estimatedMinutesRemaining })}</span>
            <span>{t('progress.remainingTasks', { count: strategy.remainingTaskCount })}</span>
          </div>
        </div>

        <QuickActionsBar projectId={strategy.projectId} />
      </div>
    </section>
  );
}
