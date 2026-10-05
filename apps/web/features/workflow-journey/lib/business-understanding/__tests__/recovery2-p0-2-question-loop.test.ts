/**
 * Recovery 2 P0-2 — question loop verification.
 * Independent of P0-1 first-write slot routing.
 * CPO gates: priority · CLOSED re-ask · multi-fact · contradiction · longitudinal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmAnswerFirstRoutingV1ForTest } from '../ai-pm-answer-first-routing-policy-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { applyNoAskPolicy } from '../ai-pm-no-ask-policy';
import { applyQuestionPolicy } from '../ai-pm-question-policy';
import { buildAnswerReview } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  decideNextQuestionFromReview,
  isNextQuestionDecision,
} from '../decide-next-question-from-review';
import { evaluateStageReadiness, STAGE_A_REQUIRED_GAPS } from '../evaluate-stage-readiness';
import {
  inferTargetGapFromQuestionText,
  isBusinessUnderstandingConfirmQuestion,
} from '../gap-question-map';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { extractConfirmKnownValueFromQuestion } from '../ai-pm-question-presentation';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { commitFirstAskAfterUnderstandingConfirm } from '../understanding-confirm-ask-transition';
import { getClosedGapIds, isGapAskable } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const PROJECT_ID = 'recovery2-p0-2-question-loop';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const FOUNDER_CORRECTION = '방한 외국인이 아니라 내국인과 외국인 모두입니다.';
const PAYER_ANSWER = '체험 예약은 관광객이 결제합니다.';
const PROBLEM_ANSWER = '양조장마다 홍보 채널이 달라 관광객이 체험을 찾기 어렵습니다.';

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
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
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function nextLayers(processed: ReturnType<typeof runLoopAnswerProcessing>) {
  const turn = processed.loop.turns.at(-1);
  const review = turn?.review ?? null;
  const gapState = processed.loop.gapState!;
  const stageReadiness = evaluateStageReadiness({
    gapState,
    loop: processed.loop,
    turns: processed.loop.turns,
  });
  const rawDecide = decideNextQuestionFromReview({
    living: processed.living,
    turns: processed.loop.turns,
    memory: processed.memory,
    lastReview: review,
    gapState,
    stageReadiness,
  });
  const afterPolicy =
    rawDecide && isNextQuestionDecision(rawDecide)
      ? applyQuestionPolicy({
          decision: rawDecide,
          gapState,
          living: processed.living,
          turns: processed.loop.turns,
          stageReadiness,
          isBootstrap: false,
        })
      : rawDecide;
  const afterNoAsk =
    afterPolicy && isNextQuestionDecision(afterPolicy)
      ? applyNoAskPolicy({
          decision: afterPolicy,
          living: processed.living,
          gapState,
          turns: processed.loop.turns,
          memory: processed.memory,
          stageReadiness,
        })
      : afterPolicy;
  const resolved = resolveNextQuestionDecision({
    living: processed.living,
    turns: processed.loop.turns,
    memory: processed.memory,
    gapState,
    projectId: PROJECT_ID,
  });
  const resolvedGap =
    resolved && 'targetGapId' in resolved ? resolved.targetGapId : resolved?.targetGap ?? null;
  return {
    review,
    gapState,
    closed: getClosedGapIds(gapState),
    rawDecide: rawDecide?.targetGapId ?? null,
    afterPolicy: afterPolicy && isNextQuestionDecision(afterPolicy) ? afterPolicy.targetGapId : null,
    afterNoAsk: afterNoAsk && isNextQuestionDecision(afterNoAsk) ? afterNoAsk.targetGapId : null,
    resolved: resolvedGap,
    question: resolved?.questionText ?? '',
    extracted: review?.extractedFacts.map((fact) => fact.key) ?? [],
  };
}

function appendOnSlot(input: {
  gapId: string;
  issueId: string;
  answer: string;
  appliedAt: string;
  askedQuestionText: string;
  existingFactsByKey?: Record<string, string>;
}) {
  const semantic = interpretAnswerSemantics({
    answer: input.answer,
    askedIssueId: input.issueId,
    askedTargetGap: input.gapId,
    existingFactsByKey: input.existingFactsByKey,
  });
  appendLoopTurnWithReview(
    {
      issueId: input.issueId,
      answer: input.answer,
      appliedAt: input.appliedAt,
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((fact) => fact.key),
      targetGap: input.gapId,
      intent: semantic.intent,
      askedQuestionText: input.askedQuestionText,
    },
    {
      askedGapId: input.gapId,
      askedQuestionText: input.askedQuestionText,
      askedIssueId: input.issueId,
      userAnswer: input.answer,
      existingFactsByKey: input.existingFactsByKey,
      displayedQuestionText: input.askedQuestionText,
    },
    PROJECT_ID,
  );
  return runLoopAnswerProcessing({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
  });
}

function confirmBusinessYes() {
  const understanding = buildBusinessUnderstanding(LONG_SOURCE);
  const first = commitFirstAskAfterUnderstandingConfirm({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding,
    entities: null,
  });
  const question =
    first.lastDecision?.questionText ?? first.lockedAskSurface?.questionText ?? '';
  const confirmGapId =
    first.lastDecision?.confirmGapId ?? first.lastDecision?.targetGapId ?? 'businessOneLiner';
  const known =
    first.lastDecision?.confirmKnownValue?.trim() ||
    extractConfirmKnownValueFromQuestion(question) ||
    `${LONG_SOURCE.trim().replace(/\s+/g, ' ').slice(0, 79).trim()}…`;
  const askedGap = inferTargetGapFromQuestionText(question) ?? confirmGapId;
  const semantic = interpretAnswerSemantics({
    answer: known,
    askedIssueId: first.currentIssueId ?? 'bm_design',
    askedTargetGap: askedGap,
  });
  appendLoopTurnWithReview(
    {
      issueId: first.currentIssueId ?? 'bm_design',
      answer: known,
      appliedAt: '2026-10-05T02:30:00.000Z',
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((fact) => fact.key),
      targetGap: askedGap,
      intent: semantic.intent,
      askedQuestionText: question,
    },
    {
      askedGapId: askedGap,
      askedQuestionText: question,
      askedIssueId: first.currentIssueId ?? 'bm_design',
      userAnswer: known,
      displayedQuestionText: question,
    },
    PROJECT_ID,
  );
  const processed = runLoopAnswerProcessing({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding,
  });
  return { first, question, confirmGapId, known, askedGap, semantic, processed };
}

describe('Recovery 2 P0-2 — question loop', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    setAiPmAnswerFirstRoutingV1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
    stubSessionStorage();
    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(LONG_SOURCE, PROJECT_ID);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'issue',
      },
      PROJECT_ID,
    );
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    setAiPmAnswerFirstRoutingV1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('J1 priority — after business Confirm Yes, next required OPEN is customerPersona', () => {
    const { question, confirmGapId, processed } = confirmBusinessYes();
    expect(isBusinessUnderstandingConfirmQuestion(question)).toBe(true);
    expect(confirmGapId).toBe('businessOneLiner');
    const layers = nextLayers(processed);
    expect(layers.extracted).toEqual(['business']);
    expect(layers.closed).toContain('businessOneLiner');
    expect(layers.closed).not.toContain('customerPersona');
    expect(layers.rawDecide).toBe('customerPersona');
    expect(layers.afterPolicy).toBe('customerPersona');
    expect(layers.resolved).toBe('customerPersona');
    expect(layers.question).toMatch(/누구|고객/);
    expect(isGapAskable('customerPersona', layers.gapState)).toBe(true);
  });

  it('J2 CLOSED re-ask — next question never retargets a CLOSED Stage A gap', () => {
    const afterBusiness = confirmBusinessYes();
    const afterCustomer = appendOnSlot({
      gapId: 'customerPersona',
      issueId: 'customer_definition',
      answer: '방한 외국인',
      appliedAt: '2026-10-05T02:31:00.000Z',
      askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
    });
    const layers = nextLayers(afterCustomer);
    expect(layers.closed).toEqual(expect.arrayContaining(['businessOneLiner', 'customerPersona']));
    expect(layers.rawDecide).not.toBe('businessOneLiner');
    expect(layers.rawDecide).not.toBe('customerPersona');
    expect(layers.resolved).not.toBe('businessOneLiner');
    expect(layers.resolved).not.toBe('customerPersona');
    expect(isGapAskable('businessOneLiner', layers.gapState)).toBe(false);
    expect(isGapAskable('customerPersona', layers.gapState)).toBe(false);
    const nextOpen = STAGE_A_REQUIRED_GAPS.find((gap) => isGapAskable(gap, layers.gapState));
    expect(nextOpen).toBeTruthy();
    expect(layers.rawDecide).toBe(nextOpen);
    expect(layers.resolved).toBe(nextOpen);
    void afterBusiness;
  });

  it('J3 multi-fact — business source 관광객 does not close customer; customer write does not close payer/problem', () => {
    const afterBusiness = confirmBusinessYes();
    const businessReview = afterBusiness.processed.loop.turns.at(-1)?.review;
    expect(businessReview?.extractedFacts.some((fact) => fact.key === 'customer')).toBe(false);
    expect(getClosedGapIds(afterBusiness.processed.loop.gapState!)).not.toContain('customerPersona');

    const afterCustomer = appendOnSlot({
      gapId: 'customerPersona',
      issueId: 'customer_definition',
      answer: '방한 외국인',
      appliedAt: '2026-10-05T02:32:00.000Z',
      askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
    });
    const layers = nextLayers(afterCustomer);
    expect(layers.extracted).toEqual(['customer']);
    expect(layers.closed).toContain('customerPersona');
    expect(layers.closed).not.toContain('payer');
    expect(layers.closed).not.toContain('problemJtbd');
    expect(layers.gapState.gaps.businessOneLiner?.completeness).toBe('CLOSED');
  });

  it('J4 contradiction — on-slot customer correction does not reopen CLOSED as a free next ask', () => {
    confirmBusinessYes();
    appendOnSlot({
      gapId: 'customerPersona',
      issueId: 'customer_definition',
      answer: '방한 외국인',
      appliedAt: '2026-10-05T02:33:00.000Z',
      askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
    });
    const { review } = buildAnswerReview({
      turnId: 'p0-2-j4',
      askedGapId: 'customerPersona',
      askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
      askedIssueId: 'customer_definition',
      userAnswer: FOUNDER_CORRECTION,
      existingFactsByKey: { customer: '방한 외국인' },
      displayedQuestionText: '실제 사용자 / 고객은 누구인가요?',
    });
    expect(review.extractedFacts.some((fact) => fact.key === 'customer')).toBe(true);
    expect(review.extractedFacts.some((fact) => fact.key === 'business')).toBe(false);

    const afterCorrection = appendOnSlot({
      gapId: 'customerPersona',
      issueId: 'customer_definition',
      answer: FOUNDER_CORRECTION,
      appliedAt: '2026-10-05T02:34:00.000Z',
      askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
      existingFactsByKey: { customer: '방한 외국인' },
    });
    const layers = nextLayers(afterCorrection);
    expect(layers.closed).toContain('customerPersona');
    expect(layers.resolved).not.toBe('customerPersona');
    expect(layers.resolved).not.toBe('businessOneLiner');
  });

  it('J5 longitudinal — Stage A walk never re-asks CLOSED and never writes source into customer', () => {
    const afterBusiness = confirmBusinessYes();
    expect(nextLayers(afterBusiness.processed).resolved).toBe('customerPersona');

    const afterCustomer = appendOnSlot({
      gapId: 'customerPersona',
      issueId: 'customer_definition',
      answer: '방한 외국인',
      appliedAt: '2026-10-05T02:35:00.000Z',
      askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
    });
    const afterCustomerLayers = nextLayers(afterCustomer);
    expect(afterCustomerLayers.closed).toEqual(
      expect.arrayContaining(['businessOneLiner', 'customerPersona']),
    );
    const third = afterCustomerLayers.resolved;
    expect(third === 'payer' || third === 'problemJtbd').toBe(true);

    const thirdAnswer = third === 'payer' ? PAYER_ANSWER : PROBLEM_ANSWER;
    const thirdIssue = third === 'payer' ? 'bm_design' : 'problem_definition';
    const afterThird = appendOnSlot({
      gapId: third!,
      issueId: thirdIssue,
      answer: thirdAnswer,
      appliedAt: '2026-10-05T02:36:00.000Z',
      askedQuestionText: afterCustomerLayers.question,
    });
    const afterThirdLayers = nextLayers(afterThird);
    expect(afterThirdLayers.closed).toEqual(
      expect.arrayContaining(['businessOneLiner', 'customerPersona']),
    );
    expect(afterThirdLayers.resolved).not.toBe('businessOneLiner');
    expect(afterThirdLayers.resolved).not.toBe('customerPersona');
    expect(afterThirdLayers.resolved).not.toBe(third);
    const remaining = STAGE_A_REQUIRED_GAPS.filter((gap) =>
      isGapAskable(gap, afterThirdLayers.gapState),
    );
    expect(remaining.length).toBeGreaterThan(0);
    expect(afterThirdLayers.rawDecide).toBe(remaining[0]);
    const customerEvidence = (afterThirdLayers.gapState.gaps.customerPersona?.evidence ?? [])
      .map((item) => item.value)
      .join(' ');
    expect(customerEvidence).not.toMatch(/다양한 관광객이 늘며/);
    expect(loadAiPmLoopState(PROJECT_ID).gapState?.gaps.customerPersona?.completeness).toBe(
      'CLOSED',
    );
  });
});
