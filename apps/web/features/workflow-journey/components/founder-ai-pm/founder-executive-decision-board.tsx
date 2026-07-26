'use client';

import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import { starsDisplay } from '../../lib/founder-executive-decision-board';

type DecisionTabId =
  | 'conclusion'
  | 'evidence'
  | 'market'
  | 'competitor'
  | 'pricing'
  | 'swot'
  | 'execution';

const TAB_ORDER: DecisionTabId[] = [
  'conclusion',
  'evidence',
  'market',
  'competitor',
  'pricing',
  'swot',
  'execution',
];

type FounderExecutiveDecisionBoardProps = {
  data: ExecutiveDecisionBoardData;
  onStartAction?: (actionId: string) => void;
  onApproveAction?: (actionId: string) => void;
  compact?: boolean;
  className?: string;
};

function ReasonIcon({ status }: { status: 'done' | 'partial' | 'gap' }) {
  if (status === 'done') return <Check className="size-4 text-emerald-600" aria-hidden />;
  if (status === 'partial') return <Minus className="size-4 text-amber-600" aria-hidden />;
  return <span className="text-amber-600" aria-hidden>△</span>;
}

export function FounderExecutiveDecisionBoard({
  data,
  onStartAction,
  onApproveAction,
  compact = false,
  className,
}: FounderExecutiveDecisionBoardProps) {
  const t = useTranslations('workflow.founderAiPm.executiveDecisionBoard');
  const [activeTab, setActiveTab] = useState<DecisionTabId>('conclusion');
  const { decisionEngine, businessCanvas } = data;
  const pricingStrategy = data.strategy.find((s) => s.key === 'pricing');

  const visibleTabs = compact
    ? (['conclusion', 'evidence', 'market', 'competitor'] as DecisionTabId[])
    : TAB_ORDER;

  const primaryReason =
    decisionEngine.todayReasons.find((r) => r.status === 'gap') ??
    decisionEngine.todayReasons.find((r) => r.status === 'partial');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] via-background to-background p-4 sm:p-5',
        className,
      )}
      aria-label={t('label')}
    >
      {/* Pinned — AI PM 판단 (never scrolls away) */}
      <div className="space-y-3 border-b border-border/60 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t('label')}
        </p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold',
              decisionEngine.verdict === 'GO'
                ? 'text-emerald-600'
                : decisionEngine.verdict === 'HOLD'
                  ? 'text-amber-600'
                  : 'text-red-600',
            )}
          >
            {decisionEngine.verdict === 'HOLD'
              ? t('conclusionPanel.conditionalGo')
              : t(`summary.verdict.${decisionEngine.verdict}`)}
          </span>
          <span className="text-2xl font-bold tabular-nums">{decisionEngine.scorePercent}%</span>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t('pinned.reasonLabel')}</p>
          <p className="mt-1 text-sm leading-relaxed">
            {primaryReason
              ? t(`decisionEngine.reasons.${primaryReason.key}.${primaryReason.status}` as 'decisionEngine.reasons.market.gap')
              : t(`decisionEngine.condition.${decisionEngine.condition}`)}
          </p>
        </div>

        {decisionEngine.approval ? (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{t('pinned.todayOnly')}</p>
              <p className="mt-1 text-base font-semibold">{decisionEngine.approval.title}</p>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-11 w-full rounded-xl font-semibold"
              onClick={() => {
                if (onApproveAction) onApproveAction(decisionEngine.approval!.actionId);
                else onStartAction?.(decisionEngine.approval!.actionId);
              }}
            >
              {t('decisionEngine.approveCta')}
            </Button>
          </>
        ) : null}
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1 border-b border-border/60 pb-3"
        role="tablist"
        aria-label={t('tabs.label')}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
            onClick={() => setActiveTab(tab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[240px]" role="tabpanel">
        {activeTab === 'conclusion' ? (
          <div className="space-y-3">
            <ul className="space-y-1.5" role="list">
              {decisionEngine.todayReasons.map((reason) => (
                <li key={reason.key} className="flex items-center gap-2 text-sm">
                  <ReasonIcon status={reason.status} />
                  <span>
                    {t(`decisionEngine.reasons.${reason.key}.${reason.status}` as 'decisionEngine.reasons.market.done')}
                  </span>
                </li>
              ))}
            </ul>
            {decisionEngine.approval ? (
              <p className="text-sm tabular-nums text-muted-foreground">
                {t('conclusionPanel.expectedScore')}{' '}
                {decisionEngine.approval.scoreBefore}% → {decisionEngine.approval.scoreAfter}%
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(`decisionEngine.recommendation.${decisionEngine.recommendation}`)}
              </p>
            )}
          </div>
        ) : null}

        {activeTab === 'swot' ? (
          <div className="grid grid-cols-2 gap-2">
            {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((quadrant) => (
              <div key={quadrant} className="rounded-xl border border-border/60 p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{t(`swot.${quadrant}`)}</p>
                <ul className="mt-2 space-y-1.5" role="list">
                  {data.prioritizedSwot[quadrant].map((item) => (
                    <li key={item.id} className="text-sm">
                      <span className="font-semibold uppercase text-primary">{item.id}</span>{' '}
                      {t(`swot.items.${item.label}` as 'swot.items.aiPm')}{' '}
                      {starsDisplay(item.stars)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === 'evidence' ? (
          <ul className="space-y-2" role="list">
            {data.why.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              >
                <span className="font-medium">{t(`why.dimensions.${item.key}` as 'why.dimensions.market')}</span>
                <span>{starsDisplay(item.stars)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'competitor' ? (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[260px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-3 py-2 text-left">{t('competitorTable.company')}</th>
                  <th className="px-3 py-2 text-center">{t('competitorTable.price')}</th>
                  <th className="px-3 py-2 text-center">{t('competitorTable.ai')}</th>
                  <th className="px-3 py-2 text-center">{t('competitorTable.ops')}</th>
                </tr>
              </thead>
              <tbody>
                {data.competitorTable.map((row) => (
                  <tr
                    key={row.name}
                    className={cn('border-b border-border/40 last:border-0', row.isUs && 'bg-primary/[0.04]')}
                  >
                    <td className={cn('px-3 py-2 font-medium', row.isUs && 'text-primary')}>{row.name}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.price}</td>
                    <td className="px-3 py-2 text-center">{starsDisplay(row.aiStars)}</td>
                    <td className="px-3 py-2 text-center">{starsDisplay(row.opsStars)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'market' ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ['marketSize', data.marketMetrics.marketSize],
                  ['cagr', data.marketMetrics.cagr],
                  ['tam', data.marketMetrics.tam],
                  ['sam', data.marketMetrics.sam],
                  ['som', data.marketMetrics.som],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <dt className="text-[10px] font-semibold text-muted-foreground">{t(`market.${key}`)}</dt>
                  <dd className="mt-1 text-base font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <dl className="divide-y divide-border/50 rounded-xl border border-border/60 p-3">
              {(
                [
                  ['customer', businessCanvas.customer],
                  ['problem', businessCanvas.problem],
                  ['solution', businessCanvas.solution],
                  ['differentiation', businessCanvas.differentiation],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[72px_1fr] gap-2 py-2 first:pt-0 last:pb-0">
                  <dt className="text-xs text-muted-foreground">{t(`canvas.${key}`)}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {activeTab === 'pricing' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs text-muted-foreground">{t('canvas.revenue')}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{businessCanvas.revenue}</p>
              {pricingStrategy?.detail ? (
                <p className="mt-2 text-sm text-muted-foreground">{pricingStrategy.detail}</p>
              ) : null}
            </div>
            <ul className="space-y-2" role="list">
              {data.scenarios
                .filter((s) => s.titleKey === 'priceDown')
                .map((scenario) => (
                  <li
                    key={scenario.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm"
                  >
                    <span>{t(`scenarios.items.${scenario.titleKey}` as 'scenarios.items.priceDown')}</span>
                    <span className="font-bold tabular-nums">
                      {scenario.scoreImpact > 0 ? '+' : ''}
                      {scenario.scoreImpact}% → {scenario.resultingScore}%
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {activeTab === 'execution' ? (
          <div className="space-y-4">
            <ul className="space-y-2" role="list">
              {decisionEngine.strategyOptions.map((option) => (
                <li
                  key={option.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-sm',
                    option.recommended ? 'border-primary/40 bg-primary/[0.06]' : 'border-border/60',
                  )}
                >
                  <div>
                    <span className="font-bold text-primary">{option.id}</span>{' '}
                    <span>{option.title}</span>
                    {option.recommended ? (
                      <span className="ml-2 text-xs font-semibold text-primary">
                        {t('decisionEngine.recommended')}
                      </span>
                    ) : null}
                  </div>
                  <span className="font-bold tabular-nums">{option.successPercent}%</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2" role="list">
              {data.execution.map((item) => (
                <li key={item.id} className="rounded-xl border border-border/60 px-4 py-3 text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-emerald-600">+{item.impact}%</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
