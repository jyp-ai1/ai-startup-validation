import { describe, expect, it, vi } from 'vitest';

import { buildAnswerReview } from '../build-answer-review';
import { buildCeoSixSurfaces } from '../build-ceo-six-surfaces';
import {
  decideNextQuestionFromReview,
  type NextQuestionDecision,
} from '../decide-next-question-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { resolveRemountAskSurface } from '../resolve-remount-ask-surface';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { appendLoopTurnWithReview } from '../process-loop-answer';
import {
  createEmptyGapState,
  getClosedGapIds,
  isGapAskable,
  updateGapStateFromReview,
} from '../update-gap-state-from-review';
import { resolveV3DisplayPriority } from '../v3-legacy-bypass-guards';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import type { AiPmLoopState } from '../workspace-ai-pm-loop-types';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';

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
    turnId: 'turn-1',
    askedGapId: 'payer',
    askedQuestionText: '서비스 비용은 누가 지불하나요?',
    displayedQuestionText: '서비스 비용은 누가 지불하나요?',
    askedIssueId: 'bm_design' as const,
    userAnswer: '고객이 직접 내요.',
    ...overrides,
  };
}

function stateFromReview(input: Partial<Parameters<typeof buildAnswerReview>[0]> = {}) {
  const { review } = buildAnswerReview(baseReviewInput(input));
  return updateGapStateFromReview(review, createEmptyGapState());
}

function minimalLiving() {
  const doc = 'B2B SaaS for marketing teams.';
  const understanding = buildBusinessUnderstanding(doc)!;
  const memory = buildConversationMemoryFromSources({
    projectId: 'day7',
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

const INTERNAL_KEYS = [
  'businessOneLiner',
  'problemJtbd',
  'customerPersona',
  'payer',
  'revenueModel',
];

describe('DAY 7 P0-B — contradiction transition', () => {
  it('priorClosed payer + contradictory answer → payer CONTRADICTED (not re-sealed CLOSED)', () => {
    const closed = stateFromReview({
      userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
      askedGapId: 'payer',
    });
    expect(closed.gaps.payer?.completeness).toBe('CLOSED');

    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '아니요, 사장님이 대신 결제합니다.',
        askedGapId: 'marketChannel',
        askedQuestionText: '고객·수요를 검증할 채널은 어디인가요?',
        displayedQuestionText: '고객·수요를 검증할 채널은 어디인가요?',
        askedIssueId: 'market_validation',
        existingFactsByKey: { buyer: 'CEO와 PM' },
        priorClosedGaps: getClosedGapIds(closed),
      }),
    );

    expect(review.gapVerdicts.payer?.completeness).toBe('CONTRADICTED');
    const after = updateGapStateFromReview(review, closed);
    expect(after.gaps.payer?.completeness).toBe('CONTRADICTED');
    expect(isGapAskable('payer', after)).toBe(true);

    const stageReadiness = evaluateStageReadiness({ gapState: after });
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState: after,
      stageReadiness,
    });
    expect(decision?.targetGapId).toBe('payer');
    expect(decision?.targetGapId).not.toBe('marketChannel');
  });
});

describe('DAY 7 P0-A — CLOSED anti-repeat / stale decision', () => {
  it('stale lastDecision on CLOSED gap is not shown on CEO surface', () => {
    const gapState = stateFromReview({
      userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
      askedGapId: 'payer',
    });
    const staleDecision: NextQuestionDecision = {
      targetGap: 'payer',
      targetGapId: 'payer',
      issueId: 'bm_design',
      questionText: '서비스 비용은 누가 지불하나요?',
      whyNow: 'why',
      rationale: 'rationale',
      score: 30_000,
      actionRationale: 'stale',
      drivenByReview: true,
      sourceAnswerId: 't1',
      sourceReviewId: 'r1',
      recommendedAction: 'probe',
      reframed: false,
      excludedGaps: [],
    };
    const surfaces = buildCeoSixSurfaces({
      lastTurn: null,
      gapState,
      lastDecision: staleDecision,
      loop: { version: 1, phase: 'answer', turns: [], gapState } as AiPmLoopState,
    });
    expect(surfaces.nextQuestion).not.toBe('서비스 비용은 누가 지불하나요?');
    expect(surfaces.nextQuestion).toBeFalsy();
  });

  it('resolveNextQuestionDecision clears stale lastDecision when decision is null', () => {
    const store = stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    clearAiPmLoopState('day7-stale');

    const gapState = stateFromReview({
      userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
      askedGapId: 'payer',
    });
    patchAiPmLoopState(
      {
        gapState,
        lastDecision: {
          targetGap: 'payer',
          targetGapId: 'payer',
          issueId: 'bm_design',
          questionText: '서비스 비용은 누가 지불하나요?',
          whyNow: 'why',
          rationale: 'r',
          score: 1,
          actionRationale: 'a',
          drivenByReview: true,
          sourceAnswerId: 't',
          sourceReviewId: 'r',
          recommendedAction: 'advance',
          reframed: false,
          excludedGaps: [],
        },
        lockedAskSurface: {
          issueId: 'bm_design',
          targetGap: 'payer',
          questionText: '서비스 비용은 누가 지불하나요?',
          whyNow: 'why',
          rationale: 'r',
          score: 1,
        },
      },
      'day7-stale',
    );

    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
        askedGapId: 'payer',
      }),
    );
    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: 'CEO와 PM이 월 구독료를 지불합니다.',
        appliedAt: '2026-09-05T00:00:00.000Z',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      'day7-stale',
    );

    resolveNextQuestionDecision({
      living: minimalLiving(),
      turns: loadAiPmLoopState('day7-stale').turns,
      memory: null,
      projectId: 'day7-stale',
      gapState: loadAiPmLoopState('day7-stale').gapState,
      persistLastDecision: true,
    });

    const loop = loadAiPmLoopState('day7-stale');
    expect(isGapAskable('payer', loop.gapState!)).toBe(false);
    if (loop.lastDecision) {
      expect(loop.lastDecision.targetGapId).not.toBe('payer');
    }
    void store;
  });
});

describe('DAY 7 P0-C — remount / hydrate bind', () => {
  it('resolveRemountAskSurface + resolveV3DisplayPriority preserve locked question', () => {
    const loop: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: [{ issueId: 'bm_design', answer: 'test', appliedAt: '1' }],
      gapState: stateFromReview({
        userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
        askedGapId: 'payer',
      }),
      lockedAskSurface: {
        issueId: 'market_validation',
        targetGap: 'marketChannel',
        questionText: '고객·수요를 검증할 채널은 어디인가요?',
        whyNow: 'why channel',
        rationale: 'rationale',
        score: 40_000,
      },
    };
    setV3ReviewPipelineForTest(true);
    const remount = resolveRemountAskSurface(loop);
    expect(remount?.questionText).toBe('고객·수요를 검증할 채널은 어디인가요?');
    const display = resolveV3DisplayPriority(loop);
    expect(display?.questionText).toBe('고객·수요를 검증할 채널은 어디인가요?');
  });
});

describe('DAY 7 E2E-01 — first answer CEO next question', () => {
  it('persisted lastDecision/lock yields CEO next question after first CLOSED answer', () => {
    const store = stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    clearAiPmLoopState('e2e01');

    appendLoopTurnWithReview(
      {
        issueId: 'problem_definition',
        answer:
          '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
        appliedAt: '1',
        targetGap: 'problemJtbd',
      },
      {
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제는 무엇인가요?',
        askedIssueId: 'problem_definition',
        userAnswer:
          '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
        displayedQuestionText: '핵심 문제는 무엇인가요?',
      },
      'e2e01',
    );

    const loop = loadAiPmLoopState('e2e01');
    const living = minimalLiving();
    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory: null,
      projectId: 'e2e01',
      gapState: loop.gapState,
      persistLastDecision: true,
    });
    expect(decision?.questionText?.length).toBeGreaterThan(5);

    const loopAfter = loadAiPmLoopState('e2e01');
    const surfaces = buildCeoSixSurfaces({
      lastTurn: loopAfter.turns.at(-1)!,
      loop: loopAfter,
    });
    expect(surfaces.nextQuestion?.length).toBeGreaterThan(5);
    void store;
  });
});

describe('DAY 7 P0-D — conflict path internal key leak', () => {
  it('ceo-surface-ai-understanding maps review.known gap IDs to Korean labels', () => {
    const closed = stateFromReview({
      userAnswer: 'CEO와 PM이 월 구독료를 지불합니다.',
      askedGapId: 'payer',
    });
    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '아니요, 사장님이 대신 결제합니다.',
        askedGapId: 'marketChannel',
        askedQuestionText: '고객·수요를 검증할 채널은 어디인가요?',
        displayedQuestionText: '고객·수요를 검증할 채널은 어디인가요?',
        askedIssueId: 'market_validation',
        existingFactsByKey: { buyer: 'CEO와 PM' },
        priorClosedGaps: getClosedGapIds(closed),
      }),
    );

    const surfaces = buildCeoSixSurfaces({
      lastTurn: {
        issueId: 'market_validation',
        answer: '아니요, 사장님이 대신 결제합니다.',
        appliedAt: '2026-09-05T00:00:00.000Z',
        review,
      },
      gapState: updateGapStateFromReview(review, closed),
    });

    const ai = surfaces.aiUnderstanding ?? '';
    for (const key of INTERNAL_KEYS) {
      expect(ai).not.toMatch(new RegExp(`\\b${key}\\b`));
    }
    expect(ai).toMatch(/사업 한 줄|핵심 문제|구매자|수익 모델/);
  });
});
