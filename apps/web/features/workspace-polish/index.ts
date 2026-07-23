export type {
  WorkspaceSearchCategory,
  WorkspaceSearchItem,
  WorkspaceCommand,
  WorkspaceCommandId,
  FavoriteProject,
} from './types';

export { useFavoriteProjects } from './hooks/use-favorite-projects';
export { buildWorkspaceSearchIndex, filterSearchItems } from './services/search-index-service';

export { BlockProgress } from './components/block-progress';
export { TodaysFocusCard } from './components/todays-focus-card';
export { WorkspaceHeader } from './components/workspace-header';
export { WorkspaceSearch } from './components/workspace-search';
export { WorkspaceCommandPalette } from './components/workspace-command-palette';
export { FavoritesList } from './components/favorites-list';
export { RecentActivityPanel } from './components/recent-activity-panel';
export { WorkspaceEmptyState } from './components/workspace-empty-state';
export { WorkspacePolishHost, openWorkspaceSearch } from './components/workspace-polish-host';
export { WorkspaceHealthBadges } from './components/workspace-health-badges';
export { AiStatusIndicator, setAiStatus } from './components/ai-status-indicator';
export { computeWorkspaceHealthMetrics } from './utils/workspace-health';
