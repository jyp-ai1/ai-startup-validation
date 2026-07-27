'use client';

import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  type DecisionMemoryEntry,
  formatDecisionDate,
} from '../../lib/v2-decision-memory-store';

const SECTION = 'border-t border-border/40 pt-6 first:border-t-0 first:pt-0';

type V2DecisionMemoryDetailProps = {
  entry: DecisionMemoryEntry;
  className?: string;
};

export function V2DecisionMemoryDetail({ entry, className }: V2DecisionMemoryDetailProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.decisionMemory.detail');
  const locale = useLocale();

  return (
    <section className={cn('space-y-6', className)}>
      <div className={SECTION}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('decisionLabel')}
        </p>
        <p className="mt-3 text-lg font-semibold leading-relaxed tracking-tight">
          {entry.decision}
        </p>
      </div>

      <div className={SECTION}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('reasonLabel')}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {entry.reason}
        </p>
      </div>

      <div className={SECTION}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('evidenceLabel')}
        </p>
        <ul className="mt-3 space-y-1.5">
          {entry.evidence.map((item) => (
            <li key={item} className="text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className={SECTION}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('dateLabel')}
        </p>
        <p className="mt-3 text-sm">{formatDecisionDate(entry.decidedAt, locale)}</p>
      </div>

      <div className={SECTION}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('statusLabel')}
        </p>
        <p className="mt-3 text-sm font-medium">
          {entry.status === 'current' ? t('statusCurrent') : t('statusSuperseded')}
        </p>
      </div>
    </section>
  );
}
