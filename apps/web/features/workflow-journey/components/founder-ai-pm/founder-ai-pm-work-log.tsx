'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { buildAiPmWorkLogEntries } from '../../lib/founder-ai-pm-work-log';
import type { JourneyHistoryEntry } from '../../lib/journey-history-store';
import type { FounderEvidenceEntry } from '../../lib/founder-evidence-store';

type FounderAiPmWorkLogProps = {
  evidence?: FounderEvidenceEntry[];
  history?: JourneyHistoryEntry[];
  className?: string;
};

export function FounderAiPmWorkLog({
  evidence = [],
  history = [],
  className,
}: FounderAiPmWorkLogProps) {
  const t = useTranslations('workflow.founderAiPm.workLog');

  const entries = useMemo(
    () => buildAiPmWorkLogEntries(evidence, history),
    [evidence, history],
  );

  if (entries.length === 0) return null;

  return (
    <aside
      className={cn('rounded-2xl border border-border/70 bg-card p-5', className)}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('title')}
      </p>
      <ul className="mt-4 space-y-0 divide-y divide-border/50" role="list">
        {entries.map((entry) => (
          <li key={entry.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="w-11 shrink-0 text-sm tabular-nums text-muted-foreground">
              {entry.time}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  entry.status === 'running' ? 'font-medium text-primary' : 'text-foreground',
                )}
              >
                {t(`entries.${entry.labelKey}`, entry.labelParams ?? {})}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
