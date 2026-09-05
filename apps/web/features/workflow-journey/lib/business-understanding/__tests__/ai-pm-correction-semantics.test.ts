import { describe, expect, it } from 'vitest';

import {
  extractCorrectedFactValue,
  isCustomerFieldCorrection,
  parseNotXButYCorrection,
} from '../ai-pm-correction-semantics';
import { classifyAiPmCeoIntent } from '../ai-pm-intent-policy';
import { buildAnswerReview } from '../build-answer-review';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import {
  buildCeoJudgmentSnapshot,
  buildCeoUnderstandingSnapshot,
} from '../ai-pm-judgment-presenter';
import { buildAiPmFocusedSnapshot } from '../ai-pm-focused-presenter';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인`;

const CORRECTION =
  '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.';

describe('ai-pm-correction-semantics (DAY 8-B P0)', () => {
  it('parses not-X-but-Y customer correction', () => {
    expect(parseNotXButYCorrection(CORRECTION)).toEqual({
      rejected: '꽃집',
      accepted: '반찬가게',
    });
  });

  it('detects customer field correction cues', () => {
    expect(isCustomerFieldCorrection(CORRECTION)).toBe(true);
    expect(classifyAiPmCeoIntent(CORRECTION, 'correction').intent).toBe('CORRECT');
  });

  it('routes CORRECT utterance to customer (not problem) when asked problemJtbd', () => {
    const semantic = interpretAnswerSemantics({
      answer: CORRECTION,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'problemJtbd',
      existingFactsByKey: {
        customer: '반찬가게·꽃집 등 직접 배송 소상공인',
      },
    });
    expect(semantic.intent).toBe('correction');
    expect(semantic.factKey).toBe('customer');
    expect(semantic.facts.some((f) => f.key === 'problem')).toBe(false);
    expect(semantic.value).toMatch(/반찬/);
    expect(semantic.value).not.toMatch(/꽃집/);
  });

  it('P0 correction acceptance — replaces customer claim and keeps raw text out of understanding', () => {
    setV3ReviewPipelineForTest(true);

    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer:
          '반찬가게와 꽃집에 배송하는 소상공인을 위한 주문·배송 관리 서비스입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        semanticFactKey: 'problem',
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
      {
        issueId: 'customer_definition',
        answer: CORRECTION,
        appliedAt: '2026-09-05T01:01:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'problemJtbd',
        intent: 'correction',
      },
    ];

    const memory = buildConversationMemoryFromSources({
      projectId: 'corr-p0',
      documentText: DOC,
      turns,
    });
    const customerFact = memory.facts.find(
      (f) => f.key === 'customer' && (f.lifecycle ?? 'current') === 'current',
    );
    expect(customerFact?.value).toMatch(/반찬/);
    expect(customerFact?.value).not.toMatch(/꽃집/);

    const problemFact = memory.facts.find(
      (f) => f.key === 'problem' && (f.lifecycle ?? 'current') === 'current',
    );
    expect(problemFact?.value).not.toMatch(/아니요|꽃집이 아니라/);

    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
      turns,
      memory,
    });
    const understanding = buildCeoUnderstandingSnapshot(living);
    expect(understanding).toMatch(/반찬/);
    expect(understanding).not.toMatch(/꽃집/);
    expect(understanding).not.toMatch(/아니요/);

    const snapshot = buildAiPmFocusedSnapshot({
      living,
      displayQuestionText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
    });
    expect(snapshot.businessUnderstanding).toMatch(/반찬/);
    expect(snapshot.businessUnderstanding).not.toMatch(/꽃집/);
    expect(snapshot.businessUnderstanding).not.toMatch(/아니요/);
    expect(buildCeoJudgmentSnapshot(living).length).toBeGreaterThan(5);
  });

  it('correction persists after next turn answer', () => {
    setV3ReviewPipelineForTest(true);

    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer:
          '반찬가게와 꽃집에 배송하는 소상공인을 위한 주문·배송 관리 서비스입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        semanticFactKey: 'problem',
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
      {
        issueId: 'customer_definition',
        answer: CORRECTION,
        appliedAt: '2026-09-05T01:01:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'problemJtbd',
        intent: 'correction',
      },
      {
        issueId: 'problem_definition',
        answer: '주문이 몰리면 배송 누락이 가장 큰 불편입니다.',
        appliedAt: '2026-09-05T01:02:00.000Z',
        semanticFactKey: 'problem',
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
    ];

    const memory = buildConversationMemoryFromSources({
      projectId: 'corr-next',
      documentText: DOC,
      turns,
    });
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
      turns,
      memory,
    });
    const understanding = buildCeoUnderstandingSnapshot(living);
    expect(understanding).toMatch(/반찬/);
    expect(understanding).not.toMatch(/꽃집/);
  });

  it('review artifact stores corrected value (not raw utterance) for customer', () => {
    setV3ReviewPipelineForTest(true);
    const { review } = buildAnswerReview({
      turnId: 't-corr',
      userAnswer: CORRECTION,
      askedGapId: 'problemJtbd',
      askedIssueId: 'problem_definition',
      existingFactsByKey: { customer: '꽃집' },
    });
    const customerExtract = review.extractedFacts.find((f) => f.key === 'customer');
    expect(customerExtract?.value).toMatch(/반찬/);
    expect(customerExtract?.value).not.toMatch(/아니요|꽃집이 아니라/);
    expect(customerExtract?.source).toBe('corrected');
  });

  it('extractCorrectedFactValue never returns raw correction for problem slot', () => {
    expect(extractCorrectedFactValue('problem', CORRECTION)).toBe('');
  });
});
