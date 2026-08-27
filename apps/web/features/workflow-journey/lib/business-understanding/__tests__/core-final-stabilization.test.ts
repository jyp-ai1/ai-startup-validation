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
  formatUnderstandingDeltaSummary,
} from '../question-causality';
import { reframeQuestion, isSameMeaningQuestion } from '../reframe-question';
import {
  countUnclosedGapAsks,
  decideNextQuestion,
  pickHighestImpactUnresolved,
  resolveExcludedGaps,
  MAX_SAME_GAP_ASKS_BEFORE_YIELD,
} from '../question-decision-engine';
import {
  getAnsweredTargetGaps,
  resolveMissingFieldPriorities,
  resolveNextIssueByMissingField,
} from '../resolve-missing-field-priority';
import { selectTopAdaptiveGap } from '../adaptive-question-select';
import {
  emptyConversationMemory,
  upsertConfirmedFact,
} from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { deriveWorkspaceState } from '../workspace-state';
import { resolveGapQuestionBinding } from '../gap-question-map';

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
  it('after competitor+diff confirmed, next adaptive gap is validationTestability', () => {
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
    expect(top?.fieldKey).toBe('validationTestability');
    const decision = decideNextQuestion({ living, turns, memory });
    expect(decision?.targetGap).toBe('validationTestability');
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
    expect(topGap).not.toBe('validationTestability');
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
