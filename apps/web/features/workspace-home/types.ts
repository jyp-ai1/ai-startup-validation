import type { ReportStatus } from '@repo/types/validation';

export type WorkspaceTabId = 'overview' | 'research' | 'decision' | 'report' | 'activity';

export type WorkspaceProgressStepId =
  | 'RESEARCH'
  | 'VOC'
  | 'EVIDENCE'
  | 'COMPETITOR'
  | 'GOVERNMENT'
  | 'DECISION'
  | 'REPORT';

export type WorkspaceProgressStep = {
  id: WorkspaceProgressStepId;
  labelKey: string;
  href: string;
  percent: number;
  completed: boolean;
};

export type WorkspaceFocusTask = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  whyKey: string;
  href: string;
  rank: number;
  effectKey: string;
  stars: number;
  estimatedMinutes: number;
  scoreImpact: number;
};

export type WorkspaceKnowledgeCounts = {
  evidence: number;
  voc: number;
  research: number;
  competitors: number;
  grants: number;
};

export type WorkspaceReportItem = {
  id: string;
  title: string;
  status: ReportStatus;
  formatKey: 'reportFormat.draft' | 'reportFormat.inProgress' | 'reportFormat.completed';
  updatedAt: string;
  href: string;
};

export type WorkspaceQuickActionId = 'addResearch' | 'runAi' | 'decision' | 'report';

export type WorkspaceQuickAction = {
  id: WorkspaceQuickActionId;
  labelKey: string;
  href: string;
};

export type WorkspaceHomeViewModel = {
  projectId: string;
  overallProgress: number;
  progressSteps: WorkspaceProgressStep[];
  focusTasks: WorkspaceFocusTask[];
  knowledge: WorkspaceKnowledgeCounts;
  recentReports: WorkspaceReportItem[];
  quickActions: WorkspaceQuickAction[];
  isEmpty: boolean;
  emptySuggestionKey: string;
  emptyCtaHref: string;
  emptyCtaLabelKey: string;
  confidencePercent: number;
};
