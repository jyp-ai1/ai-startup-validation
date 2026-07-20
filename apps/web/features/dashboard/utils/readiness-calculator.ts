import type { ProjectDashboardStats } from '../types';

export type ReadinessMetric = {
  key: 'startup' | 'investment' | 'grant' | 'ai';
  percent: number;
  labelKey: string;
  statusKey: string;
};

function clamp(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function getLetterGrade(score: number | null): string {
  if (score === null) return '—';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function getTopPercent(score: number | null): number | null {
  if (score === null || score < 50) return null;
  return Math.min(99, Math.max(5, 100 - score));
}

function statusFromPercent(percent: number): string {
  if (percent >= 85) return 'excellent';
  if (percent >= 70) return 'good';
  if (percent >= 50) return 'needsWork';
  return 'critical';
}

export function buildReadinessMetrics(stats: ProjectDashboardStats): ReadinessMetric[] {
  const { validationScore, research, evidence, voc, competitors, grants } = stats;
  const score = validationScore?.totalScore ?? null;

  const startup = clamp(
    score !== null
      ? score
      : research.progressPercent * 0.6 + Math.min(voc.total, 20) * 2,
  );

  const investment = clamp(
    (score ?? 0) * 0.45 +
      evidence.byConfidence.HIGH * 4 +
      research.progressPercent * 0.25 +
      Math.min(competitors.total, 5) * 3,
  );

  const grant = clamp(
    grants.total === 0 ? 15 : 40 + Math.min(grants.total, 6) * 10,
  );

  const ai = clamp(
    evidence.byConfidence.HIGH * 5 +
      evidence.total * 1.5 +
      voc.total * 0.5 +
      (validationScore ? 15 : 0),
  );

  return [
    { key: 'startup', percent: startup, labelKey: 'intelligence.readiness.startup', statusKey: statusFromPercent(startup) },
    { key: 'investment', percent: investment, labelKey: 'intelligence.readiness.investment', statusKey: statusFromPercent(investment) },
    { key: 'grant', percent: grant, labelKey: 'intelligence.readiness.grant', statusKey: statusFromPercent(grant) },
    { key: 'ai', percent: ai, labelKey: 'intelligence.readiness.ai', statusKey: statusFromPercent(ai) },
  ];
}
