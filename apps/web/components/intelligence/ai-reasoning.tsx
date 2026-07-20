'use client';

import { useTranslations } from 'next-intl';

import type { IntelligenceReasoningItem } from '@/lib/intelligence/types';

type AiReasoningProps = {
  items: IntelligenceReasoningItem[];
};

export function AiReasoning({ items }: AiReasoningProps) {
  const t = useTranslations();

  if (items.length === 0) return null;

  return (
    <div className="ll-consulting-card p-10">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('intelligence.whyVerdict')}
      </p>
      <ol className="mt-6 space-y-5">
        {items.map((item, index) => {
          const pct = Math.round((item.score / item.maxScore) * 100);
          return (
            <li key={item.key} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-3 font-medium">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  {t(item.key)}
                </span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-consulting-accent transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
