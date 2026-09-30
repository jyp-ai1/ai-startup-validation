import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { extractAnswerSemanticEvidences } from '../ai-pm-answer-semantic-sot';
import { extractDimensionSummaries } from '../ai-pm-dimension-extract';
import { applyAnswerToJudgment, buildCeoJudgmentState } from '../ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { pickNextCheckDimension } from '../ai-pm-judgment-conclusion';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmJudgmentTargetBindingV1ForTest } from '../ai-pm-judgment-target-binding-v1';
import { setAiPmP02cSupplementHandoffForTest } from '../ai-pm-p0-2c-supplement-handoff';
import { shouldHandoffToFinalReview } from '../ai-pm-p0-2c-supplement-handoff';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const CEO_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

const CUSTOMER_CHANGE_ANSWER =
  '홍보·SNS 관리 시간이 줄고, 온라인 노출 실수(누락)가 줄어듭니다.';

describe('P0-2C customerChange supplement → Final Review handoff', () => {
  beforeEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
    setAiPmJudgmentTargetBindingV1ForTest(true);
    setAiPmP02cSupplementHandoffForTest(true);
  });

  afterEach(() => {
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    setAiPmJudgmentTargetBindingV1ForTest(null);
    setAiPmP02cSupplementHandoffForTest(null);
  });

  it('extracts customerChange from supplement-style CEO answer', () => {
    const raw = extractAnswerSemanticEvidences(CUSTOMER_CHANGE_ANSWER);
    expect(raw.frozen).toBe(false);
    expect(raw.evidences.some((e) => e.dimension === 'customerChange')).toBe(true);
    const hit = extractDimensionSummaries(CUSTOMER_CHANGE_ANSWER, {
      targetGap: 'validationTestability',
      issueId: 'market_validation',
    });
    expect(hit.customerChange?.summary).toMatch(/홍보|SNS|줄/);
  });

  it('validationTestability supplement promotes customerChange to clear', () => {
    let prior = emptyCeoJudgmentState(2);
    prior.dimensions.customer = {
      ...prior.dimensions.customer,
      status: 'clear',
      summary: '소규모 양조장',
      currentConclusion: '소규모 양조장',
      sourceTurns: [1],
    };
    prior.dimensions.problem = {
      ...prior.dimensions.problem,
      status: 'clear',
      summary: '온라인 홍보 방법과 인력 부족',
      currentConclusion: '온라인 홍보 방법과 인력 부족',
      sourceTurns: [2],
    };
    prior.dimensions.solution = {
      ...prior.dimensions.solution,
      status: 'clear',
      summary: '양조장 맞춤 온라인 홍보 SaaS',
      currentConclusion: '양조장 맞춤 온라인 홍보 SaaS',
      sourceTurns: [2],
    };
    prior.dimensions.customerChange = {
      ...prior.dimensions.customerChange,
      status: 'needs_check',
      summary: '',
    };

    const after = applyAnswerToJudgment({
      prior,
      answer: CUSTOMER_CHANGE_ANSWER,
      targetGap: 'validationTestability',
      issueId: 'market_validation',
      sourceTurnIndex: 3,
    });

    expect(after.dimensions.customerChange.status).toBe('clear');
    expect(after.dimensions.customerChange.summary).toMatch(/홍보|SNS|줄/);
    expect(pickNextCheckDimension(after)).toBeNull();
  });

  it('buildCeoJudgmentState applies validationTestability supplement to customerChange', () => {
    const understanding = buildBusinessUnderstanding(CEO_DOC);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '소규모 양조장(영세 양조장) 운영자입니다.',
        appliedAt: '2026-01-01T00:00:01.000Z',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '양조장은 온라인 홍보 방법과 인력이 부족해 홍보가 어렵습니다.',
        appliedAt: '2026-01-01T00:00:02.000Z',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'problem_definition',
        answer: '영세 양조장을 위한 온라인 홍보·마케팅 SaaS를 제공합니다.',
        appliedAt: '2026-01-01T00:00:02.500Z',
        targetGap: 'solution',
      },
      {
        issueId: 'market_validation',
        answer: CUSTOMER_CHANGE_ANSWER,
        appliedAt: '2026-01-01T00:00:03.000Z',
        targetGap: 'validationTestability',
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 'p0-2c-handoff',
      documentText: CEO_DOC,
      turns,
      entities: null,
      previous: null,
    });
    const living = buildLivingUnderstandingState({
      documentText: CEO_DOC,
      understanding,
      turns,
      memory,
    });
    const judgment = buildCeoJudgmentState({ living, turns });

    expect(judgment.dimensions.customer.summary).toMatch(/소규모\s*양조장/);
    expect(judgment.dimensions.customerChange.status).toBe('clear');
    expect(judgment.dimensions.customerChange.summary).toMatch(/홍보|SNS|줄/);
  });

  it('shouldHandoffToFinalReview requires customerChange clear and living not blocked', () => {
    let judgment = emptyCeoJudgmentState(3);
    judgment.dimensions.customer = {
      ...judgment.dimensions.customer,
      status: 'clear',
      summary: '소규모 양조장',
    };
    judgment.dimensions.problem = {
      ...judgment.dimensions.problem,
      status: 'clear',
      summary: '홍보 인력 부족',
    };
    judgment.dimensions.solution = {
      ...judgment.dimensions.solution,
      status: 'needs_check',
      summary: '온라인 홍보 SaaS',
    };
    judgment.dimensions.customerChange = {
      ...judgment.dimensions.customerChange,
      status: 'clear',
      summary: CUSTOMER_CHANGE_ANSWER,
    };

    const understanding = buildBusinessUnderstanding(CEO_DOC);
    const livingBlocked = buildLivingUnderstandingState({
      documentText: CEO_DOC,
      understanding,
      turns: [],
      memory: buildConversationMemoryFromSources({
        projectId: 'p0-2c-handoff-blocked',
        documentText: CEO_DOC,
        turns: [],
        entities: null,
      }),
    });
    expect(shouldHandoffToFinalReview({ living: livingBlocked, judgment })).toBe(false);
  });
});
