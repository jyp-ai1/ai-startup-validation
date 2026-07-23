'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ContextScoreViewModel } from '../types';

type ContextScorePanelProps = {
  scores: ContextScoreViewModel;
};

const SCORE_ITEMS = [
  { key: 'projectCompleteness', labelKey: 'projectCompleteness' },
  { key: 'memory', labelKey: 'memory' },
  { key: 'evidence', labelKey: 'evidence' },
  { key: 'decisionReady', labelKey: 'decisionReady' },
] as const;

function scoreTone(value: number): string {
  if (value >= 85) return 'text-emerald-600';
  if (value >= 65) return 'text-primary';
  return 'text-amber-600';
}

export function ContextScorePanel({ scores }: ContextScorePanelProps) {
  const t = useTranslations('context');

  return (
    <section className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {SCORE_ITEMS.map((item) => {
        const value = scores[item.key];
        return (
          <div key={item.key} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t(item.labelKey as 'projectCompleteness')}</p>
            <p className={cn('text-2xl font-bold tabular-nums', scoreTone(value))}>{value}%</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
