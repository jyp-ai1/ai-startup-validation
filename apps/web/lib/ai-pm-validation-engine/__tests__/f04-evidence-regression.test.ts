import { describe, expect, it } from 'vitest';

import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';

describe('F04 — fact vs assumption in review', () => {
  it('WTP hedge yields ASSUMPTION on revenue', () => {
    setV3ReviewPipelineForTest(true);
    const { review } = buildAnswerReview({
      turnId: 'f04-1',
      askedGapId: 'pricingHint',
      askedQuestionText: '고객이 얼마나 낼 의향이 있나요?',
      askedIssueId: 'bm_design',
      userAnswer: '중소기업 고객이 월 10만원을 낼 것 같습니다.',
      displayedQuestionText: '고객이 얼마나 낼 의향이 있나요?',
      existingFactsByKey: {},
      priorClosedGaps: [],
    });
    const rev = review.extractedFacts.find((f) => f.key === 'revenue');
    expect(rev?.evidenceClass).toBe('ASSUMPTION');
  });

  it('validation cue yields FACT on revenue', () => {
    setV3ReviewPipelineForTest(true);
    const { review } = buildAnswerReview({
      turnId: 'f04-2',
      askedGapId: 'pricingHint',
      askedQuestionText: '가격 검증 근거를 알려주세요.',
      askedIssueId: 'bm_design',
      userAnswer:
        '실제 고객 20곳에 인터뷰했고 15곳이 월 10만원 결제 의향을 밝혔습니다.',
      displayedQuestionText: '가격 검증 근거를 알려주세요.',
      existingFactsByKey: {},
      priorClosedGaps: [],
    });
    const rev = review.extractedFacts.find((f) => f.key === 'revenue');
    expect(rev?.evidenceClass).toBe('FACT');
  });
});
