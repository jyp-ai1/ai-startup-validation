import type { ProjectDashboardStats } from '@/features/dashboard/types';

import type { DecisionInput } from './decision-types';

export function statsToDecisionInput(stats: ProjectDashboardStats): DecisionInput {
  const grantFitScores = stats.grants.total > 0 ? null : null;
  // avgFitScore computed at service layer when loading grants detail — placeholder here
  return {
    projectId: stats.project.id,
    projectTitle: stats.project.title,
    projectType: stats.project.projectType,
    research: stats.research,
    evidence: {
      total: stats.evidence.total,
      highConfidence: stats.evidence.byConfidence.HIGH,
      mediumConfidence: stats.evidence.byConfidence.MEDIUM,
      lowConfidence: stats.evidence.byConfidence.LOW,
    },
    voc: stats.voc,
    competitors: stats.competitors,
    grants: {
      total: stats.grants.total,
      avgFitScore: grantFitScores,
    },
    validationScore: stats.validationScore,
  };
}

export function enrichDecisionInput(
  input: DecisionInput,
  avgFitScore: number | null,
): DecisionInput {
  return {
    ...input,
    grants: { ...input.grants, avgFitScore },
  };
}
