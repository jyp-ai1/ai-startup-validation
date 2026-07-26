'use client';

import { ArrowRight, Calendar, HelpCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DecisionIntelligencePath } from '../../lib/founder-intelligence-engine';

type DecisionIntelligencePathPanelProps = {
  path: DecisionIntelligencePath;
};

export function DecisionIntelligencePathPanel({ path }: DecisionIntelligencePathPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.decision');

  return (
    <section
      className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <Sparkles className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <ol className="mt-4 space-y-4" role="list">
        <li className="rounded-xl border border-amber-300/40 bg-amber-50/50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">
            <HelpCircle className="size-3.5" aria-hidden />
            {t('why')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed sm:text-base">
            {path.whyText ?? t(`whyReasons.${path.whyKey}`, path.whyParams)}
          </p>
        </li>
        <li className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{t('how')}</p>
          <p className="mt-1.5 text-sm leading-relaxed sm:text-base">
            {path.howText ?? t(`howActions.${path.howKey}`, path.howParams)}
          </p>
        </li>
        <li className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Calendar className="size-3.5" aria-hidden />
            {t('when')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed sm:text-base">
            {t(`whenHorizons.${path.whenKey}`, path.whenParams)}
          </p>
        </li>
        <li className="rounded-xl border border-emerald-300/40 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-300">
            <TrendingUp className="size-3.5" aria-hidden />
            {t('improvement')}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold sm:text-base">
            <span>
              {t('confidencePath', { from: path.confidenceFrom, to: path.confidenceTo })}
            </span>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-primary">
              {t('goPath', { from: path.goFrom, to: path.goTo })}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('etaDays', { days: path.etaDays })}
          </p>
        </li>
      </ol>
    </section>
  );
}
