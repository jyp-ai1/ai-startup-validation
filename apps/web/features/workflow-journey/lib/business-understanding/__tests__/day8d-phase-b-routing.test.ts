import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { setAiPmAnswerFirstRoutingV1ForTest } from '../ai-pm-answer-first-routing-policy-v1';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildAnswerReview } from '../build-answer-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  extractCorrectedFactValue,
  isCustomerFieldCorrection,
} from '../ai-pm-correction-semantics';
import { upsertConfirmedFact, emptyConversationMemory, getFact } from '../conversation-memory';
import { resolveGapQuestionBinding } from '../gap-question-map';

const SOLUTION_Q = resolveGapQuestionBinding('solution').questionText;
const CUSTOMER_Q = resolveGapQuestionBinding('customerPersona').questionText;
const COMPETITION_Q = resolveGapQuestionBinding('alternativesCompetitors').questionText;
const DIFF_Q = resolveGapQuestionBinding('differentiationVsAlternatives').questionText;

describe('DAY 8-D Phase B — Answer-First Routing', () => {
  beforeEach(() => {
    setAiPmAnswerFirstRoutingV1ForTest(true);
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setAiPmAnswerFirstRoutingV1ForTest(null);
    setV3ReviewPipelineForTest(null);
  });

  it('B1 — solution question → competitor answer routes to competitor not business', () => {
    const answer =
      '경쟁사는 A, B가 있고 기존 서비스는 배송 관리가 안 됩니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'solution',
    });

    expect(semantic.factKey).toBe('competitor');
    expect(semantic.facts.map((f) => f.key)).toContain('competitor');
    expect(semantic.facts.map((f) => f.key)).not.toContain('business');
    expect(semantic.slotConflict).toBeTruthy();
    expect(semantic.slotConflict?.askedGap).toBe('solution');

    const review = buildAnswerReview({
      turnId: 'b1',
      askedGapId: 'solution',
      askedQuestionText: SOLUTION_Q,
      askedIssueId: 'problem_definition',
      userAnswer: answer,
      displayedQuestionText: SOLUTION_Q,
    });

    expect(review.semantic.factKey).toBe('competitor');
    expect(review.review.gapVerdicts.solution?.completeness).toBe('OPEN');
    expect(review.review.gapVerdicts.alternativesCompetitors?.completeness).toBe('CLOSED');
  });

  it('B2 — customer question → problem answer routes to problem not customer', () => {
    const answer =
      '가장 큰 불편은 주문·배송이 수기로 흩어져 매일 헷갈린다는 점입니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });

    expect(semantic.factKey).toBe('problem');
    expect(semantic.facts.map((f) => f.key)).toContain('problem');
    expect(semantic.facts.map((f) => f.key)).not.toContain('customer');
    expect(semantic.slotConflict?.askedGap).toBe('customerPersona');

    const review = buildAnswerReview({
      turnId: 'b2',
      askedGapId: 'customerPersona',
      askedQuestionText: CUSTOMER_Q,
      askedIssueId: 'customer_definition',
      userAnswer: answer,
      displayedQuestionText: CUSTOMER_Q,
    });

    expect(review.review.gapVerdicts.customerPersona?.completeness).toBe('OPEN');
    expect(review.review.gapVerdicts.problemJtbd?.completeness).toBe('CLOSED');
  });

  it('B3 — competition question → customer answer routes to customer', () => {
    const answer = '주 고객은 반찬가게와 꽃집 같은 직접 배송 소상공인입니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'alternativesCompetitors',
    });

    expect(semantic.factKey).toBe('customer');
    expect(semantic.facts.map((f) => f.key)).toContain('customer');
    expect(semantic.facts.map((f) => f.key)).not.toContain('competitor');
    expect(semantic.slotConflict?.askedGap).toBe('alternativesCompetitors');
  });

  it('B4 — value question → problem answer routes to problem', () => {
    const answer =
      '핵심 문제는 배송 누락과 고객 문의가 동시에 터져 운영이 마비된다는 점입니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'solution',
    });

    expect(semantic.factKey).toBe('problem');
    expect(semantic.facts.map((f) => f.key)).toContain('problem');
    expect(semantic.facts.map((f) => f.key)).not.toContain('business');
    expect(semantic.slotConflict).toBeTruthy();
  });

  it('B5 — differentiation answer with competition + value cues', () => {
    const answer =
      '경쟁사 A/B는 배송 관리가 없고, 차별점은 주문부터 배송까지 한 화면에서 끝나 고객이 시간을 아끼게 합니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'differentiationVsAlternatives',
    });

    const keys = semantic.facts.map((f) => f.key);
    expect(keys).toContain('competitor');
    expect(keys.some((k) => k === 'differentiation' || k === 'diffRelevance')).toBe(true);
  });

  it('B6 — multi-fact answer splits customer + market + delivery', () => {
    const answer =
      '주 고객은 반찬가게고, 주문은 전화와 네이버에서 받고, 배송은 직접 합니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });

    const keys = semantic.facts.map((f) => f.key);
    expect(keys).toContain('customer');
    expect(keys).toContain('market');
    expect(keys.some((k) => k === 'business')).toBe(true);
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it('B7 — correction + routing preserves CORRECT customer revision', () => {
    const answer = '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.';
    expect(isCustomerFieldCorrection(answer)).toBe(true);

    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'alternativesCompetitors',
      existingFactsByKey: { customer: '꽃집' },
    });

    expect(semantic.intent).toBe('correction');
    expect(semantic.factKey).toBe('customer');
    expect(semantic.value).toBe(extractCorrectedFactValue('customer', answer));
    expect(semantic.mergeable).toBe(true);
  });

  it('B8 — existing knowledge preserved when competitor added', () => {
    const memory = upsertConfirmedFact(
      emptyConversationMemory('b8'),
      'customer',
      '반찬가게',
      'user_turn',
    );

    const answer = '경쟁사는 A, B, C입니다.';
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'solution',
      existingFactsByKey: { customer: getFact(memory, 'customer')?.value ?? null },
    });

    expect(semantic.factKey).toBe('competitor');
    expect(semantic.facts.map((f) => f.key)).not.toContain('customer');

    const review = buildAnswerReview({
      turnId: 'b8',
      askedGapId: 'solution',
      askedQuestionText: SOLUTION_Q,
      askedIssueId: 'problem_definition',
      userAnswer: answer,
      displayedQuestionText: SOLUTION_Q,
      existingFactsByKey: { customer: '반찬가게' },
    });

    expect(review.review.extractedFacts.some((f) => f.key === 'competitor')).toBe(true);
    expect(review.review.extractedFacts.some((f) => f.key === 'customer')).toBe(false);
    expect(review.review.gapVerdicts.solution?.completeness).toBe('OPEN');
  });
});
