/**
 * PR8 — V3-01~V3-12 runtime certification (integration, not browser E2E).
 *
 * Full path under V3_REVIEW_PIPELINE=true:
 *   submit → buildAnswerReview → updateGapStateFromReview → gapState
 *   → evaluateStageReadiness → decideNextQuestionFromReview → lastDecision
 *   → buildCeoSixSurfaces / hydrate / remount
 *
 * Honest scope: simulates panel processing pipeline in vitest — not Playwright E2E.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { buildAnswerReview, type BuildAnswerReviewInput } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import {
  buildCeoSixSurfaces,
  isUserFacingSurfaceCopy,
  renderSurfaceFiveLines,
} from '../build-ceo-six-surfaces';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  decideNextQuestionFromReview,
  isNextQuestionDecision,
  type NextQuestionDecision,
} from '../decide-next-question-from-review';
import {
  evaluateStageReadiness,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '../evaluate-stage-readiness';
import {
  appendLoopTurnWithReview,
  runLoopAnswerProcessing,
} from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import {
  assertHydrateClosedPreserved,
  hydrateAiPmLoopState,
  mergeGapStateMonotonic,
} from '../hydrate-ai-pm-loop-state';
import {
  resolveRemountAskSurface,
  resolveRemountQuestionText,
  shouldSkipLiveRankOnRemount,
} from '../resolve-remount-ask-surface';
import {
  createEmptyGapState,
  getClosedGapIds,
  isGapAskable,
  updateGapStateFromReview,
} from '../update-gap-state-from-review';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId, AiPmLoopState, AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { setV3ReviewPipelineForTest, isV3ReviewPipelineActive } from '../v3-review-pipeline';
import { decideNextQuestion } from '../question-decision-engine';
import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';
import { resolveV3NextIssueAfterProcessing } from '../v3-legacy-bypass-guards';

const DOC = 'B2B SaaS — 중소기업 마케팅팀 대상 콘텐츠 자동화 도구.';

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

function baseReviewInput(overrides: Partial<BuildAnswerReviewInput> = {}) {
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

function minimalLiving() {
  const understanding = buildBusinessUnderstanding(DOC)!;
  const memory = buildConversationMemoryFromSources({
    projectId: 'cert',
    documentText: DOC,
    turns: [],
    entities: null,
    previous: null,
  });
  return buildLivingUnderstandingState({
    documentText: DOC,
    understanding,
    turns: [],
    memory,
  });
}

function closedStageAGapState(): GapKnowledgeState {
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
  return {
    ...base,
    gaps,
    lastReviewByGap: Object.fromEntries(STAGE_A_REQUIRED_GAPS.map((g) => [g, 'rev-closed'])),
  };
}

type PipelineStepInput = {
  projectId: string;
  turn: AiPmLoopTurn;
  reviewInput: Omit<BuildAnswerReviewInput, 'turnId'>;
};

type PipelineStepResult = {
  loop: AiPmLoopState;
  review: AnswerReview;
  gapState: GapKnowledgeState;
  decision: NextQuestionDecision;
  surfaces: ReturnType<typeof buildCeoSixSurfaces>;
  processing: ReturnType<typeof runLoopAnswerProcessing>;
};

/** Full V3 pipeline step — mirrors panel submit → finishProcessing path. */
function runFullV3PipelineStep(input: PipelineStepInput): PipelineStepResult {
  appendLoopTurnWithReview(input.turn, input.reviewInput, input.projectId);

  const loopAfterAppend = loadAiPmLoopState(input.projectId);
  const lastTurn = loopAfterAppend.turns[loopAfterAppend.turns.length - 1];
  expect(lastTurn?.review).toBeDefined();
  const review = lastTurn!.review!;

  const understanding = buildBusinessUnderstanding(DOC)!;
  const processing = runLoopAnswerProcessing({
    projectId: input.projectId,
    documentText: DOC,
    understanding,
  });

  const decision = resolveNextQuestionDecision({
    living: processing.living,
    turns: processing.loop.turns,
    memory: processing.memory,
    gapState: processing.loop.gapState,
    projectId: input.projectId,
    persistLastDecision: true,
  });

  expect(decision).toBeTruthy();
  expect(isNextQuestionDecision(decision)).toBe(true);

  const persisted = loadAiPmLoopState(input.projectId);
  const typedDecision = decision as NextQuestionDecision;

  const surfaces = buildCeoSixSurfaces({
    lastTurn: lastTurn!,
    gapState: persisted.gapState,
    lastDecision: typedDecision,
    loop: persisted,
  });

  return {
    loop: persisted,
    review,
    gapState: persisted.gapState ?? createEmptyGapState(),
    decision: typedDecision,
    surfaces,
    processing,
  };
}

function assertDecisionTrace(decision: NextQuestionDecision, review: AnswerReview) {
  expect(decision.sourceReviewId).toBe(review.reviewId);
  expect(decision.drivenByReview).toBe(true);
  expect(decision.actionRationale.length).toBeGreaterThan(0);
  expect(decision.whyNow.length).toBeGreaterThan(0);
  expect(decision.questionText.length).toBeGreaterThan(0);
}

function assertCeoSixSurfaces(surfaces: ReturnType<typeof buildCeoSixSurfaces>) {
  expect(surfaces.userAnswer).toBeTruthy();
  expect(surfaces.aiUnderstanding).toBeTruthy();
  expect(surfaces.nextQuestion).toBeTruthy();
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
}

describe('PR8 — V3 runtime certification (V3-01~V3-12)', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    expect(isV3ReviewPipelineActive()).toBe(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('V3-01: payer CLOSED → advance to next Required gap', () => {
    const projectId = 'cert-v3-01';
    clearAiPmLoopState(projectId);

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T10:00:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
    });

    expect(result.review.recommendedAction).toBe('advance');
    expect(result.gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(result.decision.action).toBe('advance');
    expect(result.decision.targetGapId).not.toBe('payer');
    expect(isGapAskable('payer', result.gapState)).toBe(false);
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-02: PARTIAL → same-gap probe', () => {
    const projectId = 'cert-v3-02';
    clearAiPmLoopState(projectId);

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'customer_definition',
        answer: '사람들',
        appliedAt: '2026-09-02T10:01:00.000Z',
        targetGap: 'customerPersona',
      },
      reviewInput: {
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '사람들',
        displayedQuestionText: '누구를 위한 서비스인가요?',
      },
    });

    expect(result.review.recommendedAction).toBe('probe');
    expect(result.gapState.gaps.customerPersona?.completeness).toBe('PARTIAL');
    expect(result.decision.action).toBe('probe');
    expect(result.decision.targetGapId).toBe('customerPersona');
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-03: OPEN → clarify same gap', () => {
    const projectId = 'cert-v3-03';
    clearAiPmLoopState(projectId);

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'competitor_analysis',
        answer: '음… 글쎄요',
        appliedAt: '2026-09-02T10:02:00.000Z',
        targetGap: 'differentiationVsAlternatives',
      },
      reviewInput: {
        askedGapId: 'differentiationVsAlternatives',
        askedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
        askedIssueId: 'competitor_analysis',
        userAnswer: '음… 글쎄요',
        displayedQuestionText: '경쟁사 대비 차별점은 무엇인가요?',
      },
    });

    expect(result.review.recommendedAction).toBe('clarify');
    expect(result.gapState.gaps.differentiationVsAlternatives?.completeness).toBe('OPEN');
    expect(result.decision.action).toBe('clarify');
    expect(result.decision.targetGapId).toBe('differentiationVsAlternatives');
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-04: CONTRADICTED → clarify (challenge UX)', () => {
    const projectId = 'cert-v3-04';
    clearAiPmLoopState(projectId);

    // Single-step: BANK has buyer=고객 (existingFactsByKey), user contradicts on payer ask.
    // Matches PR4 decideFromReviewInput — prior CLOSED in gapState would block CONTRADICTED via priorClosedGaps seed.
    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '회사에서 지불해요',
        appliedAt: '2026-09-02T10:04:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '회사에서 지불해요',
        displayedQuestionText: '비용은 누가 지불하나요?',
        existingFactsByKey: { buyer: '고객' },
      },
    });

    expect(result.review.recommendedAction).toBe('challenge');
    expect(result.gapState.gaps.payer?.completeness).toBe('CONTRADICTED');
    expect(result.decision.action).toBe('clarify');
    expect(result.decision.targetGapId).toBe('payer');
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-05: CLOSED anti-repeat — payer never re-selected after customerPersona CLOSED', () => {
    const projectId = 'cert-v3-05';
    clearAiPmLoopState(projectId);

    runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T10:05:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
    });

    const loop = loadAiPmLoopState(projectId);
    patchAiPmLoopState(
      {
        gapState: {
          ...loop.gapState!,
          gaps: {
            ...loop.gapState!.gaps,
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
        },
      },
      projectId,
    );

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'customer_definition',
        answer: '마케팅팀이 주로 씁니다',
        appliedAt: '2026-09-02T10:06:00.000Z',
        targetGap: 'customerPersona',
      },
      reviewInput: {
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '마케팅팀이 주로 씁니다',
        displayedQuestionText: '누구를 위한 서비스인가요?',
        priorClosedGaps: ['payer'],
      },
    });

    expect(result.gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(result.gapState.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(result.decision.action).toBe('advance');
    expect(result.decision.targetGapId).not.toBe('payer');
    expect(result.decision.targetGapId).toBe('problemJtbd');
    expect(isGapAskable('payer', result.gapState)).toBe(false);
    assertDecisionTrace(result.decision, result.review);
  });

  it('V3-06: IRRELEVANT → probe same gap, no false closure', () => {
    const projectId = 'cert-v3-06';
    clearAiPmLoopState(projectId);

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'customer_definition',
        answer: '저희 기술은 AI 기반입니다.',
        appliedAt: '2026-09-02T10:07:00.000Z',
        targetGap: 'customerPersona',
      },
      reviewInput: {
        askedGapId: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '저희 기술은 AI 기반입니다.',
        displayedQuestionText: '누구를 위한 서비스인가요?',
      },
    });

    expect(result.review.semanticInterpretationRef?.quality).toBe('IRRELEVANT');
    expect(result.gapState.gaps.customerPersona?.completeness).toBe('OPEN');
    expect(result.decision.action).toBe('probe');
    expect(result.decision.targetGapId).toBe('customerPersona');
    expect(result.decision.actionRationale).toMatch(/관련 없어/);
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-07: multi-gap closure — payer + revenueModel CLOSED, advance to remaining Required', () => {
    const projectId = 'cert-v3-07';
    clearAiPmLoopState(projectId);

    const result = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '고객이 내고, 구독료로 벌어요',
        appliedAt: '2026-09-02T10:08:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 내고, 구독료로 벌어요',
        displayedQuestionText: '비용은 누가 지불하나요?',
      },
    });

    expect(result.gapState.gaps.payer?.completeness).toBe('CLOSED');
    expect(result.gapState.gaps.revenueModel?.completeness).toBe('CLOSED');
    expect(result.decision.action).toBe('advance');
    expect(result.decision.targetGapId).not.toBe('payer');
    expect(result.decision.targetGapId).not.toBe('revenueModel');
    expect(['problemJtbd', 'customerPersona', 'businessOneLiner']).toContain(
      result.decision.targetGapId,
    );
    assertDecisionTrace(result.decision, result.review);
    assertCeoSixSurfaces(result.surfaces);
  });

  it('V3-08: chain anti-repeat — payer never next target across 3-turn chain', () => {
    const projectId = 'cert-v3-08';
    clearAiPmLoopState(projectId);

    const steps: Array<{
      turn: AiPmLoopTurn;
      reviewInput: Omit<BuildAnswerReviewInput, 'turnId'>;
    }> = [
      {
        turn: {
          issueId: 'bm_design',
          answer: '고객이요',
          appliedAt: '2026-09-02T10:09:00.000Z',
          targetGap: 'payer',
        },
        reviewInput: {
          askedGapId: 'payer',
          askedQuestionText: '비용은 누가 지불하나요?',
          askedIssueId: 'bm_design',
          userAnswer: '고객이요',
          displayedQuestionText: '비용은 누가 지불하나요?',
        },
      },
      {
        turn: {
          issueId: 'problem_definition',
          answer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
          appliedAt: '2026-09-02T10:10:00.000Z',
          targetGap: 'problemJtbd',
        },
        reviewInput: {
          askedGapId: 'problemJtbd',
          askedQuestionText: '핵심 문제는?',
          askedIssueId: 'problem_definition',
          userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
          displayedQuestionText: '핵심 문제는?',
        },
      },
      {
        turn: {
          issueId: 'customer_definition',
          answer: '중소기업 마케팅팀',
          appliedAt: '2026-09-02T10:11:00.000Z',
          targetGap: 'customerPersona',
        },
        reviewInput: {
          askedGapId: 'customerPersona',
          askedQuestionText: '누구를 위한 서비스인가요?',
          askedIssueId: 'customer_definition',
          userAnswer: '중소기업 마케팅팀',
          displayedQuestionText: '누구를 위한 서비스인가요?',
        },
      },
    ];

    let lastResult: PipelineStepResult | null = null;
    for (const step of steps) {
      lastResult = runFullV3PipelineStep({ projectId, ...step });
      expect(lastResult.decision.targetGapId).not.toBe('payer');
      expect(lastResult.gapState.gaps.payer?.completeness).toBe('CLOSED');
    }

    expect(lastResult!.decision.targetGapId).toBe('businessOneLiner');
    expect(getClosedGapIds(lastResult!.gapState)).toContain('payer');
  });

  it('V3-09: Stage A READY → advance targets Stage B (marketChannel)', () => {
    const projectId = 'cert-v3-09';
    clearAiPmLoopState(projectId);

    const stageAClosed = closedStageAGapState();
    patchAiPmLoopState({ gapState: stageAClosed }, projectId);

    const { review } = buildAnswerReview(
      baseReviewInput({
        userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제는?',
        displayedQuestionText: '핵심 문제는?',
        askedIssueId: 'problem_definition',
      }),
    );
    const gapState = updateGapStateFromReview(review, stageAClosed);
    const stageReadiness = evaluateStageReadiness({ gapState });
    const decision = decideNextQuestionFromReview({
      living: minimalLiving(),
      turns: [],
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    expect(stageReadiness.stageAReady).toBe(true);
    expect(stageReadiness.stageBAllowed).toBe(true);
    expect(stageReadiness.currentStageFocus).toBe('B_validation');
    expect(decision?.action).toBe('advance');
    expect(decision?.targetGapId).toBe('marketChannel');
    expect(STAGE_B_REQUIRED_GAPS).toContain(decision!.targetGapId);
  });

  it('V3-10: hydrate preserves CLOSED gaps (monotonic merge, no re-rank)', () => {
    const projectId = 'cert-v3-10';
    clearAiPmLoopState(projectId);

    const step = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T10:12:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
    });

    const clientState = loadAiPmLoopState(projectId);
    const staleDb: AiPmLoopState = {
      version: 1,
      phase: 'answer',
      turns: clientState.turns.map((t) => ({ ...t, review: undefined })),
      currentIssueId: 'bm_design',
      readingCompleted: true,
      dismissedReadAck: true,
      gapState: createEmptyGapState(),
    };

    const hydrated = hydrateAiPmLoopState({
      merged: clientState,
      client: clientState,
      db: staleDb,
    });

    const trace = assertHydrateClosedPreserved(step.gapState, hydrated.gapState ?? createEmptyGapState());
    expect(trace.preserved).toBe(true);
    expect(hydrated.gapState?.gaps.payer?.completeness).toBe('CLOSED');
    expect(hydrated.lastDecision?.questionText).toBe(step.decision.questionText);
    expect(hydrated.turns[0]?.review?.reviewId).toBe(step.review.reviewId);

    const merged = mergeGapStateMonotonic(step.gapState, createEmptyGapState());
    expect(merged.gaps.payer?.completeness).toBe('CLOSED');
  });

  it('V3-11: remount uses lastDecision.questionText unchanged (no live rank)', () => {
    const projectId = 'cert-v3-11';
    clearAiPmLoopState(projectId);

    const step = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T10:13:00.000Z',
        targetGap: 'payer',
      },
      reviewInput: {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
    });

    const loop = loadAiPmLoopState(projectId);
    const originalQuestionText = step.decision.questionText;

    expect(resolveRemountQuestionText(loop)).toBe(originalQuestionText);
    expect(shouldSkipLiveRankOnRemount(loop)).toBe(true);

    const remountSurface = resolveRemountAskSurface(loop);
    expect(remountSurface?.questionText).toBe(originalQuestionText);

    const legacyRank = decideNextQuestion({
      living: minimalLiving(),
      turns: loop.turns,
      memory: null,
    });
    if (legacyRank?.questionText !== originalQuestionText) {
      expect(resolveRemountQuestionText(loop)).toBe(originalQuestionText);
    }
  });

  it('V3-12: CEO 6 surfaces + A→B→A multi-turn journey', () => {
    const projectId = 'cert-v3-12';
    clearAiPmLoopState(projectId);

    const journey: Array<{
      turn: AiPmLoopTurn;
      reviewInput: Omit<BuildAnswerReviewInput, 'turnId'>;
    }> = [
      {
        turn: {
          issueId: 'bm_design',
          answer: '고객이 직접 내요.',
          appliedAt: '2026-09-02T11:00:00.000Z',
          targetGap: 'payer',
        },
        reviewInput: {
          askedGapId: 'payer',
          askedQuestionText: '서비스 비용은 누가 지불하나요?',
          askedIssueId: 'bm_design',
          userAnswer: '고객이 직접 내요.',
          displayedQuestionText: '서비스 비용은 누가 지불하나요?',
        },
      },
      {
        turn: {
          issueId: 'problem_definition',
          answer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
          appliedAt: '2026-09-02T11:01:00.000Z',
          targetGap: 'problemJtbd',
        },
        reviewInput: {
          askedGapId: 'problemJtbd',
          askedQuestionText: '핵심 문제는?',
          askedIssueId: 'problem_definition',
          userAnswer: '콘텐츠 제작에 시간이 너무 많이 걸려요',
          displayedQuestionText: '핵심 문제는?',
        },
      },
      {
        turn: {
          issueId: 'customer_definition',
          answer: '중소기업 마케팅팀',
          appliedAt: '2026-09-02T11:02:00.000Z',
          targetGap: 'customerPersona',
        },
        reviewInput: {
          askedGapId: 'customerPersona',
          askedQuestionText: '누구를 위한 서비스인가요?',
          askedIssueId: 'customer_definition',
          userAnswer: '중소기업 마케팅팀',
          displayedQuestionText: '누구를 위한 서비스인가요?',
        },
      },
    ];

    const surfaceResults: ReturnType<typeof buildCeoSixSurfaces>[] = [];
    let lastDecision: NextQuestionDecision | null = null;

    for (const step of journey) {
      const result = runFullV3PipelineStep({ projectId, ...step });
      assertDecisionTrace(result.decision, result.review);
      assertCeoSixSurfaces(result.surfaces);
      surfaceResults.push(result.surfaces);
      lastDecision = result.decision;
      expect(result.decision.targetGapId).not.toBe('payer');
    }

    expect(surfaceResults.length).toBe(3);

    const loop = loadAiPmLoopState(projectId);
    const stageAClosed = closedStageAGapState();
    for (const gapId of STAGE_B_REQUIRED_GAPS) {
      stageAClosed.gaps[gapId] = {
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
    stageAClosed.gaps.problemJtbd = {
      ...stageAClosed.gaps.problemJtbd!,
      completeness: 'PARTIAL',
    };
    patchAiPmLoopState({ gapState: stageAClosed, lastDecision: lastDecision ?? undefined }, projectId);

    const aReturn = runFullV3PipelineStep({
      projectId,
      turn: {
        issueId: 'problem_definition',
        answer: '콘텐츠 제작 시간',
        appliedAt: '2026-09-02T11:03:00.000Z',
        targetGap: 'problemJtbd',
      },
      reviewInput: {
        askedGapId: 'problemJtbd',
        askedQuestionText: '핵심 문제를 다시 확인해 주세요',
        askedIssueId: 'problem_definition',
        userAnswer: '콘텐츠 제작 시간',
        displayedQuestionText: '핵심 문제를 다시 확인해 주세요',
      },
    });

    expect(aReturn.decision.action).toBe('probe');
    expect(aReturn.decision.targetGapId).toBe('problemJtbd');
    expect(aReturn.decision.targetGapId).not.toBe('payer');
    expect(aReturn.decision.targetGapId).not.toBe('customerPersona');
    expect(isGapAskable('payer', aReturn.gapState)).toBe(false);
    assertCeoSixSurfaces(aReturn.surfaces);

    const lines = renderSurfaceFiveLines(aReturn.surfaces.whyAsk);
    expect(lines[0]).toBe(aReturn.decision.actionRationale);
    expect(lines[1]).toBe(aReturn.decision.whyNow);
    expect(lines[2]).toBe(aReturn.decision.questionText);
  });
});

describe('PR8 — legacy bypass regression (V3 flag ON)', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('V3 ON: resolveNextQuestionDecision uses review path, not legacy primary', () => {
    const projectId = 'cert-legacy-bypass';
    clearAiPmLoopState(projectId);

    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '고객이 직접 내요.',
        appliedAt: '2026-09-02T12:00:00.000Z',
        targetGap: 'payer',
      },
      {
        askedGapId: 'payer',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        askedIssueId: 'bm_design',
        userAnswer: '고객이 직접 내요.',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      projectId,
    );

    const loop = loadAiPmLoopState(projectId);
    const living = minimalLiving();
    const memory = buildConversationMemoryFromSources({
      projectId,
      documentText: DOC,
      turns: loop.turns,
      entities: null,
      previous: null,
    });

    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
      projectId,
    });

    expect(isNextQuestionDecision(decision)).toBe(true);
    expect((decision as NextQuestionDecision).drivenByReview).toBe(true);
    expect((decision as NextQuestionDecision).targetGapId).not.toBe('payer');

    const v3Issue = resolveV3NextIssueAfterProcessing({ loop, living, memory });
    expect(v3Issue).toBe((decision as NextQuestionDecision).issueId);
  });

  it('V3 ON: getAnsweredTargetGaps reads gapState CLOSED, not turn inference', () => {
    const { review } = buildAnswerReview(baseReviewInput());
    const gapState = updateGapStateFromReview(review, createEmptyGapState());
    const answered = getAnsweredTargetGaps([], gapState);
    expect(answered.has('payer')).toBe(true);
  });

  it('V3 OFF: legacy decideNextQuestion still available for rollback', () => {
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
  });
});
