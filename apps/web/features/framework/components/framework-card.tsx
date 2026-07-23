'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FrameworkResult } from '@/features/framework';
import { cn } from '@repo/ui/lib/utils';

type FrameworkCardProps = {
  framework: FrameworkResult;
  expanded?: boolean;
  onToggle?: () => void;
};

export function FrameworkCard({ framework, expanded, onToggle }: FrameworkCardProps) {
  const t = useTranslations('framework');
  const topInsight = framework.insights[0];

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">
              {t(framework.titleKey as 'names.swot')}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              ✓
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(framework.summaryKey as 'summaries.swot', framework.summaryParams ?? {})}
          </p>
          {topInsight ? (
            <p className="mt-3 text-sm">
              <span className="font-medium text-foreground">
                {t('topInsight')}:{' '}
              </span>
              {t(topInsight.textKey as 'insights.swot.i1Text')}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('score')}</p>
            <p className="text-2xl font-bold tabular-nums">{framework.score}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('confidence')}
            </p>
            <p className="text-sm font-semibold tabular-nums">{framework.confidence}%</p>
          </div>
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              framework.decisionImpact >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {framework.decisionImpact > 0 ? '+' : ''}
            {framework.decisionImpact}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-border/50 px-5 py-5">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('insightsTitle')}
            </h4>
            <ul className="mt-3 space-y-3">
              {framework.insights.map((insight) => (
                <li key={insight.id} className="rounded-lg bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium">
                    {t(insight.labelKey as 'insights.swot.i1Label')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(insight.textKey as 'insights.swot.i1Text')}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('recommendationsTitle')}
            </h4>
            <ul className="mt-3 space-y-2">
              {framework.recommendations.map((rec) => (
                <li key={rec.id} className="flex gap-3 text-sm">
                  <span className="font-semibold text-primary">P{rec.priority}</span>
                  <div>
                    <p className="font-medium">
                      {t(rec.labelKey as 'recommendations.swot.r1Label')}
                    </p>
                    <p className="text-muted-foreground">
                      {t(rec.textKey as 'recommendations.swot.r1Text')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('evidenceTitle')}
            </h4>
            <ul className="mt-3 space-y-2">
              {framework.evidence.map((ev) => (
                <li key={ev.id} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t(ev.labelKey as 'evidence.research')}:{' '}
                  </span>
                  {t(ev.sourceKey as 'evidence.swotResearch')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
