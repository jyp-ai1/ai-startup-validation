'use client';

import { useState } from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import { starsDisplay } from '../../lib/founder-executive-decision-board';

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
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const { decisionEngine, businessCanvas } = data;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] via-background to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      {/* Sprint 21 — Decision Engine (above the fold) */}
      <header className="space-y-5 border-b border-border/60 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t('decisionEngine.finalAdvice')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'text-3xl font-bold',
                decisionEngine.verdict === 'GO'
                  ? 'text-emerald-600'
                  : decisionEngine.verdict === 'HOLD'
                    ? 'text-amber-600'
                    : 'text-red-600',
              )}
            >
              {t(`summary.verdict.${decisionEngine.verdict}`)}
            </span>
            <span className="text-2xl font-bold tabular-nums">{decisionEngine.scorePercent}%</span>
            <span className="text-lg tracking-widest text-amber-500">{starsDisplay(decisionEngine.stars)}</span>
          </div>
          <p className="mt-3 text-lg font-semibold">
            {t(`decisionEngine.recommendation.${decisionEngine.recommendation}`)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('decisionEngine.conditionLabel')}{' '}
            {t(`decisionEngine.condition.${decisionEngine.condition}`)}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('decisionEngine.todayReasons')}
          </p>
          <ul className="mt-3 space-y-2" role="list">
            {decisionEngine.todayReasons.map((reason) => (
              <li key={reason.key} className="flex items-center gap-2 text-sm">
                <ReasonIcon status={reason.status} />
                <span>{t(`decisionEngine.reasons.${reason.key}.${reason.status}` as 'decisionEngine.reasons.market.done')}</span>
              </li>
            ))}
          </ul>
        </div>

        {decisionEngine.approval ? (
          <div className="rounded-xl border-2 border-primary/40 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('decisionEngine.approvalLabel')}
            </p>
            <p className="mt-2 text-base font-semibold">{decisionEngine.approval.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">{t('decisionEngine.expectedEffect')}</span>
              <span className="text-lg font-bold tabular-nums">
                {decisionEngine.approval.scoreBefore}% → {decisionEngine.approval.scoreAfter}%
              </span>
              <span className="font-semibold text-emerald-600">+{decisionEngine.approval.impact}%</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              ROI {starsDisplay(decisionEngine.approval.roiStars)}
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-4 h-12 w-full rounded-xl text-base font-semibold"
              onClick={() => {
                if (onApproveAction) onApproveAction(decisionEngine.approval!.actionId);
                else onStartAction?.(decisionEngine.approval!.actionId);
              }}
            >
              {t('decisionEngine.approveCta')}
            </Button>
          </div>
        ) : null}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('decisionEngine.optionsLabel')}
          </p>
          <ul className="space-y-2" role="list">
            {decisionEngine.strategyOptions.map((option) => (
              <li
                key={option.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-sm',
                  option.recommended
                    ? 'border-primary/40 bg-primary/[0.06]'
                    : 'border-border/60 bg-background/80',
                  option.notRecommended && 'opacity-70',
                )}
              >
                <div>
                  <span className="font-bold text-primary">{option.id}</span>{' '}
                  <span className="font-medium">{option.title}</span>
                  {option.recommended ? (
                    <span className="ml-2 text-xs font-semibold text-primary">
                      {t('decisionEngine.recommended')}
                    </span>
                  ) : null}
                  {option.notRecommended ? (
                    <span className="ml-2 text-xs text-muted-foreground">{t('decisionEngine.notRecommended')}</span>
                  ) : null}
                </div>
                <span className="font-bold tabular-nums">{option.successPercent}%</span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Sprint 22 — Business Canvas */}
      {!compact ? (
        <div className="mt-6 rounded-xl border border-border/60 bg-background/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('canvas.label')}
          </p>
          <dl className="mt-4 divide-y divide-border/50">
            {(
              [
                ['customer', businessCanvas.customer],
                ['problem', businessCanvas.problem],
                ['solution', businessCanvas.solution],
                ['revenue', businessCanvas.revenue],
                ['differentiation', businessCanvas.differentiation],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[88px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                <dt className="text-xs font-semibold text-muted-foreground">{t(`canvas.${key}`)}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
            <div className="grid grid-cols-[88px_1fr] gap-3 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{t('canvas.currentStage')}</dt>
              <dd className="text-sm font-medium">
                {t(`canvas.stages.${businessCanvas.currentStage.labelKey}` as 'canvas.stages.marketValidation')}{' '}
                <span className="tabular-nums text-primary">{businessCanvas.currentStage.percent}%</span>
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {/* Evidence — below the fold */}
      {!compact ? (
        <details className="mt-6 rounded-xl border border-border/60 bg-muted/10">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-muted-foreground">
            {t('evidence.label')}
          </summary>
          <div className="space-y-8 border-t border-border/60 px-5 py-6">
            {/* Sprint 23 — Market metrics */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('market.label')}</h3>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    <dt className="text-[10px] font-semibold uppercase text-muted-foreground">{t(`market.${key}`)}</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Competitor business table */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('competitorTable.label')}</h3>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[300px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="px-3 py-2 text-left">{t('competitorTable.company')}</th>
                      <th className="px-3 py-2 text-center">{t('competitorTable.price')}</th>
                      <th className="px-3 py-2 text-center">AI</th>
                      <th className="px-3 py-2 text-center">{t('competitorTable.ops')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.competitorTable.map((row) => (
                      <tr key={row.name} className={cn('border-b border-border/40 last:border-0', row.isUs && 'bg-primary/[0.04]')}>
                        <td className={cn('px-3 py-2 font-medium', row.isUs && 'text-primary')}>{row.name}</td>
                        <td className="px-3 py-2 text-center tabular-nums">{row.price}</td>
                        <td className="px-3 py-2 text-center">{starsDisplay(row.aiStars)}</td>
                        <td className="px-3 py-2 text-center">{starsDisplay(row.opsStars)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Decision Tree */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('decisionTree.label')}</h3>
              <ol className="space-y-0 border-l-2 border-primary/30 pl-4" role="list">
                {data.decisionTree.map((node, index) => (
                  <li key={node.id} className="relative pb-3 last:pb-0">
                    <span
                      className={cn(
                        'absolute -left-[1.35rem] top-1 size-2.5 rounded-full border-2 border-background',
                        node.status === 'verdict' && 'bg-primary',
                        node.status === 'ok' && 'bg-emerald-500',
                        node.status === 'gap' && 'bg-amber-500',
                        node.status === 'action' && 'bg-violet-500',
                        node.status === 'branch' && 'bg-muted-foreground',
                      )}
                    />
                    <p className="text-sm font-semibold">
                      {node.status === 'verdict'
                        ? t(`summary.verdict.${node.labelKey}`)
                        : node.status === 'action'
                          ? node.labelKey
                          : t(`decisionTree.nodes.${node.labelKey}` as 'decisionTree.nodes.market')}
                    </p>
                    {node.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{node.detail}</p> : null}
                    {index < data.decisionTree.length - 1 ? (
                      <span className="text-muted-foreground/50" aria-hidden>↓</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            {/* Prioritized SWOT */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('swot.label')}</h3>
              <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Risk heatmap */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('risk.label')}</h3>
              <ul className="flex flex-wrap gap-2" role="list">
                {data.riskHeatmap.map((risk) => (
                  <li
                    key={risk.key}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      risk.level === 'high' && 'bg-red-100 text-red-800 dark:bg-red-950/40',
                      risk.level === 'medium' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/40',
                      risk.level === 'low' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40',
                    )}
                  >
                    {t(`why.dimensions.${risk.key}` as 'why.dimensions.market')} · {t(`risk.${risk.level}`)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sprint 24 — Scenarios */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('scenarios.label')}</h3>
              <ul className="space-y-2" role="list">
                {data.scenarios.map((scenario) => (
                  <li
                    key={scenario.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{t(`scenarios.items.${scenario.titleKey}` as 'scenarios.items.priceDown')}</span>
                      <span className="ml-2 text-muted-foreground">{scenario.change}</span>
                    </div>
                    <span className="font-bold tabular-nums">
                      {scenario.scoreImpact > 0 ? '+' : ''}
                      {scenario.scoreImpact}% → {scenario.resultingScore}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sprint 25 — Autonomous brief */}
            {data.autonomousBrief.changes.length > 0 ? (
              <div className="rounded-xl border border-sky-300/40 bg-sky-50/30 p-4 dark:bg-sky-950/20">
                <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
                  {t('autonomous.label')}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground" role="list">
                  {data.autonomousBrief.changes.map((change) => (
                    <li key={change}>· {change}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Why expandable */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('why.label')}</h3>
              <ul className="space-y-2" role="list">
                {data.why.map((item) => (
                  <li key={item.key} className="rounded-xl border border-border/60 bg-background/80">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                      onClick={() => setExpandedWhy((c) => (c === item.key ? null : item.key))}
                    >
                      <span className="text-sm font-medium">
                        {starsDisplay(item.stars)} {t(`why.dimensions.${item.key}` as 'why.dimensions.market')}
                      </span>
                      <ChevronDown className={cn('size-4 transition-transform', expandedWhy === item.key && 'rotate-180')} />
                    </button>
                    {expandedWhy === item.key ? (
                      <p className="border-t border-border/60 px-4 pb-3 pt-2 text-sm text-muted-foreground">{item.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {/* Position */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('position.label')}</h3>
              <div className="relative h-24 rounded-xl border border-border/60 bg-muted/20 px-4">
                <p className="absolute left-3 top-2 text-[10px] text-muted-foreground">{t('position.low')}</p>
                <p className="absolute right-3 top-2 text-[10px] text-muted-foreground">{t('position.high')}</p>
                {data.position.points.map((point) => (
                  <span
                    key={point.name}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      point.isUs ? 'bg-primary text-primary-foreground' : 'border border-border bg-background',
                    )}
                    style={{ left: `${Math.max(8, Math.min(88, point.automation))}%` }}
                  >
                    {point.isUs ? data.position.ourLabel : point.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </details>
      ) : null}
    </section>
  );
}
