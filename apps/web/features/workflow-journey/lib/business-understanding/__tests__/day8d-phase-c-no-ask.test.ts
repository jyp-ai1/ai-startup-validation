import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  evaluateNoAskPolicy,
  applyNoAskPolicy,
  scanSemanticKnowledgeForGap,
} from '../ai-pm-no-ask-policy';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { isNextQuestionDecision } from '../decide-next-question-from-review';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 전략 검토가 회의마다 리셋됨`;

function livingWithTurns(turns: AiPmLoopTurn[]) {
  const memory = buildConversationMemoryFromSources({
    projectId: 'day8d-c',
    documentText: DOC,
    turns,
  });
  return {
    living: buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
      turns,
      memory,
    }),
    memory,
    turns,
  };
}

function stageReadinessFor(gapState = createEmptyGapState()) {
  return evaluateStageReadiness({ gapState, turns: [] });
}

describe('DAY 8-D Phase C — No-Ask Policy', () => {
  beforeEach(() => {
    setAiPmNoAskPolicyV1ForTest(true);
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setAiPmNoAskPolicyV1ForTest(null);
    setV3ReviewPipelineForTest(null);
  });

  it('C1 — explicit customer knowledge triggers CONFIRM not raw re-ask', () => {
    const answer = '주 고객은 반찬가게와 꽃집 같은 직접 배송 소상공인입니다.';
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer,
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'customerPersona',
        intent: 'business_fact',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
      },
    ]);

    const hit = scanSemanticKnowledgeForGap({
      gapId: 'customerPersona',
      living,
      memory,
      turns,
    });
    expect(hit).not.toBeNull();
    expect(hit!.value).toMatch(/반찬/);

    const stockQ = resolveGapQuestionBinding('customerPersona').questionText;
    const verdict = evaluateNoAskPolicy({
      targetGapId: 'customerPersona',
      questionText: stockQ,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: stageReadinessFor(),
    });

    expect(verdict.action).toBe('CONFIRM');
    if (verdict.action === 'CONFIRM') {
      expect(verdict.confirmText).toMatch(/반찬/);
      expect(verdict.confirmText).toMatch(/맞나요/);
      expect(stockQ).not.toBe(verdict.confirmText);
    }
  });

  it('C2 — semantic repeat: different wording same domain triggers CONFIRM', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: '핵심 고객은 반찬가게입니다.',
        appliedAt: '1',
        targetGap: 'businessOneLiner',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
      },
    ]);

    const altQuestion = '어떤 고객을 대상으로 하나요?';
    const verdict = evaluateNoAskPolicy({
      targetGapId: 'customerPersona',
      questionText: altQuestion,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: stageReadinessFor(),
    });

    expect(verdict.action).toBe('CONFIRM');
  });

  it('C3 — same-cluster repeat with knowledge can MOVE to different gap', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'competitor_analysis',
        answer: '경쟁사는 A와 B입니다.',
        appliedAt: '1',
        targetGap: 'alternativesCompetitors',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
      },
    ]);

    const stockCompetitor = resolveGapQuestionBinding('alternativesCompetitors').questionText;
    const verdict = evaluateNoAskPolicy({
      targetGapId: 'alternativesCompetitors',
      questionText: stockCompetitor,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: stageReadinessFor(),
    });

    expect(['CONFIRM', 'MOVE']).toContain(verdict.action);
  });

  it('C4 — knowledge preservation across turns (customer + competitor)', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: '주 고객은 반찬가게입니다.',
        appliedAt: '1',
        targetGap: 'customerPersona',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
      },
      {
        issueId: 'competitor_analysis',
        answer: '경쟁사는 A, B입니다.',
        appliedAt: '2',
        targetGap: 'solution',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
      },
    ]);

    const customerHit = scanSemanticKnowledgeForGap({
      gapId: 'customerPersona',
      living,
      memory,
      turns,
    });
    const competitorHit = scanSemanticKnowledgeForGap({
      gapId: 'alternativesCompetitors',
      living,
      memory,
      turns,
    });

    expect(customerHit?.value).toMatch(/반찬/);
    expect(competitorHit?.value).toMatch(/A|경쟁/i);
  });

  it('C5 — payer never skipped from inference alone', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'bm_design',
        answer: '반찬가게 소상공인을 위한 SaaS입니다.',
        appliedAt: '1',
        targetGap: 'businessOneLiner',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
      },
    ]);

    const hit = scanSemanticKnowledgeForGap({
      gapId: 'payer',
      living,
      memory,
      turns,
    });
    expect(hit).toBeNull();

    const verdict = evaluateNoAskPolicy({
      targetGapId: 'payer',
      questionText: resolveGapQuestionBinding('payer').questionText,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: stageReadinessFor(),
    });
    expect(verdict.action).toBe('ASK');
  });

  it('C6 — MOVE produces meaningful next question not empty', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: '주 고객은 반찬가게입니다.',
        appliedAt: '1',
        targetGap: 'customerPersona',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
      },
    ]);

    const baseDecision = {
      targetGap: 'customerPersona',
      targetGapId: 'customerPersona',
      issueId: 'customer_definition' as const,
      questionText: resolveGapQuestionBinding('customerPersona').questionText,
      whyNow: 'test',
      rationale: 'test',
      score: 1000,
      reframed: false,
      excludedGaps: [],
      drivenByReview: true as const,
      sourceAnswerId: 't1',
      sourceReviewId: 'r1',
      reviewAction: 'advance' as const,
      action: 'advance' as const,
      actionRationale: 'test',
      reason: 'test',
    };

    const applied = applyNoAskPolicy({
      decision: baseDecision,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: stageReadinessFor(),
    });

    expect(applied.questionText.length).toBeGreaterThan(5);
    expect(applied.questionText).toMatch(/맞나요|불편|비용|경쟁|차별|제공/i);
  });

  it('C6b — resolveNextQuestionDecision applies no-ask on bootstrap customer repeat', () => {
    const { living, memory, turns } = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: '주 고객은 반찬가게입니다.',
        appliedAt: '1',
        targetGap: 'businessOneLiner',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        review: {
          reviewId: 'r1',
          turnId: 't1',
          sourceTurnId: 't1',
          createdAt: '2026-09-05T01:00:00.000Z',
          askedGapId: 'businessOneLiner',
          askedQuestionText: '한 줄로',
          askedIssueId: 'bm_design',
          userAnswer: '주 고객은 반찬가게입니다.',
          extractedFacts: [],
          known: [],
          unknown: [],
          unconfirmed: [],
          contradictions: [],
          gapVerdicts: {},
          recommendedAction: 'advance',
          rationale: 'test',
        },
      },
    ]);

    const decision = resolveNextQuestionDecision({
      living,
      turns,
      memory,
      gapState: createEmptyGapState(),
    });

    expect(decision).not.toBeNull();
    if (decision && isNextQuestionDecision(decision)) {
      const stockCustomer = resolveGapQuestionBinding('customerPersona').questionText;
      if (decision.targetGapId === 'customerPersona') {
        expect(decision.questionText).not.toBe(stockCustomer);
        expect(decision.questionText).toMatch(/맞나요|반찬/);
      }
    }
  });
});
