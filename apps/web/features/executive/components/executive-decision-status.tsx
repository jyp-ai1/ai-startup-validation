'use client';

import { useTranslations } from 'next-intl';

import { DecisionVerdictBadge } from '@/features/decision/components/decision-verdict-badge';
import type { ExecutiveWorkspaceViewModel } from '../services/executive-types';
import { formatRelativeTime } from '@repo/utils/date';

type ExecutiveDecisionStatusProps = {
  workspace: ExecutiveWorkspaceViewModel;
};

export function ExecutiveDecisionStatus({ workspace }: ExecutiveDecisionStatusProps) {
  const t = useTranslations('executive');

  return (
    <section className="grid gap-4 rounded-xl border border-border/50 bg-card px-6 py-5 sm:grid-cols-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('decisionStatus.verdict')}
        </p>
        <div className="mt-2">
          <DecisionVerdictBadge verdict={workspace.verdict} />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('decisionStatus.coverage')}
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums">
          {workspace.decision.explanation.evidenceCoverage.overallPercent}%
        </p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('decisionStatus.updated')}
        </p>
        <p className="mt-2 text-sm font-medium">
          {formatRelativeTime(new Date(workspace.decision.generatedAt))}
        </p>
      </div>
    </section>
  );
}
