import type { MockProject, MockProjectStatus } from '@/features/project-intelligence/constants/mock-projects';

import { markV2ReturningUser } from './v2-workspace-home';

const CUSTOM_KEY = 'll_journey_custom_projects';
const ID_KEY = 'll_journey_project_id';

function loadCustomProjects(): MockProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockProject[];
  } catch {
    return [];
  }
}

function saveCustomProjects(projects: MockProject[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(projects));
}

/** Creates a workspace from the V2 validation flow and selects it as active. */
export function createV2Workspace(name: string, evidenceFilled: number): string {
  const created: MockProject = {
    id: `proj-v2-${Date.now()}`,
    name,
    goalLabel: '사업 가능성 검토',
    confidence: Math.min(Math.max(evidenceFilled * 20, 20), 100),
    verdict: 'HOLD',
    status: 'active' as MockProjectStatus,
    updatedAt: new Date().toISOString(),
  };
  const next = [created, ...loadCustomProjects()];
  saveCustomProjects(next);
  sessionStorage.setItem(ID_KEY, created.id);
  sessionStorage.setItem('ll_project_started', '1');
  markV2ReturningUser();
  return created.id;
}

export function loadV2WorkspaceProjects(): MockProject[] {
  return loadCustomProjects();
}
