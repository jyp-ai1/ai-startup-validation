import { describe, expect, it } from 'vitest';

import { buildProjectIntakeSeed } from '@/lib/project/build-project-intake-seed';
import { extractProjectSeedDocument } from '@/lib/project/project-seed-document';

describe('project intake seed (Core Understanding P0)', () => {
  it('always includes title even when description is present', () => {
    const seed = buildProjectIntakeSeed('양조장 SaaS', 'MZ·FIT 관광객에게 양조장을 연결합니다');
    expect(seed).toContain('프로젝트 이름: 양조장 SaaS');
    expect(seed).toContain('MZ·FIT');
  });

  it('falls back to empty conversation seed when description missing', () => {
    const seed = buildProjectIntakeSeed('새 아이디어');
    expect(seed).toContain('프로젝트 이름: 새 아이디어');
    expect(seed).toMatch(/아직 확인되지 않음/);
  });

  it('extractProjectSeedDocument prepends title when paste omitted it', () => {
    const extracted = extractProjectSeedDocument({
      id: 'p1',
      title: '헬스케어 B2B',
      summary: '병원 대기 관리',
      status: 'ACTIVE',
      ownerUserId: 'u1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      onboardingContext: {
        v2Demo: {
          pastedContent: '병원 원장이 대기 줄로 재방문을 놓칩니다.',
          importSource: 'paste',
        },
      },
    } as never);
    expect(extracted).toContain('프로젝트 이름: 헬스케어 B2B');
    expect(extracted).toContain('병원 원장');
  });
});
