/** Mock multi-project data — Epic 3 (no DB). */

export type MockProjectStatus = 'active' | 'archived' | 'favorite';

export type MockProject = {
  id: string;
  name: string;
  goalLabel: string;
  confidence: number;
  verdict: 'GO' | 'HOLD' | 'NO GO';
  status: MockProjectStatus;
  updatedAt: string;
  isFavorite?: boolean;
};

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'proj-alpha',
    name: 'AI Startup',
    goalLabel: '사업 가능성 검토',
    confidence: 82,
    verdict: 'GO',
    status: 'active',
    updatedAt: '2026-07-26T09:00:00Z',
    isFavorite: true,
  },
  {
    id: 'proj-launchlens',
    name: 'LaunchLens',
    goalLabel: '사업 가능성 검토',
    confidence: 91,
    verdict: 'GO',
    status: 'active',
    updatedAt: '2026-07-26T08:30:00Z',
  },
  {
    id: 'proj-beta',
    name: 'ERP',
    goalLabel: '회사 운영',
    confidence: 64,
    verdict: 'HOLD',
    status: 'active',
    updatedAt: '2026-07-22T14:30:00Z',
  },
  {
    id: 'proj-gamma',
    name: 'Series A IR 준비',
    goalLabel: '투자 준비',
    confidence: 84,
    verdict: 'GO',
    status: 'archived',
    updatedAt: '2026-07-10T11:00:00Z',
  },
];

export function getMockProject(id: string): MockProject {
  return MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0]!;
}
