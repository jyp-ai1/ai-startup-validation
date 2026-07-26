'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderEvidenceEntry } from '../../lib/founder-evidence-store';

type FounderEvidenceAutoPanelProps = {
  evidence: FounderEvidenceEntry[];
  className?: string;
};

export function FounderEvidenceAutoPanel({ evidence, className }: FounderEvidenceAutoPanelProps) {
  const t = useTranslations('workflow.founderAiPm.operating.evidence');

  if (evidence.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <h2 className="text-base font-semibold">{t('title')}</h2>
      <ul className="mt-4 space-y-3" role="list">
        {evidence.slice(0, 3).map((entry) => (
          <li key={entry.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t(`categories.${entry.category}`)}
            </p>
            <p className="mt-1 text-sm font-medium">{entry.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
            <p className="mt-2 text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              {t('impact', { impact: entry.confidenceImpact })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
