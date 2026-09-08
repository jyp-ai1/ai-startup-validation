import { describe, expect, it } from 'vitest';

import { buildAiPmSimpleQuestionSnapshot } from '@/features/workflow-journey/lib/business-understanding/ai-pm-simple-question-presenter';

describe('buildAiPmSimpleQuestionSnapshot P0-5', () => {
  it('does not show misleading 5/5 progress score', () => {
    const snapshot = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: '고객은 누구인가요?',
      targetGap: 'customerPersona',
      questionCount: 4,
    });
    expect(snapshot.progressLabel).not.toMatch(/\/\s*5/);
    expect(snapshot.progressLabel).toContain('확인 진행 중');
  });
});
