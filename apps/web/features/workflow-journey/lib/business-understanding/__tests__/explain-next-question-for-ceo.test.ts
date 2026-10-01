import { describe, expect, it } from 'vitest';

import { explainNextQuestionForCeo } from '../explain-next-question-for-ceo';
import type { NextQuestionDecision } from '../decide-next-question-from-review';

function baseDecision(overrides: Partial<NextQuestionDecision>): NextQuestionDecision {
  return {
    targetGap: 'customerPersona',
    targetGapId: 'customerPersona',
    issueId: 'customer_definition',
    questionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
    whyNow: '고객이 좁혀지면 문제·수익 검증 순서가 정해집니다.',
    rationale: '',
    actionRationale: '',
    score: 0,
    reframed: false,
    excludedGaps: [],
    drivenByReview: true,
    sourceAnswerId: 't1',
    sourceReviewId: 'r1',
    reviewAction: 'advance',
    action: 'advance',
    reason: 'test',
    ...overrides,
  };
}

describe('Track C — explain next question for CEO', () => {
  it('returns whyImportant without exposing numeric score', () => {
    const ex = explainNextQuestionForCeo(baseDecision({}));
    expect(ex.whyImportant.length).toBeGreaterThan(8);
    expect(ex.gapStatusLabel).toContain('확인');
    expect(JSON.stringify(ex)).not.toMatch(/score/i);
  });

  it('clarify action mentions conflict resolution', () => {
    const ex = explainNextQuestionForCeo(
      baseDecision({ reviewAction: 'clarify', action: 'clarify', clarifyTarget: { gapId: 'customerPersona', factKey: 'customer' } }),
    );
    expect(ex.decisionImpactHint).toContain('충돌');
  });
});
