/**
 * ALABOM Core v5 — Conversation Engine unit tests.
 * Causality · multi-fact · understandingDelta · critical-gap · gap priority · differentiation.
 */
import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  buildQuestionCausality,
  buildUnderstandingDelta,
  criticalGapsBlockAnalysis,
  countCriticalViabilityGaps,
} from '../question-causality';
import {
  getTopGapPriority,
  resolveMissingFieldPriorities,
} from '../resolve-missing-field-priority';
import {
  emptyConversationMemory,
  getFact,
  upsertConfirmedFact,
} from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { deriveWorkspaceState } from '../workspace-state';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { invalidateDownstreamTurns } from '../living-understanding-state';
import { AI_PM_LOOP_ISSUE_ORDER } from '../workspace-ai-pm-loop-types';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

function memoryFromTurns(turns: AiPmLoopTurn[]) {
  return buildConversationMemoryFromSources({
    projectId: 'v5',
    documentText: SEED,
    turns,
  });
}

describe('Core v5 re-ask / causality (Q2 from A1)', () => {
  it('builds causality so next ask follows prior understanding', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer: '정보 파편화로 맞춤 일정을 못 짠다',
        appliedAt: '1',
        semanticFactKey: 'problem',
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    const top = living.gaps[0];
    expect(top).toBeTruthy();
    const causality = buildQuestionCausality({
      living,
      targetGap: top!.fieldKey,
    });
    expect(causality.unresolvedGap).toBe(top!.fieldKey);
    expect(causality.whyNow.length).toBeGreaterThan(10);
    expect(causality.expectedInformation.length).toBeGreaterThan(2);
    expect(causality.previousUnderstanding.length).toBeGreaterThan(0);
  });
});

describe('Core v5 wrong-slot / multi-fact', () => {
  it('emits competitor + differentiation when both cues present', () => {
    const result = interpretAnswerSemantics({
      answer: '네이버 지도·트립어드바이저가 경쟁이고, 차별은 현지 재방문 큐레이션입니다',
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    expect(result.mergeable).toBe(true);
    const keys = result.facts.map((f) => f.key);
    expect(keys).toContain('competitor');
    expect(keys).toContain('differentiation');
    expect(keys).not.toContain('customer');
    expect(result.factKey).toBe('differentiation');
  });

  it('competitor-only cue → competitor fact (not differentiation)', () => {
    const result = interpretAnswerSemantics({
      answer: '비슷한 서비스로 네이버 지도와 트립어드바이저가 있습니다',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'alternativesCompetitors',
    });
    expect(result.factKey).toBe('competitor');
    expect(result.facts.some((f) => f.key === 'differentiation')).toBe(false);
  });
});

describe('Core v5 understandingDelta', () => {
  it('produces non-empty delta after mergeable answer', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = emptyConversationMemory('v5-delta');
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    memory = upsertConfirmedFact(memory, 'problem', '정보 파편화', 'user_turn');
    const after = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const delta = buildUnderstandingDelta({
      before,
      after,
      factKeys: ['problem'],
    });
    expect(delta.summary.trim().length).toBeGreaterThan(0);
    expect(
      delta.confirmed.length + delta.inferred.length + delta.superseded.length,
    ).toBeGreaterThan(0);
  });
});

describe('Core v5 critical-gap blocks analysis', () => {
  it('deriveReviewGate canStart false when differentiation unknown', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '외국인 관광객',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '맞춤 일정을 못 짠다',
        appliedAt: '2',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '네이버 지도와 트립어드바이저가 경쟁입니다',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
    ];
    const state = deriveWorkspaceState({
      projectId: 'v5-critical',
      loop: { ...createInitialAiPmLoopState(), turns },
      understandingPhase: 'review-ready',
      reviewCount: 0,
      documentText: SEED,
    });
    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('critical_gap');

    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
    expect(countCriticalViabilityGaps(living)).toBeGreaterThan(0);
  });
});

describe('Core v5 why/mid not facts', () => {
  it('why_meta and mid_judgment never mergeable', () => {
    const why = interpretAnswerSemantics({
      answer: '왜 그게 중요하죠?',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
    });
    expect(why.intent).toBe('why_meta');
    expect(why.mergeable).toBe(false);
    expect(why.factKey).toBeNull();

    const mid = interpretAnswerSemantics({
      answer: '지금까지 이해한 사업 정리해줘',
      askedIssueId: 'bm_design',
    });
    expect(mid.intent).toBe('mid_judgment');
    expect(mid.mergeable).toBe(false);
  });
});

describe('Core v5 edit supersede', () => {
  it('invalidates downstream turns after prior edit', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '관광객',
        appliedAt: '1',
        semanticFactKey: 'customer',
        intent: 'business_fact',
      },
      {
        issueId: 'problem_definition',
        answer: '일정 파편화',
        appliedAt: '2',
        semanticFactKey: 'problem',
        intent: 'business_fact',
      },
      {
        issueId: 'bm_design',
        answer: '앱 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        intent: 'business_fact',
      },
    ];
    const kept = invalidateDownstreamTurns(turns, 'customer_definition', AI_PM_LOOP_ISSUE_ORDER);
    expect(kept.map((t) => t.issueId)).toEqual(['customer_definition']);
  });
});

describe('Core v5 gap priority not spine', () => {
  it('after payer, does not force fixed form competition slot', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '외국인 관광객 중 자유여행객',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '정보 파편화로 맞춤 일정을 못 짠다',
        appliedAt: '2',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
    ];
    const memory = memoryFromTurns(turns);
    const loop = {
      ...createInitialAiPmLoopState(),
      turns,
      currentIssueId: 'bm_design' as const,
      phase: 'issue' as const,
    };
    const ranked = resolveMissingFieldPriorities(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(ranked.length).toBeGreaterThan(0);
    // Living ranking — not fixed spine order (must not always be competition next)
    const top = ranked[0]!;
    expect(top.targetGap).not.toBe('payer');
    expect(['alternativesCompetitors', 'differentiationVsAlternatives', 'revenueModel', 'marketChannel', 'marketSizeEvidence']).toContain(
      top.targetGap,
    );
  });
});

describe('Core v5 differentiation fact distinct from competitor', () => {
  it('gap bindings use distinct fact keys', () => {
    expect(resolveGapQuestionBinding('differentiationVsAlternatives').factKey).toBe(
      'differentiation',
    );
    expect(resolveGapQuestionBinding('validationTestability').factKey).toBe('diffRelevance');
    expect(resolveGapQuestionBinding('executionConstraints').factKey).toBe('defensibility');
    expect(resolveGapQuestionBinding('alternativesCompetitors').factKey).toBe('competitor');
  });

  it('competitor fact alone does NOT confirm differentiation claim', () => {
    let memory = emptyConversationMemory('v5-diff');
    memory = upsertConfirmedFact(memory, 'competitor', '네이버 지도', 'user_turn');
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory,
    });
    const diff = living.claims.find((c) => c.fieldKey === 'differentiationVsAlternatives');
    expect(diff?.status).toBe('unknown');
    const alt = living.claims.find((c) => c.fieldKey === 'alternativesCompetitors');
    expect(alt?.status).not.toBe('unknown');
  });

  it('differentiation fact confirms differentiationVsAlternatives', () => {
    let memory = emptyConversationMemory('v5-diff2');
    memory = upsertConfirmedFact(memory, 'competitor', '네이버 지도', 'user_turn');
    memory = upsertConfirmedFact(
      memory,
      'differentiation',
      '현지 재방문 큐레이션',
      'user_turn',
    );
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory,
    });
    const diff = living.claims.find((c) => c.fieldKey === 'differentiationVsAlternatives');
    expect(diff?.status).toBe('confirmed');
    expect(getFact(memory, 'differentiation')?.value).toMatch(/큐레이션/);
  });
});

describe('Core v5 competitor → differentiation sequence', () => {
  it('after competitor fact, top gap prefers differentiationVsAlternatives', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '외국인 관광객',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '맞춤 일정 불가',
        appliedAt: '2',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 결제합니다',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '네이버 지도와 트립어드바이저가 경쟁입니다',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
    ];
    const memory = memoryFromTurns(turns);
    const loop = {
      ...createInitialAiPmLoopState(),
      turns,
      phase: 'issue' as const,
      currentIssueId: 'competitor_analysis' as const,
    };
    const top = getTopGapPriority(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
      analysisResultExists: true,
    });
    expect(top?.targetGap).toBe('differentiationVsAlternatives');
  });
});
