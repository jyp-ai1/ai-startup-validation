'use client';

import { Moon, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceEveningSummaryProps = {
  gain?: number;
  className?: string;
};

export function WorkspaceEveningSummary({ gain = 12, className }: WorkspaceEveningSummaryProps) {
  const t = useTranslations('workflow.epic3.eveningBrief');

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-gradient-to-br from-indigo-500/[0.06] to-card p-5',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
        <Moon className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t('summary', { gain })}</p>
      <ul className="mt-4 space-y-2 text-sm" role="list">
        <li className="rounded-lg bg-muted/30 px-3 py-2">{t('done1')}</li>
        <li className="rounded-lg bg-muted/30 px-3 py-2">{t('done2')}</li>
      </ul>
      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" aria-hidden />
        {t('encourage')}
      </p>
    </section>
  );
}
