import { DEFAULT_LOCALE } from '@repo/i18n/config';

import type { ProjectDashboardStats } from '@/features/dashboard/types';

import type { DecisionInput } from './decision-types';

export function statsToDecisionInput(
  stats: ProjectDashboardStats,
  locale = DEFAULT_LOCALE,
): DecisionInput {
  return {
    projectId: stats.project.id,
    projectTitle: stats.project.title,
    projectType: stats.project.projectType,
    locale,
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
      avgFitScore: null,
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
