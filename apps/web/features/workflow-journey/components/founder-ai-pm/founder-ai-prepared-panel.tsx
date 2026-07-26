'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type FounderAiPreparedPanelProps = {
  items: string[];
  className?: string;
};

export function FounderAiPreparedPanel({ items, className }: FounderAiPreparedPanelProps) {
  const t = useTranslations('workflow.aiPm.prepared');

  const displayItems =
    items.length > 0
      ? items
      : ['marketDone', 'competitorDone', 'viabilityDone'];

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <ul className="mt-4 space-y-2" role="list">
        {displayItems.map((key) => (
          <li
            key={key}
            className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
          >
            <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
            {t(`items.${key}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
