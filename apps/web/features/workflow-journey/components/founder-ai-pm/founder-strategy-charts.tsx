'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type BarChartProps = {
  items: Array<{ key: string; percent: number; label?: string }>;
  className?: string;
  showWhy?: boolean;
};

export function StrategyBarChart({ items, className, showWhy = false }: BarChartProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.charts');

  return (
    <div className={cn('space-y-3', className)}>
      {showWhy ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('why')}</p>
      ) : null}
      <ul className="space-y-2.5" role="list">
        {items.map((item) => (
          <li key={item.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{item.label ?? t(`dimensions.${item.key}` as 'dimensions.market')}</span>
              <span className="tabular-nums text-muted-foreground">{item.percent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type SwotGridProps = {
  swot: {
    strengths: Array<{ label: string; detail: string }>;
    weaknesses: Array<{ label: string; detail: string }>;
    opportunities: Array<{ label: string; detail: string }>;
    threats: Array<{ label: string; detail: string }>;
  };
  className?: string;
};

const SWOT_COLORS = {
  s: 'border-emerald-300/50 bg-emerald-50/60 dark:bg-emerald-950/20',
  w: 'border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20',
  o: 'border-sky-300/50 bg-sky-50/60 dark:bg-sky-950/20',
  t: 'border-red-300/50 bg-red-50/60 dark:bg-red-950/20',
} as const;

export function StrategySwotGrid({ swot, className }: SwotGridProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.charts.swot');

  const cells = [
    { key: 's' as const, title: t('strength'), items: swot.strengths },
    { key: 'w' as const, title: t('weakness'), items: swot.weaknesses },
    { key: 'o' as const, title: t('opportunity'), items: swot.opportunities },
    { key: 't' as const, title: t('threat'), items: swot.threats },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {cells.map((cell) => (
        <div
          key={cell.key}
          className={cn('rounded-xl border p-3', SWOT_COLORS[cell.key])}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cell.title}</p>
          <ul className="mt-2 space-y-1.5" role="list">
            {cell.items.map((item) => (
              <li key={item.label} className="text-sm">
                <span className="font-semibold">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type PositioningMapProps = {
  points: Array<{ name: string; automation: number; price: number; isUs?: boolean }>;
  ourLabel: string;
  className?: string;
};

export function StrategyPositioningMap({ points, ourLabel, className }: PositioningMapProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.charts');

  return (
    <div className={cn('relative aspect-[4/3] rounded-xl border border-border/60 bg-muted/20 p-4', className)}>
      <p className="absolute left-3 top-2 text-[10px] font-semibold uppercase text-muted-foreground">
        {t('automation')}
      </p>
      <p className="absolute bottom-2 right-3 text-[10px] font-semibold uppercase text-muted-foreground">
        {t('price')}
      </p>
      {points.map((point) => (
        <div
          key={point.name}
          className={cn(
            'absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm',
            point.isUs
              ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
              : 'border border-border/70 bg-background text-foreground',
          )}
          style={{
            left: `${Math.max(8, Math.min(92, point.price))}%`,
            bottom: `${Math.max(8, Math.min(92, point.automation))}%`,
          }}
          title={point.name}
        >
          {point.isUs ? ourLabel : point.name}
        </div>
      ))}
    </div>
  );
}

type CompetitorCompareProps = {
  items: Array<{ name: string; score: number }>;
  className?: string;
};

export function StrategyCompetitorCompare({ items, className }: CompetitorCompareProps) {
  const maxScore = Math.max(...items.map((i) => i.score), 1);

  return (
    <ul className={cn('space-y-2.5', className)} role="list">
      {items.map((item, index) => (
        <li key={item.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className={cn('font-medium', index === 0 && 'text-primary')}>{item.name}</span>
            <span className="tabular-nums text-muted-foreground">{item.score}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                index === 0 ? 'bg-primary' : 'bg-muted-foreground/40',
              )}
              style={{ width: `${(item.score / maxScore) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

type ScoreTrendProps = {
  values: number[];
  className?: string;
};

export function StrategyScoreTrend({ values, className }: ScoreTrendProps) {
  if (values.length < 2) return null;

  return (
    <div className={cn('flex items-end justify-between gap-2', className)}>
      {values.map((value, index) => (
        <div key={`${index}-${value}`} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-sm font-bold tabular-nums">{value}</span>
          {index < values.length - 1 ? (
            <span className="text-muted-foreground" aria-hidden>
              ↓
            </span>
          ) : null}
          <div
            className="w-full max-w-[2.5rem] rounded-t-md bg-primary/80"
            style={{ height: `${Math.max(12, value * 0.5)}px` }}
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}

type ExecutionImpactProps = {
  actions: Array<{ id: string; title: string; impact: number; minutes: number }>;
  onStart?: (actionId: string) => void;
  className?: string;
};

export function StrategyExecutionList({ actions, onStart, className }: ExecutionImpactProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.flow');

  return (
    <ul className={cn('space-y-2', className)} role="list">
      {actions.map((action, index) => (
        <li key={action.id}>
          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            onClick={() => onStart?.(action.id)}
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{action.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('actionMeta', { minutes: action.minutes, impact: action.impact })}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
