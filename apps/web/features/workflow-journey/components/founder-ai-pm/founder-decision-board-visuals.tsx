'use client';

import { cn } from '@repo/ui/lib/utils';

type BarChartItem = {
  label: string;
  value: number;
  max?: number;
  highlight?: boolean;
};

export function DecisionBarChart({ items, className }: { items: BarChartItem[]; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)} role="list">
      {items.map((item) => {
        const max = item.max ?? 100;
        const width = Math.max(8, Math.round((item.value / max) * 100));
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={cn('font-medium', item.highlight && 'text-primary')}>{item.label}</span>
              <span className="tabular-nums text-muted-foreground">{item.value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', item.highlight ? 'bg-primary' : 'bg-primary/60')}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DecisionBlockBars({
  label,
  blocks,
  max = 5,
  highlight,
}: {
  label: string;
  blocks: number;
  max?: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={cn('min-w-0 truncate font-medium', highlight && 'text-primary')}>{label}</span>
      <span className="shrink-0 font-mono text-xs tracking-tight text-primary" aria-hidden>
        {'■'.repeat(Math.max(0, Math.min(max, blocks)))}
        <span className="text-muted-foreground/40">
          {'■'.repeat(Math.max(0, max - Math.min(max, blocks)))}
        </span>
      </span>
    </div>
  );
}

export function DecisionGapChecklist({
  items,
  className,
}: {
  items: Array<{ label: string; hint?: string; checked: boolean }>;
  className?: string;
}) {
  return (
    <ul className={cn('space-y-2', className)} role="list">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            'rounded-lg border px-3 py-2.5 text-sm',
            item.checked ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-amber-500/30 bg-amber-500/[0.06]',
          )}
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0" aria-hidden>
              {item.checked ? '☑' : '□'}
            </span>
            <div className="min-w-0">
              <p className="font-medium">{item.label}</p>
              {item.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DecisionMarketChart({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; percent: number }>;
  className?: string;
}) {
  const maxPercent = Math.max(...items.map((i) => i.percent), 1);
  return (
    <div className={cn('space-y-4', className)}>
      <DecisionBarChart
        items={items.map((item) => ({
          label: item.label,
          value: item.percent,
          max: maxPercent,
        }))}
      />
      <dl className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 bg-background/80 p-3">
            <dt className="text-[10px] font-semibold text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-base font-bold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DecisionPriceSensitivityChart({
  points,
  recommended,
  recommendedLabel = '권장',
  className,
}: {
  points: Array<{ price: string; score: number }>;
  recommended?: string;
  recommendedLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <DecisionBarChart
        items={points.map((point) => ({
          label: point.price,
          value: point.score,
          highlight: point.price === recommended,
        }))}
      />
      {recommended ? (
        <p className="text-center text-xs text-muted-foreground">
          {recommendedLabel}: <span className="font-semibold text-primary">{recommended}</span>
        </p>
      ) : null}
    </div>
  );
}
