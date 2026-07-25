'use client';

import { Clock, Shield, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type WorkflowOutcomesPanelProps = {
  className?: string;
};

export function WorkflowOutcomesPanel({ className }: WorkflowOutcomesPanelProps) {
  const t = useTranslations('workflow.confirmation.outcomes');

  const items = [
    { key: 'confidence' as const, icon: TrendingUp, value: '+28%', accent: 'text-emerald-700 dark:text-emerald-400' },
    { key: 'timeSaved' as const, icon: Clock, value: '−4h', accent: 'text-primary' },
    { key: 'riskReduced' as const, icon: Shield, value: '−35%', accent: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {items.map(({ key, icon: Icon, value, accent }, index) => (
        <div
          key={key}
          className="rounded-xl border border-border/60 bg-background/90 px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
            {t(key)}
          </div>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', accent)}>{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t(`${key}Hint`)}</p>
        </div>
      ))}
    </div>
  );
}
