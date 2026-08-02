import { describe, expect, it } from 'vitest';

import { buildAiPmSharedMemory } from '../build-ai-pm-shared-memory';

describe('buildAiPmSharedMemory', () => {
  it('returns null when no turns completed', () => {
    expect(buildAiPmSharedMemory([], 'problem_definition')).toBeNull();
  });

  it('builds collaborative checklist from customer turn', () => {
    const memory = buildAiPmSharedMemory(
      [
        {
          issueId: 'customer_definition',
          answer: '구매자는 대표입니다.',
          appliedAt: new Date().toISOString(),
        },
      ],
      'problem_definition',
    );

    expect(memory?.lead).toBe('우리가 지금까지 정리한 내용입니다.');
    expect(memory?.items).toEqual([{ label: '구매자', value: '구매자는 대표입니다.' }]);
    expect(memory?.nextStep).toBe('다음은 문제를 보겠습니다.');
  });

  it('dedupes identical memory items', () => {
    const turn = {
      issueId: 'customer_definition' as const,
      answer: '구매자는 대표입니다.',
      appliedAt: new Date().toISOString(),
    };
    const memory = buildAiPmSharedMemory([turn, turn], 'problem_definition');
    expect(memory?.items).toHaveLength(1);
  });
});
