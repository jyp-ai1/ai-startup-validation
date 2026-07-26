'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ExplainableJudgment } from '../../lib/founder-explainable-judgment';

type FounderExplainableJudgmentPanelProps = {
  judgment: ExplainableJudgment;
  className?: string;
};

function StarRow({ stars }: { stars: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-label={`${stars}/5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < stars ? 'opacity-100' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function FounderExplainableJudgmentPanel({
  judgment,
  className,
}: FounderExplainableJudgmentPanelProps) {
  const t = useTranslations('workflow.founderAiPm.explainableJudgment');
  const tf = useTranslations('workflow.founderAiPm.intelligence.successScore.factors');
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        {t('scoreBasisLabel')}
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('verdictLabel')}{' '}
            <span className="font-semibold text-foreground">{judgment.verdict}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('scoreAccuracyNote')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('scoreLabel')}</p>
          <p className="text-3xl font-bold tabular-nums">{judgment.scorePercent}%</p>
        </div>
      </div>

      <div className="my-5 border-t border-border/60" />

      <div>
        <p className="text-sm font-semibold">{t('validationCoverageTitle')}</p>
        <ul className="mt-3 space-y-2" role="list">
          {judgment.validationCoverage.map((dimension) => (
            <li
              key={dimension.key}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/10 px-3 py-2"
            >
              <span className="text-sm">{t(`validationCoverage.${dimension.key}`)}</span>
              <StarRow stars={dimension.stars} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">{t('dataCoverageLabel')}</span>{' '}
          <span className="font-semibold tabular-nums">{judgment.dataCoveragePercent}%</span>
        </p>
      </div>

      <div className="my-5 border-t border-border/60" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t('strengthsTitle')}</p>
          <ul className="mt-2 space-y-2" role="list">
            {judgment.strengths.length > 0 ? (
              judgment.strengths.map((factor) => (
                <li
                  key={factor.key}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
                >
                  <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{tf(factor.key)}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">{t('strengthsEmpty')}</li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t('gapsTitle')}</p>
          <ul className="mt-2 space-y-2" role="list">
            {judgment.gaps.length > 0 ? (
              judgment.gaps.map((factor) => (
                <li
                  key={factor.key}
                  className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2 text-sm dark:bg-amber-950/30"
                >
                  <span className="font-medium text-amber-700 dark:text-amber-400" aria-hidden>
                    △
                  </span>
                  <span>{tf(factor.key)}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">{t('gapsEmpty')}</li>
            )}
          </ul>
        </div>
      </div>

      <button
        type="button"
        className="mt-5 flex w-full items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left text-sm font-medium"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {t('expandCta')}
        <ChevronDown
          className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {expanded ? (
        <ul className="mt-4 space-y-3" role="list">
          {judgment.dimensions.map((dimension) => (
            <li
              key={dimension.key}
              className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t(`dimensions.${dimension.key}`)}</p>
                <StarRow stars={dimension.stars} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dimension.summary}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
