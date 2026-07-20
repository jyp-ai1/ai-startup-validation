import type {
  CompetitorMarketPosition,
  EvidenceConfidence,
  StartupProject,
  ValidationDecision,
  ValidationScore,
} from '@repo/types/validation';

export type DashboardActivityType =
  | 'EVIDENCE'
  | 'VOC'
  | 'VALIDATION'
  | 'REPORT'
  | 'RESEARCH'
  | 'COMPETITOR';

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  label: string;
  occurredAt: string;
};

export type DashboardNextAction = {
  id: string;
  labelKey: string;
  href: string;
  completed: boolean;
};

export type DashboardTimelineDeadline = {
  id: string;
  title: string;
  deadline: string;
  href: string;
};

export type ProjectDashboardStats = {
  project: StartupProject;
  validationScore: ValidationScore | null;
  research: {
    total: number;
    completed: number;
    progressPercent: number;
  };
  evidence: {
    total: number;
    byConfidence: Record<EvidenceConfidence, number>;
  };
  voc: {
    total: number;
  };
  competitors: {
    total: number;
    byPosition: Record<CompetitorMarketPosition, number>;
  };
  grants: {
    total: number;
  };
  recentActivity: DashboardActivity[];
  nextActions: DashboardNextAction[];
  timeline: {
    recentDocuments: DashboardActivity[];
    recentAiResults: DashboardActivity[];
    upcomingDeadlines: DashboardTimelineDeadline[];
    validationUpdatedAt: string | null;
  };
};

export type WorkspaceContext = {
  activeProject: StartupProject | null;
  projectCount: number;
  stats: ProjectDashboardStats | null;
};

export type ValidationHealthLabel = 'excellent' | 'good' | 'needsWork' | 'critical' | 'pending';

export function getValidationHealth(
  score: ValidationScore | null,
): { label: ValidationHealthLabel; stars: number } {
  if (!score || score.decision === 'DRAFT') {
    return { label: 'pending', stars: 0 };
  }

  const stars = Math.min(5, Math.max(1, Math.round(score.totalScore / 20)));

  if (score.decision === 'NO_GO') return { label: 'critical', stars };
  if (score.decision === 'CONDITIONAL_GO') return { label: 'needsWork', stars };
  if (score.totalScore >= 85) return { label: 'excellent', stars };
  return { label: 'good', stars };
}

export function getDecisionTone(decision: ValidationDecision | null): string {
  switch (decision) {
    case 'GO':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'CONDITIONAL_GO':
      return 'text-amber-600 dark:text-amber-400';
    case 'NO_GO':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-muted-foreground';
  }
}
