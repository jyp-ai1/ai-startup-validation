'use client';

import { Brain, Target, AlertTriangle, TrendingUp, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AI_MEMORY } from '@/features/project-intelligence/constants/ai-memory-mock';

const ICONS = {
  decision: Brain,
  goal: Target,
  risk: AlertTriangle,
  progress: TrendingUp,
  workflow: Workflow,
} as const;

export function JourneyAiMemoryPanel() {
  const t = useTranslations('workflow.epic3.memory');

  return (
    <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('eyebrow')}
      </p>
      <h3 className="mt-2 text-sm font-semibold">{t('title')}</h3>
      <ul className="mt-4 space-y-3">
        {AI_MEMORY.map((item) => {
          const Icon = ICONS[item.category];
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background px-3 py-2.5"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {t(`labels.${item.labelKey}`)}
                </p>
                <p className="text-sm">{t(`values.${item.valueKey}`)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
