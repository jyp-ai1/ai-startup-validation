'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationLogEntry } from '../../lib/v2-investigation-types';

type V2InvestigationLogProps = {
  entries: InvestigationLogEntry[];
  namespace?: 'investigation' | 'investigationSample';
  compact?: boolean;
  className?: string;
};

export function V2InvestigationLog({
  entries,
  namespace = 'investigation',
  compact = false,
  className,
}: V2InvestigationLogProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}`);

  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 bg-muted/5',
        compact ? 'p-3' : 'p-4',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('log.title')}
      </p>
      <ul className={cn('space-y-2', compact ? 'mt-2' : 'mt-3')}>
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground">
              {entry.time}
            </span>
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>{t(`log.entries.${entry.id}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
