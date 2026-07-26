'use client';

import { Building2, Landmark, LineChart, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { BusinessDeltaItem } from '../../lib/founder-intelligence-engine';

const ICONS = {
  market: LineChart,
  competitor: Building2,
  investment: TrendingUp,
  government: Landmark,
} as const;

type BusinessDeltaBriefProps = {
  deltas: BusinessDeltaItem[];
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
      <ul className="mt-5 space-y-3" role="list">
        {deltas.map((item) => {
          const Icon = ICONS[item.category];
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-sm leading-relaxed sm:text-base">
                {t(`items.${item.textKey}`, item.params ?? {})}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
