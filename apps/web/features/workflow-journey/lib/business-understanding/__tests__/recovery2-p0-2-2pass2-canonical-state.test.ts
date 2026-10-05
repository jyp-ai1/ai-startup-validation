/**
 * Recovery 2 P0-2 — CPO 2-Pass 2 canonical state.
 * Asserts review / gapState / lastDecision / snapshot.aiPmLoop,
 * not conversationMemory or UI copy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';
import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmAnswerFirstRoutingV1ForTest } from '../ai-pm-answer-first-routing-policy-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { decideNextQuestionFromReview } from '../decide-next-question-from-review';
import { evaluateStageReadiness, STAGE_A_REQUIRED_GAPS } from '../evaluate-stage-readiness';
import { inferTargetGapFromQuestionText } from '../gap-question-map';
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

const PROJECT_ID = 'recovery2-p0-2-2pass2';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const FOUNDER_CORRECTION = '방한 외국인이 아니라 내국인과 외국인 모두입니다.';

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

function resolvedGap(processed: ReturnType<typeof runLoopAnswerProcessing>) {
  const decision = resolveNextQuestionDecision({
    living: processed.living,
    turns: processed.loop.turns,
    memory: processed.memory,
    gapState: processed.loop.gapState,
    projectId: PROJECT_ID,
    persistLastDecision: true,
  });
  return {
    decision,
    gap: decision && 'targetGapId' in decision ? decision.targetGapId : decision?.targetGap ?? null,
    question: decision?.questionText ?? '',
  };
}

function appendOnSlot(
  gapId: string,
  issueId: string,
  answer: string,
  appliedAt: string,
  asked: string,
  existingFactsByKey?: Record<string, string>,
) {
  const semantic = interpretAnswerSemantics({
    answer,
    askedIssueId: issueId,
    askedTargetGap: gapId,
    existingFactsByKey,
  });
  appendLoopTurnWithReview(
    {
      issueId,
      answer,
      appliedAt,
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((fact) => fact.key),
      targetGap: gapId,
      intent: semantic.intent,
      askedQuestionText: asked,
    },
    {
      askedGapId: gapId,
      askedQuestionText: asked,
      askedIssueId: issueId,
      userAnswer: answer,
      displayedQuestionText: asked,
      existingFactsByKey,
    },
    PROJECT_ID,
  );
  return runLoopAnswerProcessing({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
  });
}

function confirmBusiness() {
  const understanding = buildBusinessUnderstanding(LONG_SOURCE);
  const first = commitFirstAskAfterUnderstandingConfirm({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding,
    entities: null,
  });
  const question =
    first.lastDecision?.questionText ?? first.lockedAskSurface?.questionText ?? '';
  const askedGap =
    inferTargetGapFromQuestionText(question) ??
    first.lastDecision?.confirmGapId ??
    'businessOneLiner';
  const known =
    first.lastDecision?.confirmKnownValue?.trim() ||
    extractConfirmKnownValueFromQuestion(question) ||
    `${LONG_SOURCE.trim().replace(/\s+/g, ' ').slice(0, 79).trim()}…`;
  const semantic = interpretAnswerSemantics({
    answer: known,
    askedIssueId: 'bm_design',
    askedTargetGap: askedGap,
  });
  appendLoopTurnWithReview(
    {
      issueId: 'bm_design',
      answer: known,
      appliedAt: '2026-10-05T03:10:00.000Z',
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((fact) => fact.key),
      targetGap: askedGap,
      intent: semantic.intent,
      askedQuestionText: question,
    },
    {
      askedGapId: askedGap,
      askedQuestionText: question,
      askedIssueId: 'bm_design',
      userAnswer: known,
      displayedQuestionText: question,
    },
    PROJECT_ID,
  );
  return {
    semantic,
    askedGap,
    processed: runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    }),
  };
}

describe('Recovery 2 P0-2 — CPO 2-Pass 2 canonical state', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    setAiPmAnswerFirstRoutingV1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
    stubSessionStorage();
    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(LONG_SOURCE, PROJECT_ID);
    patchAiPmLoopState(
      { readingCompleted: true, dismissedReadAck: true, phase: 'issue' },
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

  it('1. Confirm Yes review/gapState/lastDecision stay on business → customer', () => {
    const { processed, semantic, askedGap } = confirmBusiness();
    const turn = processed.loop.turns.at(-1);
    expect(askedGap).toBe('businessOneLiner');
    expect(turn?.review?.askedGapId).toBe('businessOneLiner');
    expect(semantic.factKey).toBe('business');
    expect(semantic.intent).toBe('business_fact');
    expect(turn?.semanticFactKey).toBe('business');
    expect(turn?.intent).toBe('business_fact');
    expect(turn?.review?.extractedFacts.map((fact) => fact.key)).toEqual(['business']);
    expect(getClosedGapIds(processed.loop.gapState!)).toEqual(['businessOneLiner']);
    expect(processed.loop.gapState?.gaps.customerPersona?.completeness ?? 'OPEN').not.toBe(
      'CLOSED',
    );
    const next = resolvedGap(processed);
    expect(next.gap).toBe('customerPersona');
    expect(next.question).toMatch(/누구|고객/);
    expect(loadAiPmLoopState(PROJECT_ID).lastDecision?.targetGapId).toBe('customerPersona');
  });

  it('2. customer CLOSED then lastDecision is the first remaining OPEN Stage A gap', () => {
    confirmBusiness();
    const processed = appendOnSlot(
      'customerPersona',
      'customer_definition',
      '방한 외국인',
      '2026-10-05T03:11:00.000Z',
      '실제 사용자 / 고객은 누구인가요?',
    );
    const turn = processed.loop.turns.at(-1);
    expect(turn?.review?.askedGapId).toBe('customerPersona');
    expect(turn?.semanticFactKey).toBe('customer');
    expect(turn?.review?.extractedFacts.map((fact) => fact.key)).toEqual(['customer']);
    expect(getClosedGapIds(processed.loop.gapState!)).toEqual(
      expect.arrayContaining(['businessOneLiner', 'customerPersona']),
    );
    const nextOpen = STAGE_A_REQUIRED_GAPS.find((gap) =>
      isGapAskable(gap, processed.loop.gapState!),
    );
    expect(nextOpen).toBeTruthy();
    const raw = decideNextQuestionFromReview({
      living: processed.living,
      turns: processed.loop.turns,
      memory: processed.memory,
      lastReview: turn?.review ?? null,
      gapState: processed.loop.gapState!,
      stageReadiness: evaluateStageReadiness({
        gapState: processed.loop.gapState!,
        turns: processed.loop.turns,
      }),
    });
    expect(raw?.targetGapId).toBe(nextOpen);
    expect(resolvedGap(processed).gap).toBe(nextOpen);
    expect(loadAiPmLoopState(PROJECT_ID).lastDecision?.targetGapId).toBe(nextOpen);
    expect(nextOpen === 'payer' || nextOpen === 'problemJtbd').toBe(true);
  });

  it('3. next Stage A write cannot reopen CLOSED customer or rewrite source into customer evidence', () => {
    confirmBusiness();
    const afterCustomer = appendOnSlot(
      'customerPersona',
      'customer_definition',
      '방한 외국인',
      '2026-10-05T03:12:00.000Z',
      '실제 사용자 / 고객은 누구인가요?',
    );
    const third = resolvedGap(afterCustomer).gap;
    expect(third === 'payer' || third === 'problemJtbd').toBe(true);
    const processed = appendOnSlot(
      third!,
      third === 'payer' ? 'bm_design' : 'problem_definition',
      third === 'payer'
        ? '체험 예약은 관광객이 결제합니다.'
        : '양조장마다 홍보 채널이 달라 관광객이 체험을 찾기 어렵습니다.',
      '2026-10-05T03:13:00.000Z',
      afterCustomer.loop.lastDecision?.questionText ?? '',
    );
    expect(processed.loop.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(processed.loop.gapState?.gaps.businessOneLiner?.completeness).toBe('CLOSED');
    const evidence = (processed.loop.gapState?.gaps.customerPersona?.evidence ?? [])
      .map((item) => item.value)
      .join(' ');
    expect(evidence).toMatch(/방한 외국인/);
    expect(evidence).not.toMatch(/다양한 관광객이 늘며/);
    expect(resolvedGap(processed).gap).not.toBe('customerPersona');
    expect(resolvedGap(processed).gap).not.toBe('businessOneLiner');
    expect(loadAiPmLoopState(PROJECT_ID).lastDecision?.targetGapId).not.toBe('customerPersona');
  });

  it('4. snapshot → cache hydrate keeps lastDecision and CLOSED, not conversationMemory alone', () => {
    confirmBusiness();
    const afterCustomer = appendOnSlot(
      'customerPersona',
      'customer_definition',
      '방한 외국인',
      '2026-10-05T03:14:00.000Z',
      '실제 사용자 / 고객은 누구인가요?',
    );
    const nextOpen = resolvedGap(afterCustomer).gap;
    const snapshot = buildWorkspacePersistedSnapshot(PROJECT_ID);
    expect(snapshot.aiPmLoop?.gapState?.gaps.businessOneLiner?.completeness).toBe('CLOSED');
    expect(snapshot.aiPmLoop?.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(snapshot.aiPmLoop?.lastDecision?.targetGapId).toBe(nextOpen);
    expect(
      (snapshot.aiPmLoop?.gapState?.gaps.customerPersona?.evidence ?? [])
        .map((item) => item.value)
        .join(' '),
    ).not.toMatch(/다양한 관광객이 늘며/);

    sessionStorage.clear();
    applyWorkspaceSnapshotToCache(PROJECT_ID, snapshot);

    const hydrated = loadAiPmLoopState(PROJECT_ID);
    expect(hydrated.gapState?.gaps.businessOneLiner?.completeness).toBe('CLOSED');
    expect(hydrated.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(hydrated.lastDecision?.targetGapId).toBe(nextOpen);
    expect(hydrated.lastDecision?.targetGapId).not.toBe('customerPersona');
    expect(hydrated.lastDecision?.targetGapId).not.toBe('businessOneLiner');
  });

  it('5. on-slot customer correction does not retarget lastDecision to CLOSED customer', () => {
    confirmBusiness();
    appendOnSlot(
      'customerPersona',
      'customer_definition',
      '방한 외국인',
      '2026-10-05T03:15:00.000Z',
      '실제 사용자 / 고객은 누구인가요?',
    );
    const processed = appendOnSlot(
      'customerPersona',
      'customer_definition',
      FOUNDER_CORRECTION,
      '2026-10-05T03:16:00.000Z',
      '실제 사용자 / 고객은 누구인가요?',
      { customer: '방한 외국인' },
    );
    const turn = processed.loop.turns.at(-1);
    expect(turn?.review?.askedGapId).toBe('customerPersona');
    expect(turn?.review?.extractedFacts.some((fact) => fact.key === 'customer')).toBe(true);
    expect(turn?.review?.extractedFacts.some((fact) => fact.key === 'business')).toBe(false);
    expect(processed.loop.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(resolvedGap(processed).gap).not.toBe('customerPersona');
    expect(resolvedGap(processed).gap).not.toBe('businessOneLiner');
    expect(loadAiPmLoopState(PROJECT_ID).lastDecision?.targetGapId).not.toBe('customerPersona');
  });
});
