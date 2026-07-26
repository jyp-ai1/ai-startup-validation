'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ResearchInsightItem } from '../../lib/founder-research-insights';

type FounderResearchSourcePanelProps = {
  items: ResearchInsightItem[];
  totalCount: number;
  providerId?: string;
  className?: string;
};

export function FounderResearchSourcePanel({
  items,
  totalCount,
  providerId,
  className,
}: FounderResearchSourcePanelProps) {
  const t = useTranslations('workflow.founderAiPm.researchSources');
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            {t('label')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <p className="text-sm font-medium tabular-nums">{t('totalCount', { count: totalCount })}</p>
      </div>

      {providerId === 'openrouter' ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{t('liveResearch')}</p>
      ) : null}

      <ul className="mt-4 space-y-2" role="list">
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <li key={item.id} className="rounded-xl border border-border/60 bg-muted/10">
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
              >
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.insight}</p>
                </div>
                <ChevronDown
                  className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <p className="border-t border-border/60 px-4 pb-3 pt-2 text-xs text-muted-foreground">
                  {t(`categories.${item.category}`)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
