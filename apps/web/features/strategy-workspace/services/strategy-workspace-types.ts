import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';

export type StrategyStageId =
  | 'RESEARCH'
  | 'EVIDENCE'
  | 'VOC'
  | 'COMPETITOR'
  | 'MARKET'
  | 'FRAMEWORK'
  | 'DECISION'
  | 'REPORT';

export type StrategyChecklistItem = {
  id: StrategyStageId;
  labelKey: string;
  href: string;
  completed: boolean;
  percent: number;
  estimatedMinutes: number;
};

export type NextBestAction = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  href: string;
  estimatedMinutes: number;
  stageId: StrategyStageId;
  ctaKey: string;
};

export type WorkspaceTimelineEntry = {
  id: StrategyStageId;
  labelKey: string;
  status: 'completed' | 'current' | 'upcoming';
  href: string;
};

export type ProjectHealthMetrics = {
  aiScore: number;
  progress: number;
  risk: number;
  confidence: number;
};

export type StrategyWorkspaceViewModel = {
  projectId: string;
  overallProgress: number;
  currentStage: StrategyStageId;
  currentStageLabelKey: string;
  estimatedMinutesRemaining: number;
  remainingTaskCount: number;
  checklist: StrategyChecklistItem[];
  nextAction: NextBestAction;
  timeline: WorkspaceTimelineEntry[];
  moduleProgress: StrategyChecklistItem[];
  health: ProjectHealthMetrics;
  greetingKey: string;
  introKey: string;
  isComplete: boolean;
};

export type StrategyWorkspaceInput = {
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  hasExecutiveReport: boolean;
};
