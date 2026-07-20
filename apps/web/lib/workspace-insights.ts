import type { ProjectDashboardStats } from '@/features/dashboard/types';

export type WorkspaceFeature =
  | 'default'
  | 'overview'
  | 'voc'
  | 'grants'
  | 'validation'
  | 'reports'
  | 'businessPlan'
  | 'prd'
  | 'devSpec'
  | 'knowledge'
  | 'agent';

export function buildFeatureInsightHighlights(
  feature: WorkspaceFeature,
  stats: ProjectDashboardStats | null,
): string[] {
  if (!stats) return [`workspace.insight.gaps.${feature === 'default' ? 'validation' : feature}`];

  const keys: string[] = [];

  switch (feature) {
    case 'voc':
      if (stats.voc.total < 20) keys.push('workspace.insight.gaps.voc');
      keys.push('workspace.insight.feature.voc.interviews');
      keys.push('workspace.insight.feature.voc.payment');
      break;
    case 'grants':
      if (stats.grants.total < 3) keys.push('workspace.insight.feature.grants.programs');
      keys.push('workspace.insight.feature.grants.deadline');
      break;
    case 'validation':
      if (!stats.validationScore || stats.validationScore.decision === 'DRAFT') {
        keys.push('workspace.insight.gaps.validation');
      }
      if (stats.validationScore && stats.validationScore.competitionScore < 10) {
        keys.push('workspace.insight.feature.validation.competition');
      }
      if (stats.validationScore && stats.validationScore.founderFitScore >= 12) {
        keys.push('workspace.insight.feature.validation.founder');
      }
      break;
    case 'reports':
    case 'businessPlan':
    case 'prd':
    case 'devSpec':
      if (stats.research.progressPercent < 80) keys.push('workspace.insight.gaps.research');
      if (stats.evidence.total < 10) keys.push('workspace.insight.gaps.evidence');
      break;
    case 'knowledge':
      keys.push('workspace.insight.feature.knowledge.chunks');
      if (stats.evidence.total < 5) keys.push('workspace.insight.gaps.evidence');
      break;
    case 'agent':
      keys.push('workspace.insight.feature.agent.context');
      if (stats.evidence.byConfidence.HIGH < 5) keys.push('workspace.insight.gaps.evidence');
      break;
    case 'overview':
    default:
      if (stats.research.progressPercent < 100) keys.push('workspace.insight.gaps.research');
      if (stats.voc.total < 20) keys.push('workspace.insight.gaps.voc');
      if (stats.competitors.total < 3) keys.push('workspace.insight.gaps.competitors');
      if (stats.evidence.byConfidence.HIGH < 10) keys.push('workspace.insight.gaps.evidence');
      if (!stats.validationScore || stats.validationScore.decision === 'DRAFT') {
        keys.push('workspace.insight.gaps.validation');
      }
      break;
  }

  return keys.slice(0, 4);
}
