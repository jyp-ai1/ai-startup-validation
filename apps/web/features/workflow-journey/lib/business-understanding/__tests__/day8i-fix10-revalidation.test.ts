/**
 * DAY 8-I P0 FIX-10 — CEO trust journey revalidation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { applyAnswerToJudgment } from '../ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessReviewResult } from '../ai-pm-business-review';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmJudgmentFix9V1ForTest } from '../ai-pm-judgment-fix9-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmJudgmentFix7V1ForTest } from '../ai-pm-judgment-fix7-v1';
import { setAiPmJudgmentFix6V1ForTest } from '../ai-pm-judgment-fix6-v1';
import { setAiPmJudgmentFix5V1ForTest } from '../ai-pm-judgment-fix5-v1';
import { setAiPmJudgmentMeaningModelV1ForTest } from '../ai-pm-judgment-meaning-model-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { evaluateAllFix10Turns } from '../day8i-fix10-turn-acceptance';
import { runAllCpoChecks } from '../day8i-cpo-r-extended-checks';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

describe('DAY 8-I P0 FIX-10 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
    setAiPmJudgmentFix6V1ForTest(true);
    setAiPmJudgmentFix7V1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
    setAiPmJudgmentFix9V1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    setAiPmJudgmentFix6V1ForTest(null);
    setAiPmJudgmentFix7V1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    setAiPmJudgmentFix9V1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('passes FIX-10 CEO trust acceptance gates', () => {
    let state = emptyCeoJudgmentState(0);
    state = applyAnswerToJudgment({
      prior: state,
      answer: '양조장 사장님',
      targetGap: 'customerPersona',
      issueId: 'customer_definition',
    });
    state = applyAnswerToJudgment({
      prior: state,
      answer: '고객이 누군데?',
      targetGap: 'problemJtbd',
      issueId: 'problem_definition',
    });

    const failures = evaluateAllFix10Turns(state);
    expect(failures).toEqual([]);

    const review = buildBusinessReviewResult(state);
    expect(review.verdict).toBe('no_go');
    expect(review.verdict).not.toBe('conditional_go');
    expect(review.dimensions.customer.status).not.toBe('clear');
  });

  it('FIX-9 R1~R25 regression still passes with FIX-10 enabled', () => {
    const checks = runAllCpoChecks();
    const failed = checks.filter((c) => c.verdict === 'FAIL');
    expect(failed).toHaveLength(0);
  });
});
