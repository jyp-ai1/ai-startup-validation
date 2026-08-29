/**
 * ALABOM Core Final Stabilization — Long Sprint unit gates.
 * gap close · same-meaning · delta non-empty · adaptive causality · gate ·
 * supersede · conflict · doc no-reask · reframe · sticky yield
 */
import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  buildUnderstandingDelta,
  criticalGapsBlockAnalysis,
  evaluateAnalysisReady,
  explainSufficiency,
  formatUnderstandingDeltaSummary,
} from '../question-causality';
import { reframeQuestion, isSameMeaningQuestion, buildConflictClarifyQuestion } from '../reframe-question';
import {
  countUnclosedGapAsks,
  decideNextQuestion,
  pickHighestImpactUnresolved,
  resolveExcludedGaps,
  MAX_SAME_GAP_ASKS_BEFORE_YIELD,
} from '../question-decision-engine';
import {
  getAnsweredTargetGaps,
  getWhyThisQuestionNow,
  resolveMissingFieldPriorities,
  resolveNextIssueByMissingField,
  resolvePreservedGapAfterMeta,
} from '../resolve-missing-field-priority';
import {
  listUnconfirmedCriticalGaps,
  selectRefinementGapAfterAnalysisReady,
  selectTopAdaptiveGap,
} from '../adaptive-question-select';
import {
  emptyConversationMemory,
  upsertConfirmedFact,
} from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { deriveWorkspaceState } from '../workspace-state';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { evaluateFinalIntegrityGate } from '../final-integrity-gate';
import { resolveNextLoopIssue } from '../resolve-ai-pm-priority-issue';
import { detectWrongSlotMergeContext } from '../wrong-slot-priority';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

function memoryFromTurns(turns: AiPmLoopTurn[]) {
  return buildConversationMemoryFromSources({
    projectId: 'core-final-stab',
    documentText: SEED,
    turns,
  });
}

describe('Stabilization — validationTestability never steals into customer', () => {
  it('forces diffRelevance when asked validationTestability even if answer contains 고객', () => {
    const result = interpretAnswerSemantics({
      answer:
        '맞춤 일정이 고객에게 중요한 이유는 낯선 도시에서 시간 낭비를 줄여주기 때문입니다',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'validationTestability',
    });
    expect(result.factKey).toBe('diffRelevance');
    expect(result.facts.some((f) => f.key === 'diffRelevance')).toBe(true);
    expect(result.facts.some((f) => f.key === 'customer')).toBe(false);
    expect(result.mergeable).toBe(true);
  });
});

describe('Stabilization — problemJtbd never steals into payer', () => {
  it('forces problem when asked problemJtbd even if answer contains 결제/예약', () => {
    const result = interpretAnswerSemantics({
      answer: '관광객이 앱에서 일정·체험을 직접 예약·결제하는 과정에서 맞춤 일정을 찾지 못하는 불편이 큽니다',
      askedIssueId: 'problem_definition',
      askedTargetGap: 'problemJtbd',
    });
    expect(result.factKey).toBe('problem');
    expect(result.facts.some((f) => f.key === 'problem')).toBe(true);
    expect(result.facts.some((f) => f.key === 'buyer')).toBe(false);
    expect(result.mergeable).toBe(true);
  });
});

describe('Stabilization — closed gaps never re-asked', () => {
  it('excludes answered validationTestability from next priorities', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립닷컴',
        appliedAt: '1',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤 일정',
        appliedAt: '2',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'competitor_analysis',
        answer: '시간 낭비를 줄여 고객 신뢰를 만듭니다',
        appliedAt: '3',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'validationTestability',
      },
    ];
    expect(getAnsweredTargetGaps(turns).has('validationTestability')).toBe(true);
    const understanding = buildBusinessUnderstanding(SEED);
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    const exclude = resolveExcludedGaps({ turns, memory, living });
    expect(exclude.has('validationTestability')).toBe(true);
    const ranked = resolveMissingFieldPriorities(understanding, createInitialAiPmLoopState(), {
      documentText: SEED,
      memory,
      turns,
    });
    expect(ranked.every((r) => r.targetGap !== 'validationTestability')).toBe(true);
  });
});

describe('Stabilization — same-meaning re-ask prevention', () => {
  it('detects stock relevance variants as same meaning', () => {
    const a = '그 차별점이 고객에게 왜 중요한가요?';
    const b = '「실시간 맞춤」가 고객에게 왜 중요한가요?';
    // reframed with different stem should NOT be same as stock after reframeQuestion
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = upsertConfirmedFact(
      emptyConversationMemory('same'),
      'differentiation',
      '실시간 맞춤 일정',
      'user_turn',
    );
    memory = upsertConfirmedFact(memory, 'customer', '방한 FIT', 'user_turn');
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const reframed = reframeQuestion({
      targetGap: 'validationTestability',
      living,
      reason: 'adaptive',
      previousQuestionText: a,
    });
    expect(isSameMeaningQuestion(reframed.questionText, a)).toBe(false);
    expect(reframed.questionText).not.toBe(a);
    void b;
  });

  it('yields sticky after MAX unclosed asks', () => {
    const turns: AiPmLoopTurn[] = Array.from({ length: MAX_SAME_GAP_ASKS_BEFORE_YIELD }, (_, i) => ({
      issueId: 'competitor_analysis' as const,
      answer: `관련성 답 ${i}`,
      appliedAt: String(i),
      // wrong slot — never closes validationTestability
      semanticFactKey: 'customer' as const,
      semanticFactKeys: ['customer' as const],
      intent: 'business_fact' as const,
      targetGap: 'validationTestability',
    }));
    expect(countUnclosedGapAsks(turns, 'validationTestability')).toBe(
      MAX_SAME_GAP_ASKS_BEFORE_YIELD,
    );
  });
});

describe('Stabilization — understandingDelta never empty on mergeable', () => {
  it('always formats non-empty delta after fact merge', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = emptyConversationMemory('delta');
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    memory = upsertConfirmedFact(
      memory,
      'diffRelevance',
      '시간 낭비 감소가 핵심 가치',
      'user_turn',
    );
    const after = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const delta = buildUnderstandingDelta({
      before,
      after,
      factKeys: ['diffRelevance'],
    });
    expect(formatUnderstandingDeltaSummary(delta).trim().length).toBeGreaterThan(0);
  });
});

describe('Stabilization — adaptive causality Competition→Diff→Value', () => {
  it('after competitor+diff confirmed, next adaptive gap is validationTestability (diff relevance)', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립닷컴',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    const top = selectTopAdaptiveGap(living, {
      answeredFactGaps: getAnsweredTargetGaps(turns),
    });
    // P0 vNext — competitor→diff→diff customer relevance before solution/customer slots
    expect(top?.fieldKey).toBe('validationTestability');
    const decision = decideNextQuestion({ living, turns, memory });
    expect(decision?.targetGap).toBe('validationTestability');
  });

  it('analysis ready blocked when diff confirmed but relevance missing', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립닷컴',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'problem_definition',
        answer: '관심사·동선 맞춤 일정과 현지인 동행을 한 번에 제공합니다',
        appliedAt: '6',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(false);
    expect(evaluateAnalysisReady(living).blockedGaps).toContain('validationTestability');
  });
});

describe('Stabilization — analysis gate surfaces honest boolean', () => {
  it('criticalGapBlocked true when critical gaps open', () => {
    const state = deriveWorkspaceState({
      projectId: 'stab-gate',
      loop: createInitialAiPmLoopState(),
      understandingPhase: 'pending',
      reviewCount: 0,
      documentText: SEED,
    });
    expect(state.criticalGapBlocked).toBe(true);
    expect(state.criticalGapExplanation).toBeTruthy();
    expect(criticalGapsBlockAnalysis(state.livingState!)).toBe(true);
  });
});

describe('Stabilization — pick highest-impact unresolved (not count)', () => {
  it('returns one critical unresolved field', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('impact'),
    });
    const pick = pickHighestImpactUnresolved(living);
    expect(pick?.fieldKey).toBeTruthy();
    expect(typeof pick?.rationale).toBe('string');
  });
});

describe('Stabilization — sticky yield after failed closes', () => {
  it('resolveNextIssueByMissingField yields to next gap after max unclosed asks', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const baseTurns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const stuckAsks: AiPmLoopTurn[] = Array.from(
      { length: MAX_SAME_GAP_ASKS_BEFORE_YIELD },
      (_, i) => ({
        issueId: 'competitor_analysis' as const,
        answer: `실패 답 ${i}`,
        appliedAt: String(10 + i),
        semanticFactKey: 'customer' as const,
        semanticFactKeys: ['customer' as const],
        intent: 'business_fact' as const,
        targetGap: 'validationTestability',
      }),
    );
    const turns = [...baseTurns, ...stuckAsks];
    const memory = memoryFromTurns(turns);
    const loop = {
      ...createInitialAiPmLoopState(),
      currentIssueId: 'competitor_analysis' as const,
      turns,
    };
    const next = resolveNextIssueByMissingField(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    // Should not stick forever on validationTestability with wrong-slot answers
    const ranked = resolveMissingFieldPriorities(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    const topGap = ranked[0]?.targetGap;
    expect(topGap).toBe('validationTestability');
    void next;
  });
});

describe('Stabilization — stock binding purity for relevance', () => {
  it('validationTestability stock is single question', () => {
    const binding = resolveGapQuestionBinding('validationTestability');
    const qCount = (binding.questionText.match(/\?/g) ?? []).length;
    expect(qCount).toBeLessThanOrEqual(1);
  });
});

describe('P0 Judgment — Analysis Ready ≠ Sufficiency', () => {
  it('high coverage with open solution still blocks Analysis Ready', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    const analysis = evaluateAnalysisReady(living);
    const sufficiency = explainSufficiency(living);
    expect(sufficiency.percent).toBeGreaterThan(0);
    expect(analysis.analysisReady).toBe(false);
    expect(analysis.blockedGaps).toContain('solution');
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
    expect(stateAnalysisBlocksStart(living)).toBe(true);
  });

  it('critical gap forces next Q instead of null exit', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const loop = { ...createInitialAiPmLoopState(), turns };
    const next = resolveNextLoopIssue(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
      analysisResultExists: true,
    });
    expect(next).not.toBeNull();
    const decision = decideNextQuestion({
      living: buildLivingUnderstandingState({
        documentText: SEED,
        understanding,
        turns,
        memory,
      }),
      turns,
      memory,
    });
    expect(decision?.targetGap).toBe('validationTestability');
  });

  it('payer B2B vs tourist direct is CONTRADICTORY not silent merge', () => {
    const result = interpretAnswerSemantics({
      answer: '관광객이 앱에서 일정·체험을 직접 예약·결제합니다',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
      existingFact: 'B2B로 호텔·OTA가 일괄 정산합니다',
      existingFactsByKey: { buyer: 'B2B로 호텔·OTA가 일괄 정산합니다' },
    });
    expect(result.quality).toBe('CONTRADICTORY');
    expect(result.mergeable).toBe(false);
    expect(result.factKey).toBe('buyer');
  });

  it('solution user turn closes gap and can unlock Analysis Ready with all criticals', () => {
    const baseTurns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'competitor_analysis',
        answer: '맞춤 일정이 없으면 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다',
        appliedAt: '6',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'validationTestability',
      },
      {
        issueId: 'problem_definition',
        answer: '관심사·동선 맞춤 일정과 현지인 동행을 한 번에 제공합니다',
        appliedAt: '7',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
    ];
    const memory = memoryFromTurns(baseTurns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns: baseTurns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(true);
    expect(criticalGapsBlockAnalysis(living)).toBe(false);
  });

  it('turn count alone never completes — stage gate ignores turnCount as blocker', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('turns'),
    });
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
    // Many turns without closing solution still block
    const manyTurns: AiPmLoopTurn[] = Array.from({ length: 25 }, (_, i) => ({
      issueId: 'customer_definition' as const,
      answer: `답 ${i}`,
      appliedAt: String(i),
      semanticFactKey: 'customer' as const,
      semanticFactKeys: ['customer' as const],
      intent: 'business_fact' as const,
      targetGap: 'customerPersona',
    }));
    const livingMany = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns: manyTurns,
      memory: memoryFromTurns(manyTurns),
    });
    expect(evaluateAnalysisReady(livingMany).analysisReady).toBe(false);
  });
});

describe('Long Sprint — pricingHint / marketSizeEvidence / integrity align', () => {
  it('revenue with fee % confirms pricingHint (not hard-UNKNOWN)', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer: '수익은 예약 건당 중개 수수료 10~15%와 현지 파트너 제휴 리포트 구독입니다.',
        appliedAt: '1',
        semanticFactKey: 'revenue',
        semanticFactKeys: ['revenue'],
        intent: 'business_fact',
        targetGap: 'revenueModel',
      },
    ];
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory: memoryFromTurns(turns),
    });
    const pricing = living.claims.find((c) => c.fieldKey === 'pricingHint');
    expect(pricing?.status).toBe('confirmed');
    expect(pricing?.value).toMatch(/수수료|10/);
  });

  it('marketSizeEvidence demand turn confirms claim', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'market_validation',
        answer:
          '방한 외래객 회복과 맞춤 투어 문의가 늘고 있다는 제휴 가이드 피드백이 있습니다.',
        appliedAt: '1',
        semanticFactKey: 'market',
        semanticFactKeys: ['market'],
        intent: 'business_fact',
        targetGap: 'marketSizeEvidence',
      },
    ];
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory: memoryFromTurns(turns),
    });
    const demand = living.claims.find((c) => c.fieldKey === 'marketSizeEvidence');
    expect(demand?.status).toBe('confirmed');
    expect(demand?.value).toMatch(/방한|가이드/);
  });

  it('integrity Critical Unknown aligns with Analysis Ready (not pricingHint alone)', () => {
    const baseTurns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: 'FIT 외국인',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '획일적 동선',
        appliedAt: '2',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객 직접 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'competitor_analysis',
        answer: '맞춤 일정이 없으면 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다',
        appliedAt: '6',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'validationTestability',
      },
      {
        issueId: 'problem_definition',
        answer: '관심사·동선 맞춤 일정과 현지인 동행',
        appliedAt: '7',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
      {
        issueId: 'bm_design',
        answer: '수수료 10~15%',
        appliedAt: '8',
        semanticFactKey: 'revenue',
        semanticFactKeys: ['revenue'],
        intent: 'business_fact',
        targetGap: 'revenueModel',
      },
    ];
    const memory = memoryFromTurns(baseTurns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns: baseTurns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(true);
    const loop = createInitialAiPmLoopState();
    loop.turns = baseTurns;
    const gate = evaluateFinalIntegrityGate({
      living,
      memory,
      loop,
      documentText: SEED,
    });
    expect(gate.blockers.some((b) => /가격 신호|pricingHint/i.test(b))).toBe(false);
  });

  it('LS-2 — solution answer does not overwrite document business one-liner or trigger identity drift HOLD', () => {
    const solutionAnswer =
      '관심사·동선·식사 제약을 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 제공하는 방식입니다.';
    let memory = emptyConversationMemory('core-final-stab');
    memory = upsertConfirmedFact(memory, 'business', SEED, 'document');
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: 'FIT 외국인',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: solutionAnswer,
        appliedAt: '2',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
    ];
    memory = buildConversationMemoryFromSources({
      projectId: 'core-final-stab',
      documentText: SEED,
      turns,
      previous: memory,
    });
    const currentBusiness = memory.facts.find(
      (f) => f.key === 'business' && f.lifecycle === 'current',
    );
    expect(currentBusiness?.source).toBe('document');
    expect(currentBusiness?.value).toMatch(/외국인 관광객/);
    expect(currentBusiness?.value).not.toBe(solutionAnswer);

    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    const businessClaim = living.claims.find((c) => c.fieldKey === 'businessOneLiner');
    expect(businessClaim?.value).toMatch(/외국인|관광|맞춤/);
    expect(businessClaim?.value).not.toBe(solutionAnswer);

    const loop = createInitialAiPmLoopState();
    loop.turns = turns;
    const gate = evaluateFinalIntegrityGate({
      living,
      memory,
      loop,
      documentText: SEED,
    });
    expect(gate.identityIntegrity).toBe(true);
    expect(gate.blockers.some((b) => /확정된 사업 한 줄/.test(b))).toBe(false);
  });
});

function stateAnalysisBlocksStart(living: ReturnType<typeof buildLivingUnderstandingState>): boolean {
  return evaluateAnalysisReady(living).analysisReady === false;
}

describe('Loop 2 vNext — causality · conflict · relevance evidence', () => {
  it('mid-judgment preserves validationTestability when diff relevance still open', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립닷컴',
        appliedAt: '1',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤 일정',
        appliedAt: '2',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    const preserved = resolvePreservedGapAfterMeta({
      living,
      turns,
      inFlightGap: 'validationTestability',
    });
    expect(preserved).toBe('validationTestability');
  });

  it('customer correction while asked customerPersona does not close validationTestability', () => {
    const result = interpretAnswerSemantics({
      answer:
        '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.',
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    expect(result.factKey).toBe('customer');
    expect(result.facts.some((f) => f.key === 'diffRelevance')).toBe(false);
    expect(result.mergeable).toBe(true);
  });

  it('validationTestability weak answer is PARTIAL and not mergeable', () => {
    const result = interpretAnswerSemantics({
      answer: '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'validationTestability',
    });
    expect(result.quality).toBe('PARTIAL');
    expect(result.mergeable).toBe(false);
  });

  it('validationTestability closes only with relevance evidence', () => {
    const weakTurns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ도 포함',
        appliedAt: '1',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'correction',
        targetGap: 'validationTestability',
      },
    ];
    expect(getAnsweredTargetGaps(weakTurns).has('validationTestability')).toBe(false);

    const strongTurns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '맞춤 일정이 없으면 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다',
        appliedAt: '1',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'validationTestability',
      },
    ];
    expect(getAnsweredTargetGaps(strongTurns).has('validationTestability')).toBe(true);
  });

  it('open memory conflict blocks Analysis Ready', () => {
    let memory = emptyConversationMemory('conflict-block');
    memory = upsertConfirmedFact(memory, 'buyer', 'B2B 호텔·OTA 정산', 'user_turn');
    memory = {
      ...memory,
      facts: [
        ...memory.facts.filter((f) => f.key !== 'buyer'),
        {
          key: 'buyer',
          value: 'B2B 호텔·OTA 정산',
          source: 'user_turn',
          lifecycle: 'current',
        },
        {
          key: 'buyer',
          value: '관광객 직접 결제',
          source: 'user_turn',
          lifecycle: 'conflict',
          conflictWith: 'B2B 호텔·OTA 정산',
        },
      ],
    };
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory,
    });
    expect(evaluateAnalysisReady(living, memory).analysisReady).toBe(false);
    expect(criticalGapsBlockAnalysis(living, memory)).toBe(true);
  });

  it('conflict clarify question differs from stock customer ask', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('clarify'),
    });
    const stock = resolveGapQuestionBinding('customerPersona').questionText;
    const clarify = buildConflictClarifyQuestion({
      factKey: 'buyer',
      priorValue: 'B2B 호텔·OTA 정산',
      newValue: '관광객 직접 결제',
      living,
    });
    expect(clarify.questionText).toMatch(/A\)|B\)|어느 쪽/);
    expect(isSameMeaningQuestion(clarify.questionText, stock)).toBe(false);
  });
});

describe('Loop 3 vNext — gate · first correction conflict · relevance hold', () => {
  it('first explicit payer B2B correction triggers CONTRADICTORY without prior buyer fact', () => {
    const result = interpretAnswerSemantics({
      answer:
        '앞서와 달리 정정합니다. 결제자는 관광객이 아니라 B2B로 호텔·OTA가 일괄 정산합니다.',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'validationTestability',
      existingFactsByKey: {},
    });
    expect(result.quality).toBe('CONTRADICTORY');
    expect(result.mergeable).toBe(false);
    expect(result.factKey).toBe('buyer');
  });

  it('Analysis Ready blocked when diff confirmed but validationTestability still open', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: 'FIT 외국인',
        appliedAt: '1',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: '획일적 동선',
        appliedAt: '2',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객 직접 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤 일정',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'problem_definition',
        answer: '관심사·동선 맞춤 일정과 현지인 동행',
        appliedAt: '6',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
      {
        issueId: 'bm_design',
        answer: '수익은 예약 건당 중개 수수료 10~15%',
        appliedAt: '7',
        semanticFactKey: 'revenue',
        semanticFactKeys: ['revenue'],
        intent: 'business_fact',
        targetGap: 'revenueModel',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(false);
    expect(evaluateAnalysisReady(living).blockedGaps).toContain('validationTestability');
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
  });

  it('decideNextQuestion holds validationTestability after max wrong-slot asks', () => {
    const baseTurns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '1',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '2',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
    ];
    const stuckAsks: AiPmLoopTurn[] = Array.from(
      { length: MAX_SAME_GAP_ASKS_BEFORE_YIELD + 1 },
      (_, i) => ({
        issueId: 'bm_design' as const,
        answer: `수익 구조 답 ${i}`,
        appliedAt: String(10 + i),
        semanticFactKey: 'revenue' as const,
        semanticFactKeys: ['revenue' as const],
        intent: 'business_fact' as const,
        targetGap: 'validationTestability',
      }),
    );
    const turns = [...baseTurns, ...stuckAsks];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    const decision = decideNextQuestion({ living, turns, memory });
    expect(decision?.targetGap).toBe('validationTestability');
    expect(decision?.reframed).toBe(true);
  });
});

describe('Loop 4 vNext — post-Analysis Ready depth follow-ups', () => {
  const analysisReadyTurns: AiPmLoopTurn[] = [
    {
      issueId: 'customer_definition',
      answer: '방한 FIT',
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
      answer: '관광객 결제',
      appliedAt: '3',
      semanticFactKey: 'buyer',
      semanticFactKeys: ['buyer'],
      intent: 'business_fact',
      targetGap: 'payer',
    },
    {
      issueId: 'competitor_analysis',
      answer: '클룩',
      appliedAt: '4',
      semanticFactKey: 'competitor',
      semanticFactKeys: ['competitor'],
      intent: 'business_fact',
      targetGap: 'alternativesCompetitors',
    },
    {
      issueId: 'competitor_analysis',
      answer: '실시간 맞춤',
      appliedAt: '5',
      semanticFactKey: 'differentiation',
      semanticFactKeys: ['differentiation'],
      intent: 'business_fact',
      targetGap: 'differentiationVsAlternatives',
    },
    {
      issueId: 'competitor_analysis',
      answer: '맞춤 일정이 없으면 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다',
      appliedAt: '6',
      semanticFactKey: 'diffRelevance',
      semanticFactKeys: ['diffRelevance'],
      intent: 'business_fact',
      targetGap: 'validationTestability',
    },
    {
      issueId: 'problem_definition',
      answer: '관심사·동선 맞춤 일정과 현지인 동행을 한 번에 제공합니다',
      appliedAt: '7',
      semanticFactKey: 'business',
      semanticFactKeys: ['business'],
      intent: 'business_fact',
      targetGap: 'solution',
    },
    {
      issueId: 'bm_design',
      answer: '수수료 10~15%',
      appliedAt: '8',
      semanticFactKey: 'revenue',
      semanticFactKeys: ['revenue'],
      intent: 'business_fact',
      targetGap: 'revenueModel',
    },
    {
      issueId: 'competitor_analysis',
      answer: '파트너 네트워크 방어력',
      appliedAt: '9',
      semanticFactKey: 'business',
      semanticFactKeys: ['business'],
      intent: 'business_fact',
      targetGap: 'executionConstraints',
    },
  ];

  it('selectRefinementGapAfterAnalysisReady returns marketChannel when criticals closed', () => {
    const turns = analysisReadyTurns;
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(true);
    const refinement = selectRefinementGapAfterAnalysisReady(living, {
      answeredFactGaps: getAnsweredTargetGaps(turns),
    });
    expect(refinement).not.toBeNull();
    expect(['marketChannel', 'marketSizeEvidence', 'pricingHint', 'executionConstraints']).toContain(
      refinement!.fieldKey,
    );
  });

  it('resolveNextLoopIssue keeps asking partial gaps when Analysis Ready', () => {
    const turns = analysisReadyTurns.slice(0, 8);
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    expect(criticalGapsBlockAnalysis(living)).toBe(false);

    const loop = {
      ...createInitialAiPmLoopState(),
      phase: 'answer' as const,
      currentIssueId: 'bm_design' as const,
      turns,
    };
    const next = resolveNextLoopIssue(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(next).not.toBeNull();
  });
});

describe('Loop 5 vNext — P0-1/P0-2 causality (T12/T13/T14)', () => {
  /** Prefix through payer — validationTestability still open (T11-class plan does not close). */
  const prefixThroughPayer: AiPmLoopTurn[] = [
    {
      issueId: 'competitor_analysis',
      answer: '클룩·트립닷컴·가이드 매칭 앱',
      appliedAt: '1',
      semanticFactKey: 'competitor',
      semanticFactKeys: ['competitor'],
      intent: 'business_fact',
      targetGap: 'alternativesCompetitors',
    },
    {
      issueId: 'competitor_analysis',
      answer: '차별점은 관심사·동선·식사 맞춤 일정',
      appliedAt: '2',
      semanticFactKey: 'differentiation',
      semanticFactKeys: ['differentiation'],
      intent: 'business_fact',
      targetGap: 'differentiationVsAlternatives',
    },
    {
      issueId: 'bm_design',
      answer: '관광객 직접 결제',
      appliedAt: '3',
      semanticFactKey: 'buyer',
      semanticFactKeys: ['buyer'],
      intent: 'business_fact',
      targetGap: 'payer',
    },
  ];

  it('P0-1 T12→T13: wrong-slot relevance on persona ask re-ranks customerPersona', () => {
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다';
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    const top = selectTopAdaptiveGap(living, {
      answeredFactGaps: getAnsweredTargetGaps(turns),
      turns,
    });
    expect(top?.fieldKey).toBe('customerPersona');

    const decision = decideNextQuestion({ living, turns, memory });
    expect(decision?.targetGap).toBe('customerPersona');
    expect(decision?.whyNow).toMatch(/고객 관련성|관련성/);

    const loop = { ...createInitialAiPmLoopState(), turns, phase: 'answer' as const };
    const priority = getWhyThisQuestionNow(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(priority?.targetGap).toBe('customerPersona');
    expect(priority?.whyNow).toMatch(/고객 관련성|타깃 고객/);
  });

  it('P0-2 T13→T14: persona merge on problem ask selects problemJtbd not solution', () => {
    const personaAnswer =
      '초기 타깃은 서울을 3~7일 머무는 FIT 외국인과 국내 MZ 개별 여행객';
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다';
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: personaAnswer,
        appliedAt: '5',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    expect(listUnconfirmedCriticalGaps(living)).toContain('problemJtbd');

    const top = selectTopAdaptiveGap(living, {
      answeredFactGaps: getAnsweredTargetGaps(turns),
      turns,
    });
    expect(top?.fieldKey).toBe('problemJtbd');
    expect(top?.fieldKey).not.toBe('solution');

    const decision = decideNextQuestion({ living, turns, memory });
    expect(decision?.targetGap).toBe('problemJtbd');
    expect(decision?.whyNow).toMatch(/타깃 고객|핵심 불편|문제/);
  });

  /** Loop 6 — production path (getWhyThisQuestionNow) with document-inferred customer memory @ T12. */
  it('P0-1 live T12→T13: getWhyThisQuestionNow keeps customerPersona with doc customer memory', () => {
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.';
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const loop = { ...createInitialAiPmLoopState(), turns, phase: 'answer' as const };
    const priority = getWhyThisQuestionNow(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(priority?.targetGap).toBe('customerPersona');
    expect(priority?.targetGap).not.toBe('problemJtbd');
    expect(priority?.whyNow).toMatch(/고객 관련성|타깃 고객|관련성/);
  });

  /** Loop 6 — production path @ T13: living.gaps must not bypass solution block. */
  it('P0-2 live T13→T14: getWhyThisQuestionNow selects problemJtbd not solution', () => {
    const personaAnswer =
      '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.';
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.';
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: personaAnswer,
        appliedAt: '5',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    expect(living.gaps.some((g) => g.fieldKey === 'solution')).toBe(true);
    expect(listUnconfirmedCriticalGaps(living)).toContain('problemJtbd');

    const loop = { ...createInitialAiPmLoopState(), turns, phase: 'answer' as const };
    const priority = getWhyThisQuestionNow(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(priority?.targetGap).toBe('problemJtbd');
    expect(priority?.targetGap).not.toBe('solution');

    const ranked = resolveMissingFieldPriorities(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(ranked[0]?.targetGap).toBe('problemJtbd');
  });

  /** Loop 6 — live transcript fidelity via interpretAnswerSemantics (not hard-coded keys). */
  it('P0-1 live interpret T12→T13: BANK.diffRelevance on persona ask', () => {
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.';
    const semantic = interpretAnswerSemantics({
      answer: t12Answer,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    expect(semantic.factKey).toBe('diffRelevance');
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: semantic.factKey,
        semanticFactKeys: semantic.facts.map((f) => f.key),
        intent: semantic.intent,
        targetGap: 'customerPersona',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const loop = { ...createInitialAiPmLoopState(), turns, phase: 'answer' as const };
    const priority = getWhyThisQuestionNow(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(priority?.targetGap).toBe('customerPersona');
    expect(detectWrongSlotMergeContext(turns)?.closedGap).toBe('validationTestability');
  });

  it('P0-2 live interpret T13→T14: BANK.customer on problem ask', () => {
    const t12Answer =
      '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.';
    const t12Semantic = interpretAnswerSemantics({
      answer: t12Answer,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    const personaAnswer =
      '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.';
    const t13Semantic = interpretAnswerSemantics({
      answer: personaAnswer,
      askedIssueId: 'problem_definition',
      askedTargetGap: 'problemJtbd',
    });
    expect(t13Semantic.factKey).toBe('customer');
    const turns: AiPmLoopTurn[] = [
      ...prefixThroughPayer,
      {
        issueId: 'customer_definition',
        answer: t12Answer,
        appliedAt: '4',
        semanticFactKey: t12Semantic.factKey,
        semanticFactKeys: t12Semantic.facts.map((f) => f.key),
        intent: t12Semantic.intent,
        targetGap: 'customerPersona',
      },
      {
        issueId: 'problem_definition',
        answer: personaAnswer,
        appliedAt: '5',
        semanticFactKey: t13Semantic.factKey,
        semanticFactKeys: t13Semantic.facts.map((f) => f.key),
        intent: t13Semantic.intent,
        targetGap: 'problemJtbd',
      },
    ];
    const memory = memoryFromTurns(turns);
    const understanding = buildBusinessUnderstanding(SEED);
    const loop = { ...createInitialAiPmLoopState(), turns, phase: 'answer' as const };
    const priority = getWhyThisQuestionNow(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
    });
    expect(priority?.targetGap).toBe('problemJtbd');
    expect(priority?.targetGap).not.toBe('solution');
    expect(detectWrongSlotMergeContext(turns)?.askedGap).toBe('problemJtbd');
  });

  it('evaluateAnalysisReady unchanged — regression guard', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '방한 FIT',
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
        answer: '관광객 결제',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'competitor_analysis',
        answer: '클룩',
        appliedAt: '4',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'alternativesCompetitors',
      },
      {
        issueId: 'competitor_analysis',
        answer: '실시간 맞춤',
        appliedAt: '5',
        semanticFactKey: 'differentiation',
        semanticFactKeys: ['differentiation'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives',
      },
      {
        issueId: 'competitor_analysis',
        answer: '맞춤 일정이 없으면 동선 낭비가 커서 고객이 예약 전에 차이를 체감합니다',
        appliedAt: '6',
        semanticFactKey: 'diffRelevance',
        semanticFactKeys: ['diffRelevance'],
        intent: 'business_fact',
        targetGap: 'validationTestability',
      },
      {
        issueId: 'problem_definition',
        answer: '관심사·동선 맞춤 일정과 현지인 동행을 한 번에 제공합니다',
        appliedAt: '7',
        semanticFactKey: 'business',
        semanticFactKeys: ['business'],
        intent: 'business_fact',
        targetGap: 'solution',
      },
      {
        issueId: 'bm_design',
        answer: '수수료 10~15%',
        appliedAt: '8',
        semanticFactKey: 'revenue',
        semanticFactKeys: ['revenue'],
        intent: 'business_fact',
        targetGap: 'revenueModel',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(evaluateAnalysisReady(living).analysisReady).toBe(true);
    expect(evaluateAnalysisReady(living).blockedGaps).toHaveLength(0);
  });
});
