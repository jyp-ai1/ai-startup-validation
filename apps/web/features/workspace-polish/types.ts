export type WorkspaceSearchCategory =
  | 'project'
  | 'evidence'
  | 'report'
  | 'decision'
  | 'memory'
  | 'research';

export type WorkspaceSearchItem = {
  id: string;
  category: WorkspaceSearchCategory;
  title: string;
  subtitle?: string;
  href: string;
  keywords?: string[];
};

export type WorkspaceCommandId =
  | 'open_project'
  | 'generate_decision'
  | 'run_ai'
  | 'export_report'
  | 'open_dashboard'
  | 'add_research'
  | 'search';

export type WorkspaceCommand = {
  id: WorkspaceCommandId;
  labelKey: string;
  href?: string;
  shortcut?: string;
  action?: 'search';
};

export type FavoriteProject = {
  id: string;
  title: string;
  addedAt: string;
};
