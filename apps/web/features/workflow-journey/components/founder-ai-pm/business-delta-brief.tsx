'use client';

import { ArrowDown, Building2, Landmark, LineChart, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { BusinessDeltaJudgment } from '../../lib/founder-intelligence-engine';

const ICONS = {
  market: LineChart,
  competitor: Building2,
  investment: TrendingUp,
  government: Landmark,
} as const;

type BusinessDeltaBriefProps = {
  deltas: BusinessDeltaJudgment[];
  projectName?: string;
};

export function BusinessDeltaBrief({ deltas, projectName }: BusinessDeltaBriefProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.business');

  return (
    <section
      className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.12] via-background to-background p-6 sm:p-8"
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {t('sinceYesterday')}
      </p>
      {projectName ? (
        <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
      ) : null}
      <ul className="mt-5 space-y-4" role="list">
        {deltas.map((item) => {
          const Icon = ICONS[item.category];
          return (
            <li
              key={item.id}
              className="rounded-xl border border-border/60 bg-background/80 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-relaxed sm:text-base">
                    {item.changeText ??
                      (item.changeKey
                        ? t(`changes.${item.changeKey}`, item.changeParams ?? {})
                        : '')}
                  </p>
                  <div className="my-3 flex justify-center">
                    <ArrowDown className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.recommendationText ??
                      (item.recommendationKey
                        ? t(`recommendations.${item.recommendationKey}`)
                        : '')}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('reasonLabel')}:{' '}
                    {item.reasonText ??
                      (item.reasonKey ? t(`reasons.${item.reasonKey}`) : '')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {t('goImpact', { impact: item.goImpact })}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
