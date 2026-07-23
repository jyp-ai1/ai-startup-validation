import type { ProjectDashboardStats } from '@/features/dashboard/types';

export type WorkspaceHealthDimension = 'research' | 'evidence' | 'voc' | 'decision' | 'report';

export type WorkspaceHealthMetric = {
  id: WorkspaceHealthDimension;
  percent: number;
  labelKey: string;
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeWorkspaceHealthMetrics(
  stats: ProjectDashboardStats,
  hasExecutiveReport = false,
): WorkspaceHealthMetric[] {
  const researchPercent =
    stats.research.total === 0 ? 0 : clampPercent(stats.research.progressPercent);

  const evidencePercent = clampPercent(
    stats.evidence.total * 15 + stats.evidence.byConfidence.HIGH * 5,
  );

  const vocPercent = clampPercent(stats.voc.total * 20);

  const hasDecision =
    stats.validationScore !== null && stats.validationScore.decision !== 'DRAFT';
  const decisionPercent = hasDecision
    ? clampPercent(stats.validationScore?.totalScore ?? 100)
    : stats.research.completed > 0
      ? 40
      : 0;

  const reportPercent = hasExecutiveReport ? 100 : stats.recentActivity.some((a) => a.type === 'REPORT') ? 60 : 0;

  return [
    { id: 'research', percent: researchPercent, labelKey: 'health.research' },
    { id: 'evidence', percent: evidencePercent, labelKey: 'health.evidence' },
    { id: 'voc', percent: vocPercent, labelKey: 'health.voc' },
    { id: 'decision', percent: decisionPercent, labelKey: 'health.decision' },
    { id: 'report', percent: reportPercent, labelKey: 'health.report' },
  ];
}

export function healthTone(percent: number): string {
  if (percent >= 80) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (percent >= 50) return 'border-primary/30 bg-primary/10 text-primary';
  if (percent >= 25) return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'border-border/60 bg-muted/30 text-muted-foreground';
}
