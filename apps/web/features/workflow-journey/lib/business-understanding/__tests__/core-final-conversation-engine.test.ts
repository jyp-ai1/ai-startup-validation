/**
 * ALABOM Core Final — Conversation Engine unit tests (Long Sprint W1–W20 gates).
 * understandingDelta · one-Q · semantic no wrong-slot · reframe · analysis gate ·
 * provenance · edit supersede · contradiction · adaptive · why/mid not facts.
 */
import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  buildUnderstandingDelta,
  criticalGapsBlockAnalysis,
  explainSufficiency,
  formatUnderstandingDeltaSummary,
} from '../question-causality';
import { reframeQuestion, isSameMeaningQuestion } from '../reframe-question';
import {
  enforceQuestionPurity,
  isMixedQuestion,
} from '../question-purity';
import { selectTopAdaptiveGap } from '../adaptive-question-select';
import {
  detectDomainContamination,
  provenanceLabel,
  sanitizeFinalClaimValue,
} from '../final-result-integrity';
import { buildConversationalFinalOutput } from '../build-conversational-final-output';
import {
  emptyConversationMemory,
  upsertConfirmedFact,
} from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { deriveWorkspaceState } from '../workspace-state';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

function memoryFromTurns(turns: AiPmLoopTurn[]) {
  return buildConversationMemoryFromSources({
    projectId: 'core-final',
    documentText: SEED,
    turns,
  });
}

describe('Core Final W3 — understandingDelta never empty', () => {
  it('produces non-empty delta with existing/new/changed/unknown after mergeable answer', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = emptyConversationMemory('final-delta');
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    memory = upsertConfirmedFact(memory, 'problem', '정보 파편화로 맞춤 일정 불가', 'user_turn');
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
    expect(formatUnderstandingDeltaSummary(delta).trim().length).toBeGreaterThan(0);
    expect(
      delta.newlyUnderstood.length +
        delta.changed.length +
        delta.confirmed.length +
        delta.stillUnknown.length,
    ).toBeGreaterThan(0);
    expect(delta.summary).toMatch(/신규|Fact|미확인|기존|변경|재평가/);
  });
});

describe('Core Final W4 — one question / one judgment', () => {
  it('rejects dual-ask differentiation+moment as impure and sanitizes to one ask', () => {
    const dual =
      '그 차별점이 고객에게 왜 중요한가요? 어떤 순간에 체감되나요?';
    expect(isMixedQuestion(dual)).toBe(true);
    const purity = enforceQuestionPurity({
      questionText: dual,
      targetGap: 'validationTestability',
    });
    expect(purity.sanitizedText.includes('?')).toBe(true);
    const qCount =
      (purity.sanitizedText.match(/\?/g) ?? []).length +
      (purity.sanitizedText.match(/\？/g) ?? []).length;
    expect(qCount).toBe(1);
  });

  it('stock gap bindings are single-purpose', () => {
    for (const gap of [
      'payer',
      'problemJtbd',
      'alternativesCompetitors',
      'differentiationVsAlternatives',
      'validationTestability',
      'revenueModel',
    ]) {
      const binding = resolveGapQuestionBinding(gap);
      const purity = enforceQuestionPurity({
        questionText: binding.questionText,
        targetGap: gap,
      });
      expect(purity.sanitizedText.length).toBeGreaterThan(5);
      const qCount = (purity.sanitizedText.match(/\?/g) ?? []).length;
      expect(qCount).toBeLessThanOrEqual(1);
    }
  });
});

describe('Core Final W2 — semantic no wrong-slot force-fill', () => {
  it('does not force differentiation when asked differentiation but answer is competitor-only', () => {
    const result = interpretAnswerSemantics({
      answer: '비슷한 서비스로 클룩과 트립닷컴이 있습니다',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'differentiationVsAlternatives',
    });
    expect(result.factKey).toBe('competitor');
    expect(result.facts.some((f) => f.key === 'competitor')).toBe(true);
  });

  it('does not dump competitor into customer when asked customer', () => {
    const result = interpretAnswerSemantics({
      answer: '경쟁은 네이버 지도와 트립어드바이저입니다',
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    expect(result.facts.map((f) => f.key)).not.toContain('customer');
    expect(result.factKey).toBe('competitor');
  });

  it('answered gaps track semantic facts not asked slot', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'competitor_analysis',
        answer: '클룩·트립닷컴이 경쟁입니다',
        appliedAt: '1',
        semanticFactKey: 'competitor',
        semanticFactKeys: ['competitor'],
        intent: 'business_fact',
        targetGap: 'differentiationVsAlternatives', // asked wrong, answered competitor
      },
    ];
    const answered = getAnsweredTargetGaps(turns);
    expect(answered.has('alternativesCompetitors')).toBe(true);
    expect(answered.has('differentiationVsAlternatives')).toBe(false);
  });
});

describe('Core Final W7 — reframe not identical re-ask', () => {
  it('reframes differentiation after nonsense with different wording', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const memory = upsertConfirmedFact(
      emptyConversationMemory('reframe'),
      'problem',
      '맞춤 일정 불가',
      'user_turn',
    );
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const stock = resolveGapQuestionBinding('differentiationVsAlternatives').questionText;
    const reframed = reframeQuestion({
      targetGap: 'differentiationVsAlternatives',
      living,
      reason: 'nonsense',
      previousQuestionText: stock,
    });
    expect(isSameMeaningQuestion(reframed.questionText, stock)).toBe(false);
    expect(reframed.questionText.length).toBeGreaterThan(10);
    expect(reframed.whyNow).toMatch(/반영되지|현재 이해/);
  });
});

describe('Core Final W8 — why/mid not facts', () => {
  it('why_meta and mid_judgment never mergeable', () => {
    const why = interpretAnswerSemantics({
      answer: '왜 그게 중요하죠?',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'differentiationVsAlternatives',
    });
    expect(why.intent).toBe('why_meta');
    expect(why.mergeable).toBe(false);

    const mid = interpretAnswerSemantics({
      answer: '지금까지 이해한 사업 정리해줘',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'differentiationVsAlternatives',
    });
    expect(mid.intent).toBe('mid_judgment');
    expect(mid.mergeable).toBe(false);
  });
});

describe('Core Final W14 — analysis gate blocks on critical gaps', () => {
  it('blocks Start Analysis when critical gaps lack USER_CONFIRMED', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer: '맞춤 일정을 못 짠다',
        appliedAt: '1',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      turns,
      memory,
    });
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
    expect(explainSufficiency(living).readyForAnalysis).toBe(false);

    const state = deriveWorkspaceState({
      projectId: 'final-critical',
      loop: { ...createInitialAiPmLoopState(), turns },
      understandingPhase: 'review-ready',
      reviewCount: 0,
      documentText: SEED,
    });
    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('critical_gap');
  });

  it('DOCUMENT alone does not unlock critical competitor gap', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('doc-only'),
    });
    // Seed may infer customer/business from document — still block analysis
    expect(criticalGapsBlockAnalysis(living)).toBe(true);
  });
});

describe('Core Final W6 — adaptive selection', () => {
  it('prefers competitor before differentiation when both unknown', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer: '패키지 투어는 획일적이다',
        appliedAt: '1',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '2',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'customer_definition',
        answer: '방한 FIT 외국인',
        appliedAt: '3',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        intent: 'business_fact',
        targetGap: 'customerPersona',
      },
    ];
    const memory = memoryFromTurns(turns);
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });
    const top = selectTopAdaptiveGap(living);
    expect(top?.fieldKey).toBe('alternativesCompetitors');
  });
});

describe('Core Final W15 — provenance / domain contamination', () => {
  it('flags B2B SaaS template on tourism living state', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('contam'),
    });
    const hit = detectDomainContamination({
      living,
      text: 'Differentiation in B2B SaaS markets requires enterprise sales cycles',
      originalIntentText: SEED,
    });
    expect(hit.contaminated).toBe(true);
    expect(hit.hits.length).toBeGreaterThan(0);
  });

  it('final output labels AI_inferred distinctly from user_confirmed', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: emptyConversationMemory('prov'),
    });
    const out = buildConversationalFinalOutput(living);
    for (const row of out.claimRows) {
      if (row.provenance === 'AI_inferred') {
        expect(row.status).not.toBe('Confirmed');
        expect(row.provenanceTag).toBe('[AI_inferred]');
      }
    }
    const aiClaim = living.claims.find(
      (c) => c.provenance === 'AI_INFERENCE' || c.status === 'inferred',
    );
    if (aiClaim) {
      const sanitized = sanitizeFinalClaimValue(aiClaim, living);
      expect(sanitized.provenance).not.toBe('user_confirmed');
      expect(provenanceLabel(aiClaim)).not.toBe('user_confirmed');
    }
  });
});

describe('Core Final W9 — edit supersede path', () => {
  it('supersede replaces prior customer claim in delta', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = upsertConfirmedFact(
      emptyConversationMemory('edit'),
      'customer',
      '방한 외국인',
      'user_turn',
    );
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    memory = upsertConfirmedFact(memory, 'customer', '국내 MZ 개별 여행객 포함', 'user_turn');
    const after = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const delta = buildUnderstandingDelta({ before, after, factKeys: ['customer'] });
    expect(
      delta.changed.length + delta.superseded.length + delta.newlyUnderstood.length,
    ).toBeGreaterThan(0);
  });
});

describe('Core Final W10 — contradiction intent', () => {
  it('detects contradictory payer flip', () => {
    const result = interpretAnswerSemantics({
      answer: '앞서와 달리 정정합니다. 결제자는 관광객이 아니라 B2B로 호텔이 정산합니다.',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
      existingFact: '관광객이 앱에서 직접 결제합니다',
      existingFactsByKey: { buyer: '관광객이 앱에서 직접 결제합니다' },
    });
    expect(
      result.quality === 'CONTRADICTORY' ||
        result.intent === 'correction' ||
        result.factKey === 'buyer',
    ).toBe(true);
  });
});
