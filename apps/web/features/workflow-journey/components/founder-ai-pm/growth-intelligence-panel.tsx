'use client';

import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { GrowthPathItem } from '../../lib/founder-intelligence-engine';

type GrowthIntelligencePanelProps = {
  items: GrowthPathItem[];
};

export function GrowthIntelligencePanel({ items }: GrowthIntelligencePanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.growth');

  return (
    <section
      className="rounded-2xl border border-emerald-300/40 bg-emerald-50/30 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300">
        <Rocket className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <ol className="mt-4 space-y-2" role="list">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
              item.status === 'current'
                ? 'border-emerald-400/50 bg-background/80'
                : item.status === 'done'
                  ? 'border-emerald-300/30 bg-emerald-100/40 dark:bg-emerald-950/40'
                  : 'border-border/50 bg-background/50',
            )}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                {t(`phases.${item.phaseKey}`)}
              </p>
              <p className="text-sm font-medium">{item.title}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {t('weeks', { count: item.etaWeeks })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
