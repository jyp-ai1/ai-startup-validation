'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import { starsDisplay } from '../../lib/founder-executive-decision-board';

type FounderExecutiveDecisionBoardProps = {
  data: ExecutiveDecisionBoardData;
  onStartAction?: (actionId: string) => void;
  compact?: boolean;
  className?: string;
};

export function FounderExecutiveDecisionBoard({
  data,
  onStartAction,
  compact = false,
  className,
}: FounderExecutiveDecisionBoardProps) {
  const t = useTranslations('workflow.founderAiPm.executiveDecisionBoard');
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const { summary } = data;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] via-background to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      {/* ① Executive Summary */}
      <header className="border-b border-border/60 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t('summary.boardLabel')}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">{t('summary.aiJudgment')}</p>
          <span
            className={cn(
              'text-2xl font-bold',
              summary.verdict === 'GO'
                ? 'text-emerald-600'
                : summary.verdict === 'HOLD'
                  ? 'text-amber-600'
                  : 'text-red-600',
            )}
          >
            {t(`summary.verdict.${summary.verdict}`)} ({summary.scorePercent}%)
          </span>
        </div>
        <p className="mt-2 text-lg tracking-widest text-amber-500" aria-label={t('summary.confidenceStars')}>
          {starsDisplay(summary.stars)}
        </p>
        <p className="mt-4 text-base font-semibold leading-relaxed">{summary.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('summary.caveatPrefix')} {summary.caveat}
        </p>
        {summary.todayAction ? (
          <div className="mt-5 rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('summary.todayOnly')}
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-3 h-12 w-full rounded-xl text-base font-semibold"
              onClick={() => onStartAction?.(summary.todayAction!.id)}
            >
              {summary.todayAction.title}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t('summary.actionMeta', {
                minutes: summary.todayAction.minutes,
                impact: summary.todayAction.impact,
              })}
            </p>
          </div>
        ) : null}
      </header>

      {!compact ? (
        <div className="mt-6 space-y-8">
          {/* Decision Tree — 5-second verdict path */}
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
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      node.status === 'verdict' && 'text-primary',
                      node.status === 'ok' && 'text-emerald-700 dark:text-emerald-400',
                      node.status === 'gap' && 'text-amber-700 dark:text-amber-400',
                      node.status === 'action' && 'text-violet-700 dark:text-violet-400',
                    )}
                  >
                    {node.status === 'verdict'
                      ? t(`summary.verdict.${node.labelKey}`)
                      : node.status === 'action'
                        ? node.labelKey
                        : t(`decisionTree.nodes.${node.labelKey}` as 'decisionTree.nodes.market')}
                  </p>
                  {node.detail ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{node.detail}</p>
                  ) : null}
                  {index < data.decisionTree.length - 1 ? (
                    <span className="text-muted-foreground/50" aria-hidden>
                      ↓
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {/* Hypothesis */}
          <div className="rounded-xl border border-violet-300/40 bg-violet-50/30 p-4 dark:bg-violet-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              {t('hypothesis.label')}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{data.hypothesis.statement}</p>
            <p className="mt-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
              {t('hypothesis.confidence', { percent: data.hypothesis.confidence })}
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground">{t('hypothesis.reasons')}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                {data.hypothesis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ol>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground">{t('hypothesis.falsify')}</p>
              <ul className="mt-2 space-y-1.5" role="list">
                {data.hypothesis.falsifyItems.map((item) => (
                  <li key={item.key} className="flex items-center gap-2 text-sm">
                    <span className={item.checked ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {item.checked ? '☑' : '□'}
                    </span>
                    <span>{t(`hypothesis.falsifyItems.${item.key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ② Why? */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('why.label')}</h3>
            <ul className="space-y-2" role="list">
              {data.why.map((item) => (
                <li key={item.key} className="rounded-xl border border-border/60 bg-background/80">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                    onClick={() =>
                      setExpandedWhy((current) => (current === item.key ? null : item.key))
                    }
                  >
                    <span className="text-sm font-medium">
                      {starsDisplay(item.stars)} {t(`why.dimensions.${item.key}` as 'why.dimensions.market')}
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        expandedWhy === item.key && 'rotate-180',
                      )}
                    />
                  </button>
                  {expandedWhy === item.key ? (
                    <div className="border-t border-border/60 px-4 pb-3 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t('why.whyHigh', { dim: t(`why.dimensions.${item.key}` as 'why.dimensions.market') })}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {/* ③ Competitor Matrix */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('matrix.label')}</h3>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">{t('matrix.feature')}</th>
                    <th className="px-3 py-2 text-center font-medium text-primary">{t('matrix.us')}</th>
                    {data.competitorMatrix.competitorNames.map((name) => (
                      <th key={name} className="px-3 py-2 text-center font-medium">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.competitorMatrix.rows.map((row) => (
                    <tr key={row.featureKey} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">
                        {t(`matrix.features.${row.featureKey}` as 'matrix.features.aiPm')}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-primary">{row.us}</td>
                      {row.them.map((val, i) => (
                        <td key={`${row.featureKey}-${i}`} className="px-3 py-2 text-center text-muted-foreground">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ④ Position */}
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
                    point.isUs
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'border border-border bg-background',
                  )}
                  style={{ left: `${Math.max(8, Math.min(88, point.automation))}%` }}
                >
                  {point.isUs ? data.position.ourLabel : point.name}
                </span>
              ))}
            </div>
          </div>

          {/* ⑤ Strategy */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('strategy.label')}</h3>
            <ol className="space-y-3" role="list">
              {data.strategy.map((item, index) => (
                <li
                  key={item.key}
                  className="rounded-xl border border-border/60 bg-background/80 px-4 py-3"
                >
                  <p className="text-xs font-bold text-primary">
                    {index + 1}. {t(`strategy.items.${item.key}` as 'strategy.items.pricing')}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{item.headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* ⑥ Execution */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('execution.label')}</h3>
            <ul className="space-y-2" role="list">
              {data.execution.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left transition-colors hover:border-primary/40"
                    onClick={() => onStartAction?.(action.id)}
                  >
                    <span className="text-sm font-medium">{action.title}</span>
                    <span className="text-sm font-bold tabular-nums text-emerald-600">
                      +{action.impact}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
