/**
 * Phase 2-D F16 — evaluator-only. The next-question check used exact keywords
 * ("검증|인터뷰|실험|증거") so the production validation ask
 * "그 차별점이 고객에게 왜 중요한가요?" was flagged F16 even when the slot was right.
 * Judge by semantic intent / slot. AI PM output is not changed here.
 */
import { describe, expect, it } from 'vitest';

import { evaluateTurnDeterministic } from '../deterministic-evaluator';
import { questionIntentForGap, questionTextHintsIntent } from '../question-intent';

const STOCK_VALIDATION = '그 차별점이 고객에게 왜 중요한가요?';
const STOCK_CUSTOMER = '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?';
const STOCK_PAYER = '서비스 비용은 누가 지불하나요?';

function evalQuestion(nextTargetGap: string, nextQuestionText: string) {
  return evaluateTurnDeterministic({
    userAnswer: '핵심 고객은 바쁜 직장인입니다.',
    extractedFacts: [],
    behavior: 'normal',
    turn: 2,
    groundTruthGap: { customerPersona: 'CLOSED' },
    aiGapSnapshot: {
      businessOneLiner: 'CLOSED',
      customerPersona: 'CLOSED',
      payer: 'CLOSED',
      problemJtbd: 'CLOSED',
      marketChannel: 'CLOSED',
      alternativesCompetitors: 'CLOSED',
      differentiationVsAlternatives: 'CLOSED',
    },
    askedGapId: 'customerPersona',
    nextTargetGap,
    nextQuestionText,
  });
}

describe('Phase 2-D F16 — keyword check reproduced', () => {
  it('the stock validation question has no 검증/인터뷰/실험/증거 keyword', () => {
    expect(/검증|인터뷰|실험|증거/.test(STOCK_VALIDATION)).toBe(false);
    expect(questionIntentForGap('validationTestability')).toBe('validation_evidence');
  });
});

describe('Phase 2-D F16 — semantic intent / slot', () => {
  it('accepts the production validation ask as the validation slot', () => {
    expect(questionTextHintsIntent(STOCK_VALIDATION, 'validation_evidence')).toBe(true);
    expect(evalQuestion('validationTestability', STOCK_VALIDATION).failureType).not.toContain(
      'F16_WRONG_NEXT_QUESTION_RATIONALE',
    );
  });

  it('accepts a 체감 / 가치 reframe of the same slot', () => {
    expect(
      questionTextHintsIntent(
        '그 차이가 고객에게 체감되는 순간은 언제인가요?',
        'validation_evidence',
      ),
    ).toBe(true);
  });

  it('still flags a payer question text on the validation slot', () => {
    expect(questionTextHintsIntent(STOCK_PAYER, 'validation_evidence')).toBe(false);
    expect(evalQuestion('validationTestability', STOCK_PAYER).failureType).toContain(
      'F16_WRONG_NEXT_QUESTION_RATIONALE',
    );
  });

  it('keeps the old exact keywords as a valid match', () => {
    expect(questionTextHintsIntent('고객 인터뷰로 검증할 증거가 있나요?', 'validation_evidence')).toBe(
      true,
    );
  });

  it('does not treat a customer ask as a failed validation check', () => {
    expect(questionTextHintsIntent(STOCK_CUSTOMER, 'customer_definition')).toBe(true);
  });
});
