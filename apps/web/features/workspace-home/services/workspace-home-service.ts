import type { ConsultantViewModel } from '@/features/ai-consultant';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';
import type { StartupProject, ValidationReport } from '@repo/types/validation';

import type {
  WorkspaceFocusTask,
  WorkspaceHomeViewModel,
  WorkspaceProgressStep,
  WorkspaceProgressStepId,
  WorkspaceQuickAction,
  WorkspaceReportItem,
} from '../types';

type WorkspaceHomeInput = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  strategy: StrategyWorkspaceViewModel | null;
  consultant: ConsultantViewModel | null;
  reports: ValidationReport[];
  hasExecutiveReport: boolean;
};

const STEP_ORDER: WorkspaceProgressStepId[] = [
  'RESEARCH',
  'VOC',
  'EVIDENCE',
  'COMPETITOR',
  'GOVERNMENT',
  'DECISION',
  'REPORT',
];

function stepThreshold(
  id: WorkspaceProgressStepId,
  stats: ProjectDashboardStats,
  hasExecutiveReport: boolean,
): { done: boolean; percent: number } {
  switch (id) {
    case 'RESEARCH': {
      const { total, progressPercent } = stats.research;
      if (total === 0) return { done: false, percent: 0 };
      if (progressPercent >= 100) return { done: true, percent: 100 };
      return { done: progressPercent >= 50, percent: Math.max(progressPercent, 30) };
    }
    case 'VOC': {
      const total = stats.voc.total;
      const percent = Math.min(100, total * 10);
      return { done: total >= 5, percent };
    }
    case 'EVIDENCE': {
      const total = stats.evidence.total;
      const high = stats.evidence.byConfidence.HIGH;
      const percent = Math.min(100, total * 15 + high * 5);
      return { done: total >= 3 && high >= 1, percent };
    }
    case 'COMPETITOR': {
      const total = stats.competitors.total;
      const percent = Math.min(100, total * 25);
      return { done: total >= 2, percent };
    }
    case 'GOVERNMENT': {
      const total = stats.grants.total;
      const percent = Math.min(100, total * 33);
      return { done: total >= 2, percent };
    }
    case 'DECISION': {
      const hasValidation =
        stats.validationScore !== null && stats.validationScore.decision !== 'DRAFT';
      return { done: hasValidation, percent: hasValidation ? 100 : stats.validationScore ? 60 : 0 };
    }
    case 'REPORT':
      return { done: hasExecutiveReport, percent: hasExecutiveReport ? 100 : 0 };
    default:
      return { done: false, percent: 0 };
  }
}

const STEP_META: Record<
  WorkspaceProgressStepId,
  { labelKey: string; hrefSegment: string }
> = {
  RESEARCH: { labelKey: 'steps.research', hrefSegment: 'research' },
  VOC: { labelKey: 'steps.voc', hrefSegment: 'voc' },
  EVIDENCE: { labelKey: 'steps.evidence', hrefSegment: 'evidence' },
  COMPETITOR: { labelKey: 'steps.competitor', hrefSegment: 'competitors' },
  GOVERNMENT: { labelKey: 'steps.government', hrefSegment: 'grants' },
  DECISION: { labelKey: 'steps.decision', hrefSegment: 'decision' },
  REPORT: { labelKey: 'steps.report', hrefSegment: 'executive-report' },
};

function buildProgressSteps(
  projectId: string,
  stats: ProjectDashboardStats,
  hasExecutiveReport: boolean,
): WorkspaceProgressStep[] {
  return STEP_ORDER.map((id) => {
    const meta = STEP_META[id];
    const { done, percent } = stepThreshold(id, stats, hasExecutiveReport);
    return {
      id,
      labelKey: meta.labelKey,
      href: `/projects/${projectId}/${meta.hrefSegment}`,
      completed: done,
      percent: done ? 100 : Math.round(percent),
    };
  });
}

function buildFocusTasks(consultant: ConsultantViewModel | null): WorkspaceFocusTask[] {
  if (!consultant?.recommendations.length) {
    return [];
  }

  return consultant.recommendations.slice(0, 3).map((rec) => ({
    id: rec.id,
    labelKey: rec.labelKey,
    descriptionKey: rec.descriptionKey,
    whyKey: rec.descriptionKey,
    href: rec.href,
    rank: rec.rank,
    effectKey: rec.effectKey,
    stars: Math.max(3, 6 - rec.rank),
    estimatedMinutes: Math.max(5, rec.estimatedDays * 10),
    scoreImpact: rec.scoreImpact,
  }));
}

function buildRecentReports(projectId: string, reports: ValidationReport[]): WorkspaceReportItem[] {
  return [...reports]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map((report) => ({
      id: report.id,
      title: report.title,
      status: report.status,
      formatKey:
        report.status === 'COMPLETED'
          ? 'reportFormat.completed'
          : report.status === 'IN_PROGRESS'
            ? 'reportFormat.inProgress'
            : 'reportFormat.draft',
      updatedAt: report.updatedAt,
      href: `/projects/${projectId}/reports/${report.id}`,
    }));
}

function buildQuickActions(projectId: string): WorkspaceQuickAction[] {
  return [
    { id: 'addResearch', labelKey: 'quickActions.addResearch', href: `/projects/${projectId}/research/new` },
    { id: 'runAi', labelKey: 'quickActions.runAi', href: `/projects/${projectId}/agent` },
    { id: 'decision', labelKey: 'quickActions.decision', href: `/projects/${projectId}/decision` },
    { id: 'report', labelKey: 'quickActions.report', href: `/projects/${projectId}/reports/new` },
  ];
}

function computeOverallProgress(steps: WorkspaceProgressStep[]): number {
  if (steps.length === 0) return 0;
  const sum = steps.reduce((acc, step) => acc + step.percent, 0);
  return Math.round(sum / steps.length);
}

function computeConfidence(
  stats: ProjectDashboardStats,
  strategy: StrategyWorkspaceViewModel | null,
): number {
  if (strategy?.health.confidence) {
    return strategy.health.confidence;
  }
  const high = stats.evidence.byConfidence.HIGH;
  const base = Math.min(100, high * 12 + stats.research.progressPercent * 0.4);
  return Math.round(base);
}

export function buildWorkspaceHomeViewModel(input: WorkspaceHomeInput): WorkspaceHomeViewModel {
  const { project, stats, strategy, consultant, reports, hasExecutiveReport } = input;
  const projectId = project.id;
  const progressSteps = buildProgressSteps(projectId, stats, hasExecutiveReport);
  const overallProgress = strategy?.overallProgress ?? computeOverallProgress(progressSteps);
  const isEmpty =
    stats.research.total === 0 &&
    stats.evidence.total === 0 &&
    stats.voc.total === 0 &&
    stats.competitors.total === 0;

  return {
    projectId,
    overallProgress,
    progressSteps,
    focusTasks: buildFocusTasks(consultant),
    knowledge: {
      evidence: stats.evidence.total,
      voc: stats.voc.total,
      research: stats.research.total,
      competitors: stats.competitors.total,
      grants: stats.grants.total,
    },
    recentReports: buildRecentReports(projectId, reports),
    quickActions: buildQuickActions(projectId),
    isEmpty,
    emptySuggestionKey: 'empty.suggestion',
    emptyCtaHref: `/projects/${projectId}/research/new`,
    emptyCtaLabelKey: 'empty.cta',
    confidencePercent: computeConfidence(stats, strategy),
  };
}
