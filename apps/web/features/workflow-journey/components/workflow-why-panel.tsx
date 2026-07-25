'use client';

import { useTranslations } from 'next-intl';
import { Lightbulb } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

const WHY_KEYS = ['marketFirst', 'competitionSecond', 'decisionLast'] as const;

type WorkflowWhyPanelProps = {
  className?: string;
};

export function WorkflowWhyPanel({ className }: WorkflowWhyPanelProps) {
  const t = useTranslations('workflow.confirmation.why');

  return (
    <div className={cn('rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20', className)}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
        <Lightbulb className="size-3.5" aria-hidden />
        {t('title')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      <ul className="mt-3 space-y-2" role="list">
        {WHY_KEYS.map((key, index) => (
          <li
            key={key}
            className="rounded-lg bg-background/80 px-3 py-2 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span className="font-medium text-foreground">{t(`${key}.title`)}</span>
            <span className="mt-0.5 block text-muted-foreground">{t(`${key}.desc`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
