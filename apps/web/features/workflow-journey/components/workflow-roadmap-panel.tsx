'use client';

import { useTranslations } from 'next-intl';
import { Check, Clock, Shield, Sparkles, TrendingUp } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

const CHECKLIST_KEYS = ['market', 'competition', 'voc', 'decision'] as const;

type WorkflowRoadmapPanelProps = {
  className?: string;
};

export function WorkflowRoadmapPanel({ className }: WorkflowRoadmapPanelProps) {
  const t = useTranslations('workflow.confirmation.roadmap');

  const metrics = [
    { key: 'confidence' as const, icon: TrendingUp, value: '+28%' },
    { key: 'risk' as const, icon: Shield, value: '−35%' },
    { key: 'duration' as const, icon: Clock, value: '20m' },
    { key: 'success' as const, icon: Sparkles, value: '82%' },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(({ key, icon: Icon, value }) => (
          <div key={key} className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 text-center">
            <Icon className="mx-auto size-4 text-primary" aria-hidden />
            <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t(key)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('checklistTitle')}</p>
        <ul className="mt-3 space-y-2" role="list">
          {CHECKLIST_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="size-3.5" aria-hidden />
              </span>
              {t(`checklist.${key}`)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">{t('outcome')}</p>
      </div>
    </div>
  );
}
