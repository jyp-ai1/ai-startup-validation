'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { buildStrategyDiscoveryInsights } from '../../lib/founder-strategy-discovery';

type FounderStrategyDiscoveryPanelProps = {
  className?: string;
};

export function FounderStrategyDiscoveryPanel({ className }: FounderStrategyDiscoveryPanelProps) {
  const t = useTranslations('workflow.founderAiPm.strategyDiscovery');

  const insights = useMemo(() => buildStrategyDiscoveryInsights(), []);

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-800 dark:text-violet-300">
        <Sparkles className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>

      <ul className="mt-5 space-y-4" role="list">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-xl border border-border/60 bg-background/90 p-4"
          >
            <p className="text-sm font-semibold">{t(`insights.${insight.id}.title`)}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t(`insights.${insight.id}.body`, insight.bodyParams ?? {})}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
