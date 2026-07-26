'use client';

import { ArrowDown, CheckCircle2, Lightbulb, Scale, Search, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { StrategyDashboardData } from '../../lib/founder-strategy-dashboard';

type ExplainableFlowStep = {
  id: 'research' | 'discovery' | 'judgment' | 'strategy' | 'action';
  icon: typeof Search;
  title: string;
  body: string;
  active?: boolean;
  complete?: boolean;
};

type FounderExplainableWorkspaceFlowProps = {
  data: StrategyDashboardData;
  situation?: string;
  whyItems?: string[];
  className?: string;
};

export function FounderExplainableWorkspaceFlow({
  data,
  situation,
  whyItems = [],
  className,
}: FounderExplainableWorkspaceFlowProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.flow');

  const steps: ExplainableFlowStep[] = [
    {
      id: 'research',
      icon: Search,
      title: t('researchTitle'),
      body: data.researchInsight,
      complete: true,
    },
    {
      id: 'discovery',
      icon: Lightbulb,
      title: t('discoveryTitle'),
      body: data.discoveryInsight,
      complete: true,
    },
    {
      id: 'judgment',
      icon: Scale,
      title: t('judgmentTitle'),
      body: data.judgmentSummary,
      complete: true,
    },
    {
      id: 'strategy',
      icon: Target,
      title: t('strategyTitle'),
      body: data.strategyHeadline,
      active: true,
    },
    {
      id: 'action',
      icon: CheckCircle2,
      title: t('actionTitle'),
      body:
        data.todayActions[0]?.title ??
        t('actionFallback'),
      active: data.todayActions.length > 0,
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          {t('situationLabel')}
        </p>
        <p className="mt-2 text-base font-semibold leading-relaxed">
          {situation ?? t('situationFallback', { score: data.scorePercent })}
        </p>
      </div>

      {whyItems.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t('whyLabel')}
          </p>
          <ul className="mt-2 space-y-1.5" role="list">
            {whyItems.slice(0, 3).map((item) => (
              <li key={item} className="text-sm text-muted-foreground">
                · {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {t('pipelineLabel')}
        </p>
        <ol className="mt-3 space-y-0" role="list">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative pl-8">
                {!isLast ? (
                  <span
                    className="absolute left-[11px] top-7 h-[calc(100%-4px)] w-px bg-border"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    'absolute left-0 top-0.5 flex size-6 items-center justify-center rounded-full border',
                    step.complete
                      ? 'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                      : step.active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className={cn('pb-4', isLast && 'pb-0')}>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
                {!isLast ? (
                  <ArrowDown className="absolute -bottom-1 left-1 size-4 text-border" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border border-emerald-300/40 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">
          {t('actionNowLabel')}
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed">
          {data.todayActions[0]?.title ?? t('actionFallback')}
        </p>
      </div>
    </div>
  );
}
