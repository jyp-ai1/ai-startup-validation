'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import { starsDisplay } from '../../lib/founder-executive-decision-board';
import {
  DecisionBarChart,
  DecisionBlockBars,
  DecisionGapChecklist,
  DecisionMarketChart,
  DecisionPriceSensitivityChart,
} from './founder-decision-board-visuals';

type FounderExecutiveDecisionBoardProps = {
  data: ExecutiveDecisionBoardData;
  onStartAction?: (actionId: string) => void;
  onApproveAction?: (actionId: string) => void;
  compact?: boolean;
  className?: string;
};

function StarReasonRow({ label, stars }: { label: string; stars: number }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums tracking-wider">{starsDisplay(stars)}</span>
    </li>
  );
}

function verdictBadgeClass(verdict: ExecutiveDecisionBoardData['decisionEngine']['verdict']): string {
  if (verdict === 'GO') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (verdict === 'HOLD') return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400';
}

/** Conclusion-first — CEO asks "should I continue?" before anything else. */
export function FounderExecutiveDecisionBoard({
  data,
  onStartAction,
  onApproveAction,
  compact = false,
  className,
}: FounderExecutiveDecisionBoardProps) {
  const t = useTranslations('workflow.founderAiPm.executiveDecisionBoard');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { decisionEngine, businessCanvas } = data;

  const heroHeadline = useMemo(() => {
    if (decisionEngine.verdict === 'GO') return t('executive.heroHeadline.go');
    if (decisionEngine.verdict === 'HOLD') return t('executive.heroHeadline.hold');
    return t('executive.heroHeadline.noGo');
  }, [decisionEngine.verdict, t]);

  const verdictBadge =
    decisionEngine.verdict === 'HOLD'
      ? t('conclusionPanel.conditionalGo')
      : t(`summary.verdict.${decisionEngine.verdict}`);

  const reasonRows = useMemo(() => {
    const market = data.why.find((item) => item.key === 'market');
    const pricing = data.why.find((item) => item.key === 'pricing');
    const mvp = data.why.find((item) => item.key === 'mvp');
    const customerStars = Math.min(5, Math.max(1, (mvp?.stars ?? 2) + 1));
    return [
      { label: t('why.dimensions.market'), stars: market?.stars ?? 3 },
      { label: t('executive.customer'), stars: customerStars },
      { label: t('why.dimensions.pricing'), stars: pricing?.stars ?? 2 },
      { label: t('why.dimensions.mvp'), stars: mvp?.stars ?? 2 },
    ];
  }, [data.why, t]);

  const gapItems = useMemo(() => {
    const reasonByKey = (key: string) =>
      decisionEngine.todayReasons.find((item) => item.key === key)?.status;
    const gaps = [
      {
        key: 'pricingValidation',
        label: t('gapsPanel.items.pricingValidation'),
        hint: t('gapsPanel.hints.pricingValidation'),
        checked: reasonByKey('pricing') === 'done',
      },
      {
        key: 'mvpBuild',
        label: t('gapsPanel.items.mvpBuild'),
        hint: t('gapsPanel.hints.mvpBuild'),
        checked: reasonByKey('mvp') === 'done',
      },
      {
        key: 'interview',
        label: t('gapsPanel.items.interview'),
        hint: t('gapsPanel.hints.interview'),
        checked: reasonByKey('mvp') === 'done' || reasonByKey('mvp') === 'partial',
      },
      {
        key: 'competitive',
        label: t('gapsPanel.items.competitive'),
        hint: t('gapsPanel.hints.competitive'),
        checked: reasonByKey('competitor') === 'done',
      },
    ];
    return gaps.filter((item) => !item.checked);
  }, [decisionEngine.todayReasons, t]);

  const marketChartItems = useMemo(
    () => [
      { label: t('market.marketSize'), value: data.marketMetrics.marketSize, percent: 100 },
      { label: t('market.tam'), value: data.marketMetrics.tam, percent: 85 },
      { label: t('market.sam'), value: data.marketMetrics.sam, percent: 55 },
      { label: t('market.som'), value: data.marketMetrics.som, percent: 30 },
    ],
    [data.marketMetrics, t],
  );

  const pricePoints = useMemo(() => {
    const recommended = businessCanvas.revenue;
    const base = decisionEngine.scorePercent;
    return [
      { price: '9,900원', score: Math.max(35, base - 18) },
      { price: '14,900원', score: Math.max(45, base - 6) },
      { price: recommended.includes('원') ? recommended : `${recommended}`, score: base },
      { price: '29,000원', score: Math.max(40, base - 10) },
    ];
  }, [businessCanvas.revenue, decisionEngine.scorePercent]);

  const handleApprove = () => {
    if (!decisionEngine.approval) return;
    if (onApproveAction) onApproveAction(decisionEngine.approval.actionId);
    else onStartAction?.(decisionEngine.approval.actionId);
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] via-background to-background p-4 sm:p-5',
        className,
      )}
      aria-label={t('label')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t('label')}
        </p>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            verdictBadgeClass(decisionEngine.verdict),
          )}
        >
          {verdictBadge}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xl font-bold leading-snug sm:text-2xl">{heroHeadline}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
          ({decisionEngine.scorePercent}%)
        </p>
        <p className="mt-1 text-base tracking-wider text-muted-foreground">
          {starsDisplay(decisionEngine.stars)}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t('executive.reasonsLabel')}</p>
          <ul className="mt-2 space-y-1.5" role="list">
            {reasonRows.map((row) => (
              <StarReasonRow key={row.label} label={row.label} stars={row.stars} />
            ))}
          </ul>
        </div>

        {gapItems.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t('executive.gapsLabel')}</p>
            <DecisionGapChecklist items={gapItems} className="mt-2" />
          </div>
        ) : null}

        {decisionEngine.approval ? (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold text-primary">{t('executive.proposalLabel')}</p>
            <p className="mt-2 text-sm leading-relaxed">
              {t('executive.proposalBody', {
                action: decisionEngine.approval.title,
                impact: decisionEngine.approval.impact,
              })}
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-3 h-11 w-full rounded-xl font-semibold"
              onClick={handleApprove}
            >
              {t('decisionEngine.approveCta')}
            </Button>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <>
          <div className="my-5 border-t border-border/60" />
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? t('executive.detailsHide') : t('executive.detailsToggle')}
            <ChevronDown
              className={cn('size-4 transition-transform', detailsOpen && 'rotate-180')}
              aria-hidden
            />
          </button>

          {detailsOpen ? (
            <div className="mt-4 space-y-6 border-t border-border/40 pt-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{t('tabs.market')}</p>
                <DecisionMarketChart items={marketChartItems} className="mt-2" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{t('tabs.competitor')}</p>
                <div className="mt-2 space-y-3 rounded-xl border border-border/60 p-4">
                  {data.competitorTable.map((row) => (
                    <DecisionBlockBars
                      key={row.name}
                      label={row.name}
                      blocks={row.aiStars}
                      highlight={row.isUs}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{t('tabs.swot')}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((quadrant) => (
                    <div key={quadrant} className="rounded-xl border border-border/60 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        {t(`swot.${quadrant}`)}
                      </p>
                      <ul className="mt-2 space-y-1.5" role="list">
                        {data.prioritizedSwot[quadrant].map((item) => (
                          <li key={item.id} className="text-xs">
                            {t(`swot.items.${item.label}` as 'swot.items.aiPm')}{' '}
                            {starsDisplay(item.stars)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{t('tabs.pricing')}</p>
                <DecisionPriceSensitivityChart
                  className="mt-2"
                  points={pricePoints}
                  recommended={businessCanvas.revenue}
                  recommendedLabel={t('charts.recommendedPrice')}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{t('tabs.evidence')}</p>
                <DecisionBarChart
                  className="mt-2"
                  items={data.why.map((item) => ({
                    label: t(`why.dimensions.${item.key}` as 'why.dimensions.market'),
                    value: item.percent,
                    highlight: item.status === 'strong',
                  }))}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
