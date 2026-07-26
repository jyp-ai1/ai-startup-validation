'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderEvidenceEntry } from '../../lib/founder-evidence-store';
import type { OperatingTimelineMilestone } from '../../lib/founder-project-state-store';

type FounderAiPmWorkLogProps = {
  timeline: OperatingTimelineMilestone[];
  evidence?: FounderEvidenceEntry[];
  className?: string;
};

export function FounderAiPmWorkLog({ timeline, evidence = [], className }: FounderAiPmWorkLogProps) {
  const t = useTranslations('workflow.founderAiPm.workLog');
  const tm = useTranslations('workflow.founderAiPm.operating.timeline.milestones');
  const te = useTranslations('workflow.founderAiPm.operating.evidence.categories');

  const running = timeline.find((item) => item.status === 'running');
  const recentEvidence = evidence.slice(-3).reverse();

  if (!running && recentEvidence.length === 0) return null;

  return (
    <aside
      className={cn('rounded-2xl border border-border/70 bg-card p-5', className)}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('label')}
      </p>
      <ul className="mt-4 space-y-3" role="list">
        {running ? (
          <li className="border-l-2 border-primary pl-3">
            <p className="text-sm font-medium">{t('runningLead')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tm(`${running.key}.running`)}
            </p>
          </li>
        ) : null}
        {recentEvidence.map((entry) => (
          <li key={entry.id} className="border-l-2 border-emerald-400/60 pl-3">
            <p className="text-sm font-medium">{te(entry.category)}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {entry.summary}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
