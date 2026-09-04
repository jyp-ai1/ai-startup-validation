import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { RecommendedAction } from '@repo/types/domain/answer-review';

import { buildAnswerReview } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  decideNextQuestionFromReview,
  isNextQuestionDecision,
} from '../decide-next-question-from-review';
import {
  evaluateStageReadiness,
  isStageAReady,
  isStageBGap,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '../evaluate-stage-readiness';
import { appendLoopTurnWithReview } from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { decideNextQuestion } from '../question-decision-engine';
import {
  createEmptyGapState,
  isGapAskable,
  updateGapStateFromReview,
  aggregateGapState,
} from '../update-gap-state-from-review';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import {
  isV3ReviewPipelineActive,
  setV3ReviewPipelineForTest,
} from '../v3-review-pipeline';
import {
  assertHydrateClosedPreserved,
  hydrateAiPmLoopState,
  mergeGapStateMonotonic,
  mergeTurnsPreservingReview,
} from '../hydrate-ai-pm-loop-state';
import {
  resolveRemountAskSurface,
  resolveRemountQuestionText,
  shouldSkipLiveRankOnRemount,
} from '../resolve-remount-ask-surface';
import {
  buildCeoSixSurfaces,
  isUserFacingSurfaceCopy,
  renderSurfaceFiveLines,
} from '../build-ceo-six-surfaces';
import type { NextQuestionDecision } from '../decide-next-question-from-review';
import type { AiPmLoopState } from '../workspace-ai-pm-loop-types';
import {
  resolveV3FallbackTargetGap,
  resolveV3NextIssueAfterProcessing,
  shouldBindDisplayFromPersistedDecision,
} from '../v3-legacy-bypass-guards';
import { getAnsweredTargetGaps, getWhyThisQuestionNow } from '../resolve-missing-field-priority';
import { resolveNextLoopIssue } from '../resolve-ai-pm-priority-issue';

const RECOMMENDED_ACTIONS: RecommendedAction[] = ['advance', 'probe', 'clarify', 'challenge'];

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
  return store;
}

function baseReviewInput(overrides: Partial<Parameters<typeof buildAnswerReview>[0]> = {}) {
  return {
    turnId: '2026-09-02T00:00:00.000Z',
    askedGapId: 'payer',
    askedQuestionText: '서비스 비용은 누가 지불하나요?',
    askedIssueId: 'bm_design' as const,
    userAnswer: '고객이 직접 내요.',
    displayedQuestionText: '서비스 비용은 누가 지불하나요?',
    ...overrides,
  };
}

describe('PR1 — buildAnswerReview (AC1–AC3)', () => {
  it('AC1: every review has unique reviewId', () => {
    const a = buildAnswerReview(baseReviewInput());
    const b = buildAnswerReview(baseReviewInput({ turnId: '2026-09-02T00:00:01.000Z' }));
    expect(a.review.reviewId).toBeTruthy();
    expect(b.review.reviewId).toBeTruthy();
    expect(a.review.reviewId).not.toBe(b.review.reviewId);
  });

  it('AC2: recommendedAction is action enum not free text', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    expect(RECOMMENDED_ACTIONS).toContain(review.recommendedAction);
    expect(typeof review.recommendedAction).toBe('string');
    expect(review.recommendedAction.length).toBeLessThan(20);
  });

  it('AC3: buildAnswerReview owns B18 payer canonicalization', () => {
    const { semantic, review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이요',
        askedGapId: 'payer',
        displayedQuestionText: '누가 비용을 지불합니까?',
      }),
    );
    expect(semantic.factKey).toBe('buyer');
    expect(review.gapVerdicts.payer?.completeness).toBe('CLOSED');
  });
});

describe('PR1 — V3 scenario partial pipeline (AC4–AC7)', () => {
  it('AC4 V3-01: payer CLOSED → recommendedAction advance', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 직접 내요.',
        askedGapId: 'payer',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      }),
    );
    expect(review.recommendedAction).toBe('advance');
    expect(review.gapVerdicts.payer?.completeness).toBe('CLOSED');
  });

  it('AC5 V3-02: PARTIAL → recommendedAction probe, same gap', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '사람들',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    expect(review.recommendedAction).toBe('probe');
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('PARTIAL');
    expect(review.askedGapId).toBe('customerPersona');
  });

  it('AC6 V3-03: ambiguous → recommendedAction clarify', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '음… 글쎄요',
        askedGapId: 'differentiationVsAlternatives',
        askedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
        displayedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
        askedIssueId: 'competitor_analysis',
      }),
    );
    expect(review.recommendedAction).toBe('clarify');
    expect(review.gapVerdicts.differentiationVsAlternatives?.completeness).toBe('OPEN');
  });

  it('AC7 V3-04: CONTRADICTED → recommendedAction challenge', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '회사에서 지불해요',
        askedGapId: 'payer',
        displayedQuestionText: '비용은 누가 지불하나요?',
        existingFactsByKey: { buyer: '고객' },
      }),
    );
    expect(review.recommendedAction).toBe('challenge');
    expect(review.gapVerdicts.payer?.completeness).toBe('CONTRADICTED');
    expect(review.contradictions.length).toBeGreaterThan(0);
  });
});

describe('PR1 — turn.review persistence (AC1, AC8)', () => {
  beforeEach(() => {
    stubSessionStorage();
    clearAiPmLoopState('pr1-test');
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('AC1: appendLoopTurnWithReview persists turn.review with matching turnId', () => {
    const turn: AiPmLoopTurn = {
      issueId: 'bm_design',
      answer: '고객이 직접 내요.',
      appliedAt: '2026-09-02T06:00:00.000Z',
      targetGap: 'payer',
    };

    appendLoopTurnWithReview(
      turn,
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: turn.answer,
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr1-test',
    );

    const loop = loadAiPmLoopState('pr1-test');
    expect(loop.turns).toHaveLength(1);
    expect(loop.turns[0]?.review).toBeDefined();
    expect(loop.turns[0]?.review?.turnId).toBe(turn.appliedAt);
    expect(loop.turns[0]?.review?.reviewId).toBeTruthy();
  });

  it('AC8: V3_REVIEW_PIPELINE flag gates new path', () => {
    setV3ReviewPipelineForTest(false);
    expect(isV3ReviewPipelineActive()).toBe(false);

    const turn: AiPmLoopTurn = {
      issueId: 'bm_design',
      answer: '고객이요',
      appliedAt: '2026-09-02T06:01:00.000Z',
    };

    appendLoopTurnWithReview(
      turn,
      {
        askedGapId: 'payer',
        askedQuestionText: '누가 지불?',
        askedIssueId: 'bm_design',
        userAnswer: turn.answer,
        displayedQuestionText: '누가 지불?',
      },
      'pr1-test',
    );

    const loop = loadAiPmLoopState('pr1-test');
    expect(loop.turns[0]?.review).toBeUndefined();

    setV3ReviewPipelineForTest(true);
    expect(isV3ReviewPipelineActive()).toBe(true);
  });
});

describe('PR1 — V3-07 multi gapVerdicts type support', () => {
  it('one answer may emit multiple gapVerdicts entries', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 직접 결제하고 월 구독료를 냅니다',
        askedGapId: 'payer',
        displayedQuestionText: '비용은 누가 지불하나요?',
      }),
    );
    expect(Object.keys(review.gapVerdicts).length).toBeGreaterThanOrEqual(2);
    expect(review.gapVerdicts.payer?.completeness).toBe('CLOSED');
    expect(review.gapVerdicts.revenueModel?.completeness).toBe('CLOSED');
    expect(Array.isArray(review.extractedFacts)).toBe(true);
    expect(review.extractedFacts.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PR2 — gapVerdicts / extractedFacts completeness (AC1–AC12)', () => {
  it('AC1/AC5: complete gapVerdicts with CLOSED expressible (V3-01)', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 직접 내요.',
        askedGapId: 'payer',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      }),
    );
    expect(review.gapVerdicts.payer).toMatchObject({
      gapId: 'payer',
      completeness: 'CLOSED',
    });
    expect(review.recommendedAction).toBe('advance');
  });

  it('AC4: PARTIAL expressible (V3-02)', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '사람들',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('PARTIAL');
    expect(review.recommendedAction).toBe('probe');
    expect(review.unconfirmed).toContain('customerPersona');
  });

  it('AC3: OPEN expressible (V3-03)', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '음… 글쎄요',
        askedGapId: 'differentiationVsAlternatives',
        askedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
        displayedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
        askedIssueId: 'competitor_analysis',
      }),
    );
    expect(review.gapVerdicts.differentiationVsAlternatives?.completeness).toBe('OPEN');
    expect(review.recommendedAction).toBe('clarify');
    expect(review.unknown).toContain('differentiationVsAlternatives');
  });

  it('AC6: CONTRADICTED expressible (V3-04 regression)', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '회사에서 지불해요',
        askedGapId: 'payer',
        displayedQuestionText: '비용은 누가 지불하나요?',
        existingFactsByKey: { buyer: '고객' },
      }),
    );
    expect(review.gapVerdicts.payer?.completeness).toBe('CONTRADICTED');
    expect(review.recommendedAction).toBe('challenge');
    expect(review.contradictions.length).toBeGreaterThan(0);
  });

  it('AC7: IRRELEVANT expressible (V3-06)', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '저희 기술은 AI 기반입니다.',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    expect(review.semanticInterpretationRef?.quality).toBe('IRRELEVANT');
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('OPEN');
    expect(review.recommendedAction).toBe('probe');
    expect(review.extractedFacts).toHaveLength(0);
    expect(review.askedGapId).toBe('customerPersona');
  });

  it('AC8/AC9: V3-07 multi-fact — payer + revenueModel CLOSED, one primary targetGapId', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 내고, 구독료로 벌어요',
        askedGapId: 'payer',
        askedQuestionText: '비용은 누가 지불하나요?',
        displayedQuestionText: '비용은 누가 지불하나요?',
      }),
    );
    expect(review.askedGapId).toBe('payer');
    expect(review.gapVerdicts.payer?.completeness).toBe('CLOSED');
    expect(review.gapVerdicts.revenueModel?.completeness).toBe('CLOSED');
    expect(review.recommendedAction).toBe('advance');
    expect(review.extractedFacts.some((f) => f.key === 'buyer' && f.targetGap === 'payer')).toBe(
      true,
    );
    expect(
      review.extractedFacts.some((f) => f.key === 'revenue' && f.targetGap === 'revenueModel'),
    ).toBe(true);
  });

  it('AC2: extractedFacts match S12 structure', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 직접 내요.',
        askedGapId: 'payer',
      }),
    );
    const fact = review.extractedFacts.find((f) => f.key === 'buyer');
    expect(fact).toBeDefined();
    expect(fact).toMatchObject({
      key: 'buyer',
      targetGap: 'payer',
      evidenceClass: 'FACT',
      confidence: 'high',
      source: 'explicit',
    });
    expect(typeof fact?.value).toBe('string');
    expect(fact!.value.length).toBeGreaterThan(0);
  });

  it('AC10: payer CLOSED only with explicit payer/payment decision-maker', () => {
    const weak = buildAnswerReview(
      baseReviewInput({
        userAnswer: '사람들',
        askedGapId: 'payer',
        displayedQuestionText: '비용은 누가 지불하나요?',
      }),
    );
    expect(weak.review.gapVerdicts.payer?.completeness).not.toBe('CLOSED');

    const strong = buildAnswerReview(
      baseReviewInput({
        userAnswer: '고객이 직접 내요.',
        askedGapId: 'payer',
      }),
    );
    expect(strong.review.gapVerdicts.payer?.completeness).toBe('CLOSED');
  });

  it('V3-05: prior payer CLOSED preserved when closing customerPersona', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '마케팅팀이 주로 씁니다',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        priorClosedGaps: ['payer'],
      }),
    );
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('CLOSED');
    expect(review.gapVerdicts.payer?.completeness).toBe('CLOSED');
    expect(review.recommendedAction).toBe('advance');
  });

  it('V3-08: payer CLOSED not re-opened in subsequent review', () => {
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '중소기업 마케팅팀',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('CLOSED');
    expect(review.gapVerdicts.payer).toBeUndefined();
  });
});

function minimalLiving() {
  const doc = 'B2B SaaS for marketing teams.';
  const understanding = buildBusinessUnderstanding(doc)!;
  const memory = buildConversationMemoryFromSources({
    projectId: 'v3-decision',
    documentText: doc,
    turns: [],
    entities: null,
    previous: null,
  });
  return buildLivingUnderstandingState({
    documentText: doc,
    understanding,
    turns: [],
    memory,
  });
}

function decideFromReviewInput(
  reviewInput: Partial<Parameters<typeof buildAnswerReview>[0]> = {},
  prior = createEmptyGapState(),
) {
  const { review } = buildAnswerReview(baseReviewInput(reviewInput));
  const gapState = updateGapStateFromReview(review, prior);
  const stageReadiness = evaluateStageReadiness({ gapState });
  const decision = decideNextQuestionFromReview({
    living: minimalLiving(),
    turns: [],
    memory: null,
    lastReview: review,
    gapState,
    stageReadiness,
  });
  return { review, gapState, decision, stageReadiness };
}

describe('PR4 — decideNextQuestionFromReview (AC1–AC19)', () => {
  it('AC1: decideNextQuestionFromReview is implemented and exported', async () => {
    const mod = await import('../decide-next-question-from-review');
    expect(typeof mod.decideNextQuestionFromReview).toBe('function');
  });

  it('AC2/AC3: gapState CLOSED gaps excluded from advance target (V3-01)', () => {
    const { decision, gapState } = decideFromReviewInput({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(decision?.targetGapId).not.toBe('payer');
    expect(isGapAskable('payer', gapState)).toBe(false);
  });

  it('AC4: PARTIAL → probe same gap (V3-02)', () => {
    const { review, decision } = decideFromReviewInput({
      userAnswer: '사람들',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    });
    expect(review.recommendedAction).toBe('probe');
    expect(decision?.action).toBe('probe');
    expect(decision?.targetGapId).toBe('customerPersona');
  });

  it('AC5: OPEN → clarify (V3-03)', () => {
    const { review, decision } = decideFromReviewInput({
      userAnswer: '음… 글쎄요',
      askedGapId: 'differentiationVsAlternatives',
      askedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
      displayedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
      askedIssueId: 'competitor_analysis',
    });
    expect(review.recommendedAction).toBe('clarify');
    expect(decision?.action).toBe('clarify');
    expect(decision?.targetGapId).toBe('differentiationVsAlternatives');
  });

  it('AC6: CONTRADICTED → clarify/challenge UX (V3-04)', () => {
    const afterPayer = decideFromReviewInput({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    }).gapState;
    const { review, decision } = decideFromReviewInput(
      {
        userAnswer: '회사에서 지불해요',
        askedGapId: 'payer',
        existingFactsByKey: { buyer: '고객' },
      },
      afterPayer,
    );
    expect(review.recommendedAction).toBe('challenge');
    expect(decision?.reviewAction).toBe('challenge');
    expect(decision?.action).toBe('clarify');
    expect(decision?.targetGapId).toBe('payer');
    expect(decision?.clarifyTarget?.factKey).toBe('buyer');
  });

  it('AC7: IRRELEVANT does not advance — probe same gap (V3-06)', () => {
    const { review, decision } = decideFromReviewInput({
      userAnswer: '저희 기술은 AI 기반입니다.',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    });
    expect(review.semanticInterpretationRef?.quality).toBe('IRRELEVANT');
    expect(decision?.action).toBe('probe');
    expect(decision?.targetGapId).toBe('customerPersona');
    expect(decision?.actionRationale).toContain('관련 없어');
  });

  it('AC8: V3-07 multi-gap CLOSED → advance to remaining OPEN Required', () => {
    const { decision, gapState } = decideFromReviewInput({
      userAnswer: '고객이 내고, 구독료로 벌어요',
      askedGapId: 'payer',
      displayedQuestionText: '비용은 누가 지불하나요?',
    });
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(gapState.gaps.revenueModel?.completeness).toBe('CLOSED');
    expect(decision?.action).toBe('advance');
    expect(decision?.targetGapId).not.toBe('payer');
    expect(decision?.targetGapId).not.toBe('revenueModel');
    expect(['problemJtbd', 'customerPersona', 'businessOneLiner']).toContain(
      decision?.targetGapId,
    );
  });

  it('AC9: prior CLOSED payer never re-asked (V3-05 chain)', () => {
    const afterPayer = decideFromReviewInput({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    }).gapState;
    const withOneLinerClosed: typeof afterPayer = {
      ...afterPayer,
      gaps: {
        ...afterPayer.gaps,
        businessOneLiner: {
          gapId: 'businessOneLiner',
          completeness: 'CLOSED',
          sourceTurnId: 'intake',
          sourceReviewId: 'intake-review',
          evidence: [],
          confidence: 'high',
          lastUpdated: '2026-09-02T00:00:00.000Z',
          rationale: 'intake one-liner',
        },
      },
      lastReviewByGap: { ...afterPayer.lastReviewByGap, businessOneLiner: 'intake-review' },
    };
    const { decision } = decideFromReviewInput(
      {
        userAnswer: '마케팅팀이 주로 씁니다',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        priorClosedGaps: ['payer'],
      },
      withOneLinerClosed,
    );
    expect(decision?.targetGapId).not.toBe('payer');
    expect(decision?.targetGapId).toBe('problemJtbd');
  });

  it('AC10–AC12: decision trace fields present', () => {
    const { review, decision } = decideFromReviewInput({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    expect(decision?.sourceReviewId).toBe(review.reviewId);
    expect(decision?.drivenByReview).toBe(true);
    expect(decision?.actionRationale.length).toBeGreaterThan(0);
    expect(decision?.whyNow.length).toBeGreaterThan(0);
    expect(decision?.questionText.length).toBeGreaterThan(0);
  });

  it('AC13: actionRationale, whyNow, questionText are distinct trace surfaces', () => {
    const partial = decideFromReviewInput({
      userAnswer: '사람들',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    }).decision;
    expect(partial?.actionRationale.length).toBeGreaterThan(0);
    expect(partial?.whyNow.length).toBeGreaterThan(0);
    expect(partial?.questionText.length).toBeGreaterThan(0);
    expect(partial?.whyNow).not.toContain(partial!.actionRationale);
    expect(partial?.questionText).not.toContain(partial!.actionRationale);

    const irrelevant = decideFromReviewInput({
      userAnswer: '저희 기술은 AI 기반입니다.',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    }).decision;
    expect(irrelevant?.actionRationale).toMatch(/관련 없어/);
  });

  it('AC14: V3 flag ON routes through decideNextQuestionFromReview', () => {
    stubSessionStorage();
    clearAiPmLoopState('pr4-flag-on');
    setV3ReviewPipelineForTest(true);

    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T08:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr4-flag-on',
    );

    const loop = loadAiPmLoopState('pr4-flag-on');
    const living = minimalLiving();
    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory: null,
      gapState: loop.gapState,
      projectId: 'pr4-flag-on',
    });
    expect(isNextQuestionDecision(decision)).toBe(true);
    expect(loadAiPmLoopState('pr4-flag-on').lastDecision?.sourceReviewId).toBeTruthy();

    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('AC15: V3 flag OFF falls back to legacy decideNextQuestion', () => {
    setV3ReviewPipelineForTest(false);
    const living = minimalLiving();
    const legacy = decideNextQuestion({ living, turns: [], memory: null });
    const routed = resolveNextQuestionDecision({
      living,
      turns: [],
      memory: null,
      persistLastDecision: false,
    });
    expect(isNextQuestionDecision(routed)).toBe(false);
    expect(routed?.targetGap).toBe(legacy?.targetGap);
    setV3ReviewPipelineForTest(null);
  });

  it('AC16: V3-08 payer CLOSED preserved across chain — never next target', () => {
    let gapState = createEmptyGapState();
    const steps = [
      {
        userAnswer: '고객이요',
        askedGapId: 'payer',
        askedQuestionText: '비용은 누가 지불하나요?',
        displayedQuestionText: '비용은 누가 지불하나요?',
        askedIssueId: 'bm_design' as const,
      },
      {
        userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제는?',
        displayedQuestionText: '핵심 문제는?',
        askedIssueId: 'problem_definition' as const,
      },
      {
        userAnswer: '중소기업 마케팅팀',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition' as const,
      },
    ];

    let lastDecision: ReturnType<typeof decideNextQuestionFromReview> = null;
    for (const step of steps) {
      const { review, gapState: nextState, decision } = decideFromReviewInput(step, gapState);
      gapState = nextState;
      lastDecision = decision;
      expect(review.gapVerdicts.payer?.completeness ?? gapState.gaps.payer?.completeness).toBeDefined();
      if (decision) {
        expect(decision.targetGapId).not.toBe('payer');
      }
    }
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(lastDecision?.targetGapId).toBe('businessOneLiner');
  });

  it('AC17/AC18/AC19: scope guards — PR5 evaluateStageReadiness wired, PR6+ not started', async () => {
    const mod = await import('../evaluate-stage-readiness');
    expect(typeof mod.evaluateStageReadiness).toBe('function');
    expect(typeof decideNextQuestionFromReview).toBe('function');
  });
});

describe('PR3 — updateGapStateFromReview (AC1–AC12)', () => {
  function stateFromReview(
    input: Partial<Parameters<typeof buildAnswerReview>[0]> = {},
    prior = createEmptyGapState(),
  ) {
    const { review } = buildAnswerReview(baseReviewInput(input));
    return updateGapStateFromReview(review, prior);
  }

  it('AC1: updateGapStateFromReview merges review into gapState', () => {
    const gapState = stateFromReview({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(gapState.gaps.payer?.sourceReviewId).toBeTruthy();
    expect(gapState.lastReviewByGap.payer).toBeTruthy();
  });

  it('AC2: gapVerdicts persist on loop state via appendLoopTurnWithReview', () => {
    stubSessionStorage();
    clearAiPmLoopState('pr3-test');
    setV3ReviewPipelineForTest(true);

    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T07:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr3-test',
    );

    const loop = loadAiPmLoopState('pr3-test');
    expect(loop.gapState?.gaps.payer?.completeness).toBe('CLOSED');
    expect(loop.turns[0]?.review?.gapVerdicts.payer?.completeness).toBe('CLOSED');

    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('AC3: CLOSED is monotonic — OPEN verdict cannot re-open CLOSED gap', () => {
    const closed = stateFromReview({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    const { review: reopenAttempt } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '음… 글쎄요',
        askedGapId: 'payer',
        displayedQuestionText: '비용은 누가 지불하나요?',
      }),
    );
    const after = updateGapStateFromReview(reopenAttempt, closed);
    expect(after.gaps.payer?.completeness).toBe('CLOSED');
    expect(isGapAskable('payer', after)).toBe(false);
  });

  it('AC4: PARTIAL progression persists in gapState (V3-02)', () => {
    const gapState = stateFromReview({
      userAnswer: '사람들',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    });
    expect(gapState.gaps.customerPersona?.completeness).toBe('PARTIAL');
    expect(isGapAskable('customerPersona', gapState)).toBe(true);
  });

  it('AC5: OPEN progression persists in gapState (V3-03)', () => {
    const gapState = stateFromReview({
      userAnswer: '음… 글쎄요',
      askedGapId: 'differentiationVsAlternatives',
      askedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
      displayedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
      askedIssueId: 'competitor_analysis',
    });
    expect(gapState.gaps.differentiationVsAlternatives?.completeness).toBe('OPEN');
  });

  it('AC6: CONTRADICTED reflected and supersedes CLOSED (V3-04)', () => {
    const closed = stateFromReview({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '회사에서 지불해요',
        askedGapId: 'payer',
        existingFactsByKey: { buyer: '고객' },
      }),
    );
    const after = updateGapStateFromReview(review, closed);
    expect(after.gaps.payer?.completeness).toBe('CONTRADICTED');
    expect(isGapAskable('payer', after)).toBe(true);
  });

  it('AC7: IRRELEVANT does not false-close gap (V3-06)', () => {
    const gapState = stateFromReview({
      userAnswer: '저희 기술은 AI 기반입니다.',
      askedGapId: 'customerPersona',
      askedQuestionText: '누구를 위한 서비스인가요?',
      displayedQuestionText: '누구를 위한 서비스인가요?',
      askedIssueId: 'customer_definition',
    });
    expect(gapState.gaps.customerPersona?.completeness).toBe('OPEN');
    expect(gapState.gaps.customerPersona?.evidence).toHaveLength(0);
  });

  it('AC8: V3-07 multi-gap — payer + revenueModel both CLOSED', () => {
    const gapState = stateFromReview({
      userAnswer: '고객이 내고, 구독료로 벌어요',
      askedGapId: 'payer',
      displayedQuestionText: '비용은 누가 지불하나요?',
    });
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(gapState.gaps.revenueModel?.completeness).toBe('CLOSED');
    expect(Object.keys(gapState.lastReviewByGap)).toContain('payer');
    expect(Object.keys(gapState.lastReviewByGap)).toContain('revenueModel');
  });

  it('AC9: prior CLOSED gaps preserved when absent from review (V3-08)', () => {
    const afterPayer = stateFromReview({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '중소기업 마케팅팀',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    const after = updateGapStateFromReview(review, afterPayer);
    expect(after.gaps.payer?.completeness).toBe('CLOSED');
    expect(after.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(isGapAskable('payer', after)).toBe(false);
  });

  it('AC9b: V3-05 prior payer CLOSED preserved via review + gapState chain', () => {
    const afterPayer = stateFromReview({
      userAnswer: '고객이 직접 내요.',
      askedGapId: 'payer',
    });
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '마케팅팀이 주로 씁니다',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        priorClosedGaps: ['payer'],
      }),
    );
    const after = updateGapStateFromReview(review, afterPayer);
    expect(after.gaps.payer?.completeness).toBe('CLOSED');
    expect(after.gaps.customerPersona?.completeness).toBe('CLOSED');
  });

  it('AC10: aggregateGapState replays V3-01→V3-08 sequence', () => {
    const reviews = [
      buildAnswerReview(
        baseReviewInput({
          turnId: 't1',
          userAnswer: '고객이 직접 내요.',
          askedGapId: 'payer',
        }),
      ).review,
      buildAnswerReview(
        baseReviewInput({
          turnId: 't2',
          userAnswer: '마케팅팀이 주로 씁니다',
          askedGapId: 'customerPersona',
          askedQuestionText: '누구를 위한 서비스인가요?',
          displayedQuestionText: '누구를 위한 서비스인가요?',
          askedIssueId: 'customer_definition',
          priorClosedGaps: ['payer'],
        }),
      ).review,
    ];
    const gapState = aggregateGapState(reviews);
    expect(gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(gapState.gaps.customerPersona?.completeness).toBe('CLOSED');
  });

  it('AC12: decideNextQuestionFromReview implemented in PR4 (supersedes PR3 guard)', async () => {
    const mod = await import('../decide-next-question-from-review');
    expect(typeof mod.decideNextQuestionFromReview).toBe('function');
  });
});

function closedStageAGapState(): ReturnType<typeof createEmptyGapState> {
  const base = createEmptyGapState();
  const closedRecord = {
    gapId: '',
    completeness: 'CLOSED' as const,
    sourceTurnId: 't-closed',
    sourceReviewId: 'rev-closed',
    evidence: [],
    confidence: 'high' as const,
    lastUpdated: '2026-09-02T00:00:00.000Z',
    rationale: 'test closed',
  };
  const gaps: typeof base.gaps = {};
  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    gaps[gapId] = { ...closedRecord, gapId };
  }
  return { ...base, gaps, lastReviewByGap: Object.fromEntries(STAGE_A_REQUIRED_GAPS.map((g) => [g, 'rev-closed'])) };
}

describe('PR5 — evaluateStageReadiness (AC1–AC10)', () => {
  it('AC1: evaluateStageReadiness is implemented and exported', async () => {
    const mod = await import('../evaluate-stage-readiness');
    expect(typeof mod.evaluateStageReadiness).toBe('function');
  });

  it('AC2 V3-09: Stage A Required all CLOSED → stageAReady + status READY', () => {
    const gapState = closedStageAGapState();
    const readiness = evaluateStageReadiness({
      gapState,
      turns: [
        { superseded: false } as AiPmLoopTurn,
        { superseded: false } as AiPmLoopTurn,
        { superseded: false } as AiPmLoopTurn,
        { superseded: false } as AiPmLoopTurn,
      ],
    });
    expect(isStageAReady(gapState)).toBe(true);
    expect(readiness.stageAReady).toBe(true);
    expect(readiness.stageBAllowed).toBe(true);
    expect(readiness.status).toBe('READY');
    expect(readiness.stageId).toBe('A_understanding');
    expect(readiness.currentStageFocus).toBe('B_validation');
    expect(readiness.blocker).toBeNull();
    expect(readiness.turnCount).toBe(4);
  });

  it('AC3 V3-09: Stage A NOT READY when Required gap PARTIAL — turnCount ignored', () => {
    const gapState = closedStageAGapState();
    gapState.gaps.problemJtbd = {
      ...gapState.gaps.problemJtbd!,
      completeness: 'PARTIAL',
    };
    const readiness = evaluateStageReadiness({ gapState, turns: Array(8).fill({ superseded: false }) });
    expect(readiness.stageAReady).toBe(false);
    expect(readiness.stageBAllowed).toBe(false);
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.stageId).toBe('A_understanding');
    expect(readiness.blocker).toEqual({ gapId: 'problemJtbd', reason: 'PARTIAL' });
    expect(readiness.turnCount).toBe(8);
  });

  it('AC4: Stage A incomplete blocks Stage B gap in advance decision', () => {
    const gapState = closedStageAGapState();
    gapState.gaps.problemJtbd = {
      ...gapState.gaps.problemJtbd!,
      completeness: 'PARTIAL',
    };
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
      }),
    );
    const merged = updateGapStateFromReview(review, gapState);
    const stageReadiness = evaluateStageReadiness({ gapState: merged });
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState: merged,
      stageReadiness,
    });
    expect(stageReadiness.stageBAllowed).toBe(false);
    expect(decision?.targetGapId).not.toBe('marketChannel');
    expect(STAGE_B_REQUIRED_GAPS as readonly string[]).not.toContain(decision?.targetGapId);
  });

  it('AC5 V3-09: Stage A READY → advance targets Stage B (marketChannel)', () => {
    const gapState = closedStageAGapState();
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제는?',
        displayedQuestionText: '핵심 문제는?',
        askedIssueId: 'problem_definition',
      }),
    );
    const merged = updateGapStateFromReview(review, gapState);
    const stageReadiness = evaluateStageReadiness({ gapState: merged });
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState: merged,
      stageReadiness,
    });
    expect(stageReadiness.stageAReady).toBe(true);
    expect(stageReadiness.stageBAllowed).toBe(true);
    expect(decision?.action).toBe('advance');
    expect(decision?.targetGapId).toBe('marketChannel');
  });

  it('AC6 V3-12: A→B→A clarification — problemJtbd probe only, CLOSED gaps excluded', () => {
    const gapState = closedStageAGapState();
    for (const gapId of STAGE_B_REQUIRED_GAPS) {
      gapState.gaps[gapId] = {
        gapId,
        completeness: 'CLOSED',
        sourceTurnId: 't-b',
        sourceReviewId: 'rev-b',
        evidence: [],
        confidence: 'high',
        lastUpdated: '2026-09-02T01:00:00.000Z',
        rationale: 'stage b closed',
      };
    }
    gapState.gaps.problemJtbd = {
      ...gapState.gaps.problemJtbd!,
      completeness: 'PARTIAL',
    };
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '콘텐츠 제작 시간',
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제를 다시 확인해 주세요',
        displayedQuestionText: '핵심 문제를 다시 확인해 주세요',
        askedIssueId: 'problem_definition',
      }),
    );
    const merged = updateGapStateFromReview(review, gapState);
    const stageReadiness = evaluateStageReadiness({ gapState: merged });
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState: merged,
      stageReadiness,
    });
    expect(review.recommendedAction).toBe('probe');
    expect(decision?.action).toBe('probe');
    expect(decision?.targetGapId).toBe('problemJtbd');
    expect(decision?.targetGapId).not.toBe('payer');
    expect(decision?.targetGapId).not.toBe('customerPersona');
    expect(decision?.targetGapId).not.toBe('businessOneLiner');
    expect(isGapAskable('payer', merged)).toBe(false);
  });

  it('AC7: isStageBGap identifies Stage B Required gaps only', () => {
    expect(isStageBGap('marketChannel')).toBe(true);
    expect(isStageBGap('payer')).toBe(false);
    expect(isStageBGap('businessOneLiner')).toBe(false);
  });

  it('AC8: evaluateStageReadiness reads gapState only — no semantic extraction', () => {
    const gapState = createEmptyGapState();
    gapState.gaps.payer = {
      gapId: 'payer',
      completeness: 'CLOSED',
      sourceTurnId: 'ext',
      sourceReviewId: 'ext-rev',
      evidence: [],
      confidence: 'high',
      lastUpdated: '2026-09-02T00:00:00.000Z',
      rationale: 'injected without review',
    };
    const readiness = evaluateStageReadiness({ gapState });
    expect(readiness.requiredGaps.find((g) => g.gapId === 'payer')?.completeness).toBe('CLOSED');
    expect(readiness.stageAReady).toBe(false);
  });

  it('AC9: resolveNextQuestionDecision wires evaluateStageReadiness', () => {
    stubSessionStorage();
    clearAiPmLoopState('pr5-wire');
    setV3ReviewPipelineForTest(true);

    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T09:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr5-wire',
    );

    const loop = loadAiPmLoopState('pr5-wire');
    const decision = resolveNextQuestionDecision({
      living: minimalLiving(),
      turns: loop.turns,
      memory: null,
      gapState: loop.gapState,
      projectId: 'pr5-wire',
    });
    expect(decision).toBeTruthy();
    expect(isNextQuestionDecision(decision)).toBe(true);

    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('AC10: CONTRADICTED Required gap → NOT_READY blocker', () => {
    const gapState = closedStageAGapState();
    gapState.gaps.payer = {
      ...gapState.gaps.payer!,
      completeness: 'CONTRADICTED',
    };
    const readiness = evaluateStageReadiness({ gapState });
    expect(readiness.stageAReady).toBe(false);
    expect(readiness.blocker).toEqual({ gapId: 'payer', reason: 'CONTRADICTED' });
  });
});

function sampleLastDecision(overrides: Partial<NextQuestionDecision> = {}): NextQuestionDecision {
  return {
    targetGap: 'problemJtbd',
    targetGapId: 'problemJtbd',
    issueId: 'problem_definition',
    questionText: '이 서비스가 해결하려는 핵심 문제는 무엇인가요?',
    whyNow: '지불 주체는 확인되었습니다.',
    rationale: '지불 주체는 확인되었습니다.',
    score: 40_000,
    reframed: false,
    excludedGaps: ['payer'],
    drivenByReview: true,
    sourceAnswerId: 't1',
    sourceReviewId: 'rev-v3-01',
    reviewAction: 'advance',
    action: 'advance',
    actionRationale: '지불 주체는 확인되었습니다. 이제 핵심 불편을 구체화합니다.',
    reason: 'advance to problemJtbd',
    ...overrides,
  };
}

describe('PR6 — hydrate / remount / CEO 6 surfaces (AC1–AC7)', () => {
  it('AC1: hydrate restores gapState + lastDecision + lockedAskSurface without re-ranking', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const gapState = updateGapStateFromReview(review, createEmptyGapState());
    const lastDecision = sampleLastDecision();
    const lockedAskSurface = {
      issueId: 'problem_definition' as const,
      targetGap: 'problemJtbd',
      questionText: lastDecision.questionText,
      whyNow: lastDecision.whyNow,
      rationale: lastDecision.actionRationale,
      score: 0,
      missingField: 'problem' as const,
    };

    const client: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [
        {
          issueId: 'bm_design',
          answer: '고객이 직접 내요.',
          appliedAt: '2026-09-02T00:00:00.000Z',
          review,
        },
      ],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      gapState,
      lastDecision,
      lockedAskSurface,
    };

    const hydrated = hydrateAiPmLoopState({ merged: client, client, db: client });
    expect(hydrated.gapState?.gaps.payer?.completeness).toBe('CLOSED');
    expect(hydrated.lastDecision?.questionText).toBe(lastDecision.questionText);
    expect(hydrated.lockedAskSurface?.questionText).toBe(lockedAskSurface.questionText);
  });

  it('AC1b V3-10: hydrate preserves CLOSED gaps (monotonic merge)', () => {
    const closed = updateGapStateFromReview(
      buildAnswerReview(baseReviewInput()).review,
      createEmptyGapState(),
    );
    const staleReplay = createEmptyGapState();
    const merged = mergeGapStateMonotonic(closed, staleReplay);
    const trace = assertHydrateClosedPreserved(closed, merged);
    expect(trace.preserved).toBe(true);
    expect(trace.closedGapIds).toContain('payer');
  });

  it('AC2 V3-11: remount uses lastDecision.questionText unchanged', () => {
    const decision = sampleLastDecision({
      questionText: '핵심 문제를 한 문장으로 말해 주세요.',
    });
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision: decision,
    };
    expect(resolveRemountQuestionText(loop)).toBe(decision.questionText);
    expect(shouldSkipLiveRankOnRemount(loop)).toBe(true);
  });

  it('AC3: CEO 6 surfaces render from persisted review + gapState', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const gapState = updateGapStateFromReview(review, createEmptyGapState());
    const surfaces = buildCeoSixSurfaces({
      lastTurn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T00:00:00.000Z',
        review,
      },
      gapState,
      lastDecision: sampleLastDecision(),
    });
    expect(surfaces.userAnswer).toBe('고객이 직접 내요.');
    expect(surfaces.aiUnderstanding).toBeTruthy();
    expect(surfaces.confirmedFacts.length).toBeGreaterThan(0);
    expect(surfaces.nextQuestion).toBeTruthy();
  });

  it('AC4: surface ⑤ order actionRationale → whyNow → questionText', () => {
    const decision = sampleLastDecision();
    const lines = renderSurfaceFiveLines({
      actionRationale: decision.actionRationale,
      whyNow: decision.whyNow,
      questionText: decision.questionText,
    });
    expect(lines[0]).toBe(decision.actionRationale);
    expect(lines[1]).toBe(decision.whyNow);
    expect(lines[2]).toBe(decision.questionText);
  });

  it('AC5: no user exposure of targetGapId/reviewId/score/engine metadata', () => {
    expect(isUserFacingSurfaceCopy('targetGapId: payer')).toBe(false);
    expect(isUserFacingSurfaceCopy('reviewId: rev-123')).toBe(false);
    expect(isUserFacingSurfaceCopy('score: 40000')).toBe(false);
    expect(isUserFacingSurfaceCopy('핵심 공백을 선택합니다')).toBe(false);
    expect(isUserFacingSurfaceCopy('확인됨: 지불 주체 → 고객')).toBe(true);

    const surfaces = buildCeoSixSurfaces({
      lastTurn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T00:00:00.000Z',
        review: buildAnswerReview(baseReviewInput()).review,
      },
      lastDecision: sampleLastDecision(),
    });
    const allCopy = [
      surfaces.aiUnderstanding,
      ...surfaces.confirmedFacts,
      ...surfaces.unconfirmedItems,
      ...renderSurfaceFiveLines(surfaces.whyAsk),
      surfaces.nextQuestion,
    ].filter(Boolean) as string[];
    for (const line of allCopy) {
      expect(isUserFacingSurfaceCopy(line)).toBe(true);
    }
  });

  it('AC6: remount path skips live rank when lastDecision present', () => {
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision: sampleLastDecision(),
    };
    expect(shouldSkipLiveRankOnRemount(loop)).toBe(true);
    const surface = resolveRemountAskSurface(loop);
    expect(surface?.questionText).toBe(loop.lastDecision!.questionText);
  });

  it('AC7: mergeTurnsPreservingReview keeps turn.review on hydrate', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const clientTurn = {
      issueId: 'bm_design' as const,
      answer: '고객이 직접 내요.',
      appliedAt: '2026-09-02T00:00:00.000Z',
      review,
    };
    const dbTurn = {
      issueId: 'bm_design' as const,
      answer: '고객이 직접 내요.',
      appliedAt: '2026-09-02T00:00:00.000Z',
    };
    const merged = mergeTurnsPreservingReview([clientTurn], [dbTurn]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.review?.reviewId).toBe(review.reviewId);
  });
});

describe('PR7 — legacy bypass elimination (B1–B20 guards)', () => {
  beforeEach(() => {
    stubSessionStorage();
    clearAiPmLoopState('pr7-test');
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('AC1 B8: V3 ON — resolveNextQuestionDecision uses review path, not legacy primary', () => {
    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T09:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr7-test',
    );
    const loop = loadAiPmLoopState('pr7-test');
    const decision = resolveNextQuestionDecision({
      living: minimalLiving(),
      turns: loop.turns,
      memory: null,
      gapState: loop.gapState,
      projectId: 'pr7-test',
    });
    expect(decision).toBeTruthy();
    expect(isNextQuestionDecision(decision)).toBe(true);
    expect((decision as NextQuestionDecision).drivenByReview).toBe(true);
  });

  it('AC2 B19: getAnsweredTargetGaps uses gapState CLOSED when V3 ON', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const gapState = updateGapStateFromReview(review, createEmptyGapState());
    const turns: AiPmLoopTurn[] = [];
    const answered = getAnsweredTargetGaps(turns, gapState);
    expect(answered.has('payer')).toBe(true);
  });

  it('AC3 B9: getWhyThisQuestionNow returns lastDecision display, not rank selection', () => {
    const lastDecision = sampleLastDecision();
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision,
    };
    const understanding = buildBusinessUnderstanding('테스트 사업');
    expect(understanding).toBeTruthy();
    const why = getWhyThisQuestionNow(understanding!, loop);
    expect(why?.questionText).toBe(lastDecision.questionText);
    expect(why?.targetGap).toBe('problemJtbd');
  });

  it('AC4 B20: resolveNextLoopIssue follows lastDecision when V3 ON', () => {
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'bm_design',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision: sampleLastDecision({ issueId: 'problem_definition' }),
    };
    const understanding = buildBusinessUnderstanding('테스트 사업');
    expect(understanding).toBeTruthy();
    const next = resolveNextLoopIssue(understanding!, loop);
    expect(next).toBe('problem_definition');
  });

  it('AC5 B11: resolveV3NextIssueAfterProcessing matches review→decide pipeline', () => {
    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T09:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'pr7-test',
    );
    const loop = loadAiPmLoopState('pr7-test');
    expect(loop.gapState?.gaps.payer?.completeness).toBe('CLOSED');
    const living = minimalLiving();
    const memory = buildConversationMemoryFromSources({
      projectId: 'pr7-test',
      documentText: '',
      turns: loop.turns,
      entities: null,
      previous: null,
    });
    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
      projectId: 'pr7-test',
      persistLastDecision: false,
    });
    const v3Issue = resolveV3NextIssueAfterProcessing({ loop, living, memory });
    expect(v3Issue).toBe(decision?.issueId);
    expect(isNextQuestionDecision(decision)).toBe(true);
    expect((decision as NextQuestionDecision).targetGapId).not.toBe('payer');
  });

  it('AC6 B1: shouldBindDisplayFromPersistedDecision when lastDecision exists', () => {
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision: sampleLastDecision(),
    };
    expect(shouldBindDisplayFromPersistedDecision(loop)).toBe(true);
  });

  it('AC7 B6: resolveV3FallbackTargetGap reads lastDecision.targetGapId', () => {
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'problem_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      lastDecision: sampleLastDecision({ targetGapId: 'problemJtbd' }),
    };
    expect(resolveV3FallbackTargetGap(loop)).toBe('problemJtbd');
  });

  it('AC8: CLOSED gap excluded from advance candidates via isGapAskable', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const gapState = updateGapStateFromReview(review, createEmptyGapState());
    expect(isGapAskable('payer', gapState)).toBe(false);
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness: evaluateStageReadiness({ gapState }),
    });
    expect(decision?.targetGapId).not.toBe('payer');
  });
});
