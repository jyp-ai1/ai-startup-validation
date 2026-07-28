'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationLogEntry } from '../../lib/v2-investigation-types';

type V2InvestigationLogProps = {
  entries: InvestigationLogEntry[];
  namespace?: 'investigation' | 'investigationSample';
  compact?: boolean;
  variant?: 'simple' | 'workJournal';
  title?: string;
  className?: string;
};

export function V2InvestigationLog({
  entries,
  namespace = 'investigation',
  compact = false,
  variant = 'workJournal',
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
      <ul className={cn('space-y-3', compact ? 'mt-2' : 'mt-3')}>
        {entries.map((entry) => (
          <li key={`${entry.id}-${entry.time}`} className="text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground">
                {entry.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t(`log.entries.${entry.id}`)}</p>
                {variant === 'workJournal' && entry.findingKey ? (
                  <>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {t(`log.findings.${entry.findingKey}.summary`)}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/80">
                      {t(`log.findings.${entry.findingKey}.insight`)}
                    </p>
                    {entry.durationMinutes ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t('log.duration', { minutes: entry.durationMinutes })}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
