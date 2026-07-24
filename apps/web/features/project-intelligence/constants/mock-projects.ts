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
    name: 'B2B SaaS 시장 검증',
    goalLabel: '사업 가능성 검토',
    confidence: 62,
    verdict: 'HOLD',
    status: 'active',
    updatedAt: '2026-07-24T09:00:00Z',
    isFavorite: true,
  },
  {
    id: 'proj-beta',
    name: '푸드테크 MVP',
    goalLabel: 'MVP 만들기',
    confidence: 71,
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
