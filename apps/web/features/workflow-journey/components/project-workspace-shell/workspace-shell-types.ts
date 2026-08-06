import type { WorkspaceScoreDimensionId } from '../../lib/build-workspace-review-score';

export type NavNodeLifecycle = 'waiting' | 'in_progress' | 'completed';

export type WorkspaceMainView = 'ai-pm' | 'overview';

export type WorkspaceNavNodeId =
  | 'founder'
  | 'business'
  | 'customer'
  | 'market'
  | 'competitor';

export type WorkspaceNavNode = {
  id: WorkspaceNavNodeId;
  labelKey: string;
  lifecycle: NavNodeLifecycle;
};

export type OverviewBlockId =
  | 'score'
  | 'summary'
  | 'nextStep'
  | 'risk'
  | 'recommendation';

export type WorkspaceScoreDimensionSnapshot = {
  id: WorkspaceScoreDimensionId;
  score: number;
};

export type WorkspaceSidebarSnapshot = {
  businessScore: number | null;
  scoreDimensions: WorkspaceScoreDimensionSnapshot[];
  progressPercent: number;
  completedTopics: number;
  totalTopics: number;
  activeStageKey: string;
  lastUpdatedMinutesAgo: number;
  nodes: WorkspaceNavNode[];
  /** Hide score/progress during AI PM loop — CPO product gate. */
  hideProgressMetrics?: boolean;
  /** S8-1 — ●/○ journey steps (business · customer · market · review). */
  journeySteps?: Array<{
    id: 'business' | 'customer' | 'market' | 'review' | 'analysis';
    lifecycle: NavNodeLifecycle;
  }>;
  stepFirstProgress?: boolean;
};
