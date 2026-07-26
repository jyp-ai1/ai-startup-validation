'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles, Target, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmFindingVerification } from '../../lib/founder-research-trust';
import { buildCompetitorCompareVerification } from '../../lib/founder-research-trust';
import type { CompetitiveIntelligenceBrief } from '../../lib/founder-competitive-intelligence';

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

type PanelClassName = { className?: string };

function VerificationBlock({
  verification,
  t,
}: {
  verification: AiPmFindingVerification;
  t: ReturnType<typeof useTranslations<'workflow.founderAiPm.researchTrust'>>;
}) {
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{t('verification.evidenceLabel')}</p>
      <ul className="mt-2 space-y-1" role="list">
        {verification.evidenceChecked.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600" aria-hidden>
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed">{verification.conclusion}</p>
      <p className="mt-2 text-sm font-medium tabular-nums">
        {t('verification.trustLabel')} {verification.trustPercent}%
      </p>
    </div>
  );
}

export function FounderCompetitorComparePanel({
  brief,
  verification,
  className,
}: { brief: CompetitiveIntelligenceBrief; verification: AiPmFindingVerification } & PanelClassName) {
  const t = useTranslations('workflow.founderAiPm.competitiveIntelligence');
  const tv = useTranslations('workflow.founderAiPm.researchTrust');
  const [openId, setOpenId] = useState<string | null>(brief.competitors[0]?.id ?? null);

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('competitors.title')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        <Target className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('competitors.title')}</p>

      <ul className="mt-4 space-y-2" role="list">
        {brief.competitors.map((competitor) => {
          const isOpen = openId === competitor.id;
          return (
            <li key={competitor.id} className="rounded-xl border border-border/60 bg-muted/10">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpenId(isOpen ? null : competitor.id)}
                aria-expanded={isOpen}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                  {competitor.rank}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{competitor.name}</span>
                <ChevronDown
                  className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <dl className="grid gap-2 border-t border-border/60 px-4 pb-4 pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('competitors.price')}</dt>
                    <dd>{competitor.price}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('competitors.target')}</dt>
                    <dd>{competitor.target}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">{t('competitors.features')}</dt>
                    <dd>{competitor.features}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('competitors.pros')}</dt>
                    <dd className="text-emerald-700 dark:text-emerald-400">{competitor.pros}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('competitors.cons')}</dt>
                    <dd className="text-amber-800 dark:text-amber-300">{competitor.cons}</dd>
                  </div>
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>

      <VerificationBlock verification={verification} t={tv} />
      <p className="mt-3 text-xs text-muted-foreground">{t('competitors.whyConclusion')}</p>
    </section>
  );
}

export function FounderMarketGapPanel({
  brief,
  className,
}: { brief: CompetitiveIntelligenceBrief } & PanelClassName) {
  const t = useTranslations('workflow.founderAiPm.competitiveIntelligence');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('marketGap.title')}
    >
      <p className="text-sm font-semibold">{t('marketGap.title')}</p>
      <div className="mt-3 space-y-2 font-mono text-sm">
        <div className="flex items-center justify-between gap-2">
          <span>{brief.marketGap.saturatedLabel}</span>
          <span className="text-muted-foreground">{t('marketGap.saturated')}</span>
        </div>
        <div className="border-t border-dashed border-border/70" aria-hidden />
        <div className="flex items-center justify-between gap-2 text-primary">
          <span>{brief.marketGap.gapLabel}</span>
          <span>{renderStars(brief.marketGap.gapStars)}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{brief.marketGap.recommendation}</p>

      <div className="relative mt-5 h-40 rounded-lg border border-dashed border-border/70 bg-muted/10">
        <span className="absolute left-2 top-2 text-[10px] text-muted-foreground">{t('positionMap.priceHigh')}</span>
        <span className="absolute bottom-2 left-2 text-[10px] text-muted-foreground">{t('positionMap.priceLow')}</span>
        <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">{t('positionMap.automation')}</span>
        {brief.positionMap.points.map((point) => (
          <div
            key={point.name}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-medium shadow-sm',
              point.isUs
                ? 'bg-violet-600 text-white'
                : 'border border-border/70 bg-background text-muted-foreground',
            )}
            style={{
              left: `${12 + point.automation * 0.76}%`,
              bottom: `${12 + point.price * 0.76}%`,
            }}
          >
            {point.isUs ? t('positionMap.us') : point.name}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FounderWinStrategyPanel({
  brief,
  className,
}: { brief: CompetitiveIntelligenceBrief } & PanelClassName) {
  const t = useTranslations('workflow.founderAiPm.competitiveIntelligence');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('winStrategy.title')}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Trophy className="size-4 text-violet-600" aria-hidden />
        {t('winStrategy.title')}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{t('winStrategy.competitorLead')}</p>
      <p className="mt-1 text-base font-semibold">{brief.winStrategy.competitorCompetesOn}</p>
      <p className="mt-4 text-sm text-muted-foreground">{t('winStrategy.weLead')}</p>
      <p className="mt-1 text-base font-semibold text-primary">{brief.winStrategy.weCompeteOn}</p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-background/80 px-4 py-3">
        <span className="text-sm font-medium">{t('winStrategy.positionLabel')}</span>
        <span className="text-lg text-amber-500">{renderStars(brief.winStrategy.positionStars)}</span>
      </div>
    </section>
  );
}

export function FounderAiPmStrategyPanel({
  brief,
  className,
}: { brief: CompetitiveIntelligenceBrief } & PanelClassName) {
  const t = useTranslations('workflow.founderAiPm.competitiveIntelligence');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('strategy.title')}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-violet-600" aria-hidden />
        {t('strategy.title')}
      </p>
      <p className="mt-2 text-base font-semibold">{brief.strategy.headline}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {brief.strategy.body}
      </p>
      <p className="mt-3 rounded-lg bg-muted/20 px-3 py-2 text-sm whitespace-pre-line">
        {brief.strategy.example}
      </p>

      <div className="mt-5 border-t border-border/60 pt-5">
        <p className="text-sm font-semibold">{t('pricing.title')}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t('pricing.entry')}</dt>
            <dd className="text-lg font-semibold tabular-nums">{brief.pricing.entry}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('pricing.recommended')}</dt>
            <dd className="text-lg font-semibold tabular-nums text-primary">{brief.pricing.recommended}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('pricing.average')}</dt>
            <dd className="text-lg font-semibold tabular-nums">{brief.pricing.average}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{t('pricing.reasonLabel')}</span>{' '}
          {brief.pricing.reason}
        </p>
      </div>
    </section>
  );
}

/** @deprecated Use split panels for trust-first flow ordering */
export function FounderCompetitiveIntelligencePanel({
  brief,
  pipeline,
  className,
}: { brief: CompetitiveIntelligenceBrief; pipeline?: import('@repo/agents').StrategyPipelineResult | null } & PanelClassName) {
  const verification = buildCompetitorCompareVerification(
    pipeline ?? null,
    brief.competitors.map((item) => item.name),
  );

  return (
    <div className={cn('space-y-6', className)}>
      <FounderCompetitorComparePanel brief={brief} verification={verification} />
      <FounderMarketGapPanel brief={brief} />
      <FounderWinStrategyPanel brief={brief} />
      <FounderAiPmStrategyPanel brief={brief} />
    </div>
  );
}
