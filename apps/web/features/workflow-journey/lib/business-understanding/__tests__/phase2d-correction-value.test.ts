/**
 * Phase 2-D fix C — a correction keeps the full corrected value and drops the correction prefix.
 */
import { describe, expect, it } from 'vitest';

import {
  extractCorrectedFactValue,
  parseNotXButYCorrection,
} from '../ai-pm-correction-semantics';
import { buildAnswerReview } from '../build-answer-review';

const PROBLEM_Q = '이 고객이 겪는 가장 큰 문제는 무엇인가요?';
const CUSTOMER_Q = '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?';

function customerFact(askedGapId: string, question: string, answer: string, prior: string) {
  const { review } = buildAnswerReview({
    turnId: 't-p2d-c',
    askedGapId,
    askedIssueId: askedGapId === 'customerPersona' ? 'customer_definition' : 'problem_definition',
    userAnswer: answer,
    displayedQuestionText: question,
    askedQuestionText: question,
    existingFactsByKey: { customer: prior },
  });
  return review.extractedFacts.find((f) => f.key === 'customer')?.value;
}

describe('Phase 2-D C — correction value', () => {
  it.each([
    ['정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.', '직장인·프리랜서', '중소 제조 CEO'],
    ['정정합니다. 핵심 고객은 바쁜 직장인이 아니라 1인 가구 대학생입니다.', '바쁜 직장인', '1인 가구 대학생'],
    ['아니요, 꽃집이 아니라 반찬가게예요', '꽃집', '반찬가게'],
    ['고객은 개인 투자자가 아니라 지역 세무사 사무실입니다', '개인 투자자', '지역 세무사 사무실'],
  ])('parses %s', (text, rejected, accepted) => {
    expect(parseNotXButYCorrection(text)).toEqual({ rejected, accepted });
  });

  it('stores the multi-token corrected value without the correction prefix', () => {
    const value = customerFact(
      'problemJtbd',
      PROBLEM_Q,
      '정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.',
      '직장인·프리랜서',
    );
    expect(value).toBe('중소 제조 CEO');
    expect(value).not.toMatch(/정정|아니라/);
  });

  it('keeps the corrected value on a direct customer ask', () => {
    expect(
      customerFact(
        'customerPersona',
        CUSTOMER_Q,
        '정정합니다. 핵심 고객은 바쁜 직장인이 아니라 1인 가구 대학생입니다.',
        '바쁜 직장인',
      ),
    ).toBe('1인 가구 대학생');
  });

  it('does not alter a normal (non-correction) customer answer', () => {
    expect(extractCorrectedFactValue('customer', '핵심 고객은 바쁜 직장인입니다.')).toBe(
      '핵심 고객은 바쁜 직장인입니다.',
    );
    expect(parseNotXButYCorrection('핵심 고객은 바쁜 직장인입니다.')).toBeNull();
    const { review } = buildAnswerReview({
      turnId: 't-p2d-c-normal',
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      userAnswer: '핵심 고객은 바쁜 직장인입니다.',
      displayedQuestionText: CUSTOMER_Q,
      askedQuestionText: CUSTOMER_Q,
    });
    expect(review.extractedFacts.find((f) => f.key === 'customer')?.value).toBe('바쁜 직장인');
  });
});
