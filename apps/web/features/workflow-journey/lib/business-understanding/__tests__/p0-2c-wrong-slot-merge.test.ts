import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { buildAnswerReview } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { applyAnswerToJudgment, buildCeoJudgmentState } from '../ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { extractDimensionSummaries } from '../ai-pm-dimension-extract';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmJudgmentTargetBindingV1ForTest } from '../ai-pm-judgment-target-binding-v1';
import { listUnconfirmedCriticalGaps } from '../adaptive-question-select';

const CEO_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

const PAIN_ANSWER = '양조장은 온라인 홍보 방법과 인력이 부족해 홍보가 어렵습니다.';

describe('P0-2C wrong-slot merge', () => {
  beforeEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
    setAiPmJudgmentTargetBindingV1ForTest(true);
  });

  afterEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    setAiPmJudgmentTargetBindingV1ForTest(null);
  });

  it('Test 1 — confirmed customer protected; pain answer merges to problem only', () => {
    const extracted = extractDimensionSummaries(PAIN_ANSWER, {
      targetGap: 'problemJtbd',
      issueId: 'problem_definition',
    });
    expect(extracted.customer).toBeUndefined();
    expect(extracted.problem?.summary).toMatch(/부족|어렵|홍보/);

    let prior = emptyCeoJudgmentState(0);
    prior.dimensions.customer = {
      ...prior.dimensions.customer,
      status: 'clear',
      summary: '소규모 양조장',
      currentConclusion: '소규모 양조장',
    };

    const after = applyAnswerToJudgment({
      prior,
      answer: PAIN_ANSWER,
      targetGap: 'problemJtbd',
      issueId: 'problem_definition',
    });

    expect(after.dimensions.customer.summary).toBe('소규모 양조장');
    expect(after.dimensions.problem.summary).toMatch(/부족|어렵|홍보/);
  });

  it('Test 2 — problemJtbd answer closes problem gap in review (no repeat-open)', () => {
    const result = buildAnswerReview({
      turnId: 't-p0-2c',
      userAnswer: PAIN_ANSWER,
      askedGapId: 'problemJtbd',
      askedIssueId: 'problem_definition',
      displayedQuestionText: '고객이 지금 가장 불편해하는 점은 무엇인가요?',
      askedQuestionText: '고객이 지금 가장 불편해하는 점은 무엇인가요?',
      existingFactsByKey: {
        customer: '소규모 양조장',
      },
    });
    expect(result.semantic.factKey).toBe('problem');
    expect(result.review.gapVerdicts.problemJtbd?.completeness).not.toBe('OPEN');
  });

  it('Test 3 — P0-2A corrected customer survives pain answer', () => {
    const priorCustomer = '소규모 영세 양조장';
    const after = applyAnswerToJudgment({
      prior: {
        ...emptyCeoJudgmentState(0),
        dimensions: {
          ...emptyCeoJudgmentState(0).dimensions,
          customer: {
            ...emptyCeoJudgmentState(0).dimensions.customer,
            status: 'clear',
            summary: priorCustomer,
            currentConclusion: priorCustomer,
            correctionApplied: true,
          },
        },
      },
      answer: PAIN_ANSWER,
      targetGap: 'problemJtbd',
      issueId: 'problem_definition',
    });
    expect(after.dimensions.customer.summary).toBe(priorCustomer);
  });

  it('Test 4 — P0-2B document extraction unchanged', () => {
    const understanding = buildBusinessUnderstanding(CEO_DOC);
    expect(understanding.customer.value).toMatch(/소규모\s*양조장/);
    expect(understanding.problem.value).toMatch(/니즈|홍보플랫폼/);
  });

  it('Judgment seeds document customer before Q&A turns', () => {
    const understanding = buildBusinessUnderstanding(CEO_DOC);
    const living = buildLivingUnderstandingState({
      documentText: CEO_DOC,
      understanding,
      turns: [],
      memory: buildConversationMemoryFromSources({
        projectId: 'p0-2c',
        documentText: CEO_DOC,
        turns: [],
        entities: null,
      }),
    });
    const state = buildCeoJudgmentState({ living, turns: [] });
    expect(state.dimensions.customer.summary).toMatch(/소규모\s*양조장/);
  });

  it('interpretAnswerSemantics routes pain on problemJtbd ask to problem fact', () => {
    const semantic = interpretAnswerSemantics({
      answer: PAIN_ANSWER,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'problemJtbd',
      existingFactsByKey: { customer: '소규모 양조장' },
    });
    expect(semantic.factKey).toBe('problem');
    expect(semantic.facts.some((f) => f.key === 'customer')).toBe(false);
  });

  it('living state drops problemJtbd from critical gaps after problem fact stored', () => {
    const understanding = buildBusinessUnderstanding(CEO_DOC);
    const turns = [
      {
        issueId: 'problem_definition' as const,
        targetGap: 'problemJtbd',
        answer: PAIN_ANSWER,
        intent: 'business_fact' as const,
        semanticFactKey: 'problem' as const,
        appliedAt: new Date().toISOString(),
        superseded: false,
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 'p0-2c',
      documentText: CEO_DOC,
      turns,
      entities: null,
    });
    const living = buildLivingUnderstandingState({
      documentText: CEO_DOC,
      understanding,
      turns,
      memory,
    });
    expect(listUnconfirmedCriticalGaps(living)).not.toContain('problemJtbd');
  });
});
