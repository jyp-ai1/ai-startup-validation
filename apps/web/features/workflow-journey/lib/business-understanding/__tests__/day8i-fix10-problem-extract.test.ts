import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { extractDimensionSummaries } from '../ai-pm-dimension-extract';
import { evaluateAnswerQuality } from '../understanding-contract';
import { isPartialUnknownAnswer } from '../ai-pm-judgment-target-binding';
import { applyAnswerToJudgment } from '../ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';

const ANSWER =
  '양조장들은 온라인에 제품을 알릴 방법을 잘 모르고, 홍보할 인력도 부족합니다.';

describe('FIX-10 brewery problem extract', () => {
  beforeEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
  });

  afterEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
  });

  it('does not treat brewery problem sentence as unknown/frozen', () => {
    expect(isPartialUnknownAnswer(ANSWER)).toBe(false);
    expect(evaluateAnswerQuality(ANSWER).quality).not.toBe('UNKNOWN');
    const extracted = extractDimensionSummaries(ANSWER);
    expect(extracted.problem?.summary).toMatch(/모르|알릴|홍보|부족/);
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer: ANSWER,
      targetGap: 'customerPersona',
    });
    expect(state.dimensions.problem.summary).toMatch(/모르|알릴|홍보|부족/);
  });
});
