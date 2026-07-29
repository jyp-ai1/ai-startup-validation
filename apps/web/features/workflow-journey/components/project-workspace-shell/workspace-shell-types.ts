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

export type WorkspaceSidebarSnapshot = {
  businessScore: number | null;
  progressPercent: number;
  completedTopics: number;
  totalTopics: number;
  activeStageKey: string;
  lastUpdatedMinutesAgo: number;
  nodes: WorkspaceNavNode[];
};
