import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyWorkspaceSnapshotToCache,
  isUnderstandingPhaseRegression,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';
import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import {
  canonicalizeCorrectedCustomerPersona,
  extractCorrectedFactValue,
  parseNotXButYCorrection,
} from '../ai-pm-correction-semantics';
import { buildAnswerReview } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import {
  loadUnderstandingPhase,
  saveUnderstandingPhase,
} from '../business-understanding-store';
import { getFact } from '../conversation-memory';
import { loadConversationMemory } from '../conversation-memory-store';
import { setAiPmAnswerFirstRoutingV1ForTest } from '../ai-pm-answer-first-routing-policy-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import {
  inferTargetGapFromQuestionText,
  isBusinessUnderstandingConfirmQuestion,
} from '../gap-question-map';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { extractConfirmKnownValueFromQuestion } from '../ai-pm-question-presentation';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
import { resolveAskedTargetGapForAppend } from '../resolve-asked-target-gap';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import {
  composeUnderstoodNarrative,
} from '../../ux-flow-recovery/build-ux-business-summary';
import { resolveBusinessSourceText, resolveProjectDisplayTitle } from '../../ux-flow-recovery/resolve-project-display-title';
import { commitFirstAskAfterUnderstandingConfirm } from '../understanding-confirm-ask-transition';
import { customerPersonaReplacesPrior } from '../understanding-contract';
import { getClosedGapIds } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  createInitialAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
  saveAiPmLoopState,
  supersedeTurnAndInvalidateDownstream,
} from '../workspace-ai-pm-loop-store';
import { AI_PM_LOOP_ISSUE_ORDER } from '../workspace-ai-pm-loop-types';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const SEED = `프로젝트 이름: ${TITLE}\n\n사업 설명:\n${LONG_SOURCE}`;
const PROJECT_ID = 'recovery2-p0-1';
const PRIOR_INFERRED = '방한 외국인';
const FOUNDER_CORRECTION = '방한 외국인이 아니라 내국인과 외국인 모두입니다.';
const CONFIRMED_PERSONA = '내국인·외국인';
const EDITED_PERSONA = '전통주 양조장 체험객';

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

function currentCustomer(projectId: string): string {
  return getFact(loadConversationMemory(projectId), 'customer')?.value ?? '';
}

function livingCustomer(turns: AiPmLoopTurn[]) {
  const memory = buildConversationMemoryFromSources({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    turns,
    previous: loadConversationMemory(PROJECT_ID),
  });
  const living = buildLivingUnderstandingState({
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
    turns,
    memory,
  });
  return {
    memory,
    living,
    persona: living.claims.find((c) => c.fieldKey === 'customerPersona')?.value ?? '',
    spine: living.spine.customer,
  };
}

describe('Recovery 2 P0-1 — state / edit / confirm', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    stubSessionStorage();
    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(LONG_SOURCE, PROJECT_ID);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('J1 정상 — Source ≠ AI interpretation, confirm opens the next question', () => {
    expect(resolveProjectDisplayTitle({ projectTitle: TITLE, seedDocument: SEED })).toBe(TITLE);
    const source = resolveBusinessSourceText({ seedDocument: SEED });
    expect(source).toContain('다양한 관광객이 늘며');
    expect(source).toContain('온라인 마케팅');
    expect(source).not.toBe(TITLE);

    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    const living = buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding,
    });
    const narrative = composeUnderstoodNarrative(living, LONG_SOURCE);
    expect(narrative).not.toBe(LONG_SOURCE);
    expect(narrative).toMatch(/이해했습니다/);
    expect(LONG_SOURCE).not.toMatch(/방한 외국인/);
    expect(understanding.customerMentions.map((m) => m.label).join(' ')).not.toMatch(/방한 외국인/);

    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'issue',
      },
      PROJECT_ID,
    );
    saveUnderstandingPhase('accepted', PROJECT_ID);
    const next = commitFirstAskAfterUnderstandingConfirm({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
      entities: null,
    });
    expect(next.phase).toBe('answer');
    expect(next.lockedAskSurface?.questionText?.trim().length).toBeGreaterThan(4);
    expect(isUnderstandingPhaseRegression('accepted', 'pending')).toBe(true);
  });

  it('J2 긴 correction — 방한 외국인 → 내국인·외국인, never truncated', () => {
    expect(parseNotXButYCorrection(FOUNDER_CORRECTION)).toEqual({
      rejected: '방한 외국인',
      accepted: '내국인과 외국인 모두',
    });
    expect(extractCorrectedFactValue('customer', FOUNDER_CORRECTION)).toBe(CONFIRMED_PERSONA);
    expect(canonicalizeCorrectedCustomerPersona('내국인과 외국인 모두')).toBe(CONFIRMED_PERSONA);
    expect(customerPersonaReplacesPrior(PRIOR_INFERRED, FOUNDER_CORRECTION)).toBe(true);

    const semantic = interpretAnswerSemantics({
      answer: FOUNDER_CORRECTION,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
      existingFactsByKey: { customer: PRIOR_INFERRED },
    });
    expect(semantic.intent).toBe('correction');
    expect(semantic.value).toBe(CONFIRMED_PERSONA);
    expect(semantic.value).not.toBe('외국인');
    expect(semantic.value).not.toMatch(/방한/);

    const { review } = buildAnswerReview({
      turnId: 'j2',
      userAnswer: FOUNDER_CORRECTION,
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      existingFactsByKey: { customer: PRIOR_INFERRED },
    });
    expect(review.extractedFacts.find((f) => f.key === 'customer')?.value).toBe(CONFIRMED_PERSONA);

    saveAiPmLoopState(createInitialAiPmLoopState(), PROJECT_ID);
    const loop = appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: FOUNDER_CORRECTION,
        appliedAt: '2026-10-04T12:00:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: FOUNDER_CORRECTION,
        existingFactsByKey: { customer: PRIOR_INFERRED },
      },
      PROJECT_ID,
    );
    const processed = runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });
    const customer = processed.memory.facts.find(
      (f) => f.key === 'customer' && (f.lifecycle ?? 'current') === 'current',
    );
    expect(customer?.value).toBe(CONFIRMED_PERSONA);
    expect(processed.living.spine.customer).toBe(CONFIRMED_PERSONA);
    expect(processed.living.claims.find((c) => c.fieldKey === 'customerPersona')?.value).toBe(
      CONFIRMED_PERSONA,
    );
    expect(loop.gapState ? getClosedGapIds(loop.gapState) : []).toContain('customerPersona');
  });

  it('J3 수정 후 재진입 — refresh keeps the same confirmed value', () => {
    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: FOUNDER_CORRECTION,
        appliedAt: '2026-10-04T12:01:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: FOUNDER_CORRECTION,
        existingFactsByKey: { customer: PRIOR_INFERRED },
      },
      PROJECT_ID,
    );
    runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });
    saveUnderstandingPhase('accepted', PROJECT_ID);
    expect(currentCustomer(PROJECT_ID)).toBe(CONFIRMED_PERSONA);

    const snapshot = buildWorkspacePersistedSnapshot(PROJECT_ID);
    expect(snapshot.conversationMemory?.facts.some((f) => f.value === CONFIRMED_PERSONA)).toBe(true);

    sessionStorage.clear();
    applyWorkspaceSnapshotToCache(PROJECT_ID, snapshot);

    expect(loadUnderstandingPhase(PROJECT_ID)).toBe('accepted');
    expect(currentCustomer(PROJECT_ID)).toBe(CONFIRMED_PERSONA);
    const hydrated = loadAiPmLoopState(PROJECT_ID);
    const replay = livingCustomer(hydrated.turns);
    expect(replay.persona).toBe(CONFIRMED_PERSONA);
    expect(replay.spine).toBe(CONFIRMED_PERSONA);
    expect(replay.spine).not.toMatch(/방한 외국인/);
  });

  it('J4 confirmed regression — next turn cannot reopen CLOSED customerPersona', () => {
    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: FOUNDER_CORRECTION,
        appliedAt: '2026-10-04T12:02:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: FOUNDER_CORRECTION,
        existingFactsByKey: { customer: PRIOR_INFERRED },
      },
      PROJECT_ID,
    );
    const afterConfirm = loadAiPmLoopState(PROJECT_ID);
    expect(getClosedGapIds(afterConfirm.gapState!)).toContain('customerPersona');

    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '체험 예약은 관광객이 결제합니다.',
        appliedAt: '2026-10-04T12:03:00.000Z',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        targetGap: 'payer',
        intent: 'business_fact',
      },
      {
        askedGapId: 'payer',
        askedIssueId: 'bm_design',
        userAnswer: '체험 예약은 관광객이 결제합니다.',
      },
      PROJECT_ID,
    );
    runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });

    const afterNext = loadAiPmLoopState(PROJECT_ID);
    expect(afterNext.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(afterNext.gapState?.gaps.customerPersona?.completeness).not.toBe('OPEN');
    expect(currentCustomer(PROJECT_ID)).toBe(CONFIRMED_PERSONA);
  });

  it('J5 edit — 이전 답변 수정 saves the new value and keeps it after remount', () => {
    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: PRIOR_INFERRED,
        appliedAt: '2026-10-04T12:04:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'business_fact',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: PRIOR_INFERRED,
      },
      PROJECT_ID,
    );
    runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });

    const edited = supersedeTurnAndInvalidateDownstream(
      'customer_definition',
      AI_PM_LOOP_ISSUE_ORDER,
      PROJECT_ID,
    );
    expect(edited.turns.every((turn) => turn.superseded || turn.issueId !== 'customer_definition')).toBe(
      true,
    );
    expect(getClosedGapIds(edited.gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} })).not.toContain(
      'customerPersona',
    );

    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: EDITED_PERSONA,
        appliedAt: '2026-10-04T12:05:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: EDITED_PERSONA,
      },
      PROJECT_ID,
    );
    runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });
    expect(currentCustomer(PROJECT_ID)).toBe(EDITED_PERSONA);

    const snapshot = buildWorkspacePersistedSnapshot(PROJECT_ID);
    sessionStorage.clear();
    applyWorkspaceSnapshotToCache(PROJECT_ID, snapshot);
    expect(currentCustomer(PROJECT_ID)).toBe(EDITED_PERSONA);
    expect(currentCustomer(PROJECT_ID)).not.toBe(PRIOR_INFERRED);
    const remount = livingCustomer(loadAiPmLoopState(PROJECT_ID).turns);
    expect(remount.persona).toBe(EDITED_PERSONA);
    expect(remount.spine).toBe(EDITED_PERSONA);
  });
});

function clippedBusinessSource(): string {
  return `${LONG_SOURCE.trim().replace(/\s+/g, ' ').slice(0, 79).trim()}…`;
}

function productionBusinessConfirmQuestion(): string {
  return `제가 이해한 사업은 「${clippedBusinessSource()}」입니다. 맞나요?`;
}

function appendProductionBusinessConfirmYes(appliedAt: string) {
  const known = clippedBusinessSource();
  const question = productionBusinessConfirmQuestion();
  return appendLoopTurnWithReview(
    {
      issueId: 'bm_design',
      answer: known,
      appliedAt,
      semanticFactKey: 'business',
      semanticFactKeys: ['business'],
      targetGap: 'businessOneLiner',
      intent: 'business_fact',
      askedQuestionText: question,
    },
    {
      askedGapId: 'businessOneLiner',
      askedQuestionText: question,
      askedIssueId: 'bm_design',
      userAnswer: known,
      displayedQuestionText: question,
    },
    PROJECT_ID,
  );
}

/**
 * Production f8f13cf path: handleConfirmYes submits confirmKnownValue (clipped source),
 * not the CTA label "네, 맞습니다".
 */
function simulateProductionConfirmYes(projectId: string) {
  const loop = loadAiPmLoopState(projectId);
  const questionText =
    loop.lastDecision?.questionText ?? loop.lockedAskSurface?.questionText ?? '';
  const confirmGapId =
    loop.lastDecision?.confirmGapId ??
    loop.lastDecision?.targetGapId ??
    loop.lockedAskSurface?.targetGap ??
    null;
  const known =
    loop.lastDecision?.confirmKnownValue?.trim() ||
    extractConfirmKnownValueFromQuestion(questionText) ||
    '';
  const inferred = inferTargetGapFromQuestionText(questionText);
  const askedTargetGap = resolveAskedTargetGapForAppend({
    issueId: loop.currentIssueId ?? 'bm_design',
    whyTargetGap: inferred ?? confirmGapId,
    questionText,
    fallbackTargetGap: confirmGapId,
  });
  const visibleGap = inferred ?? askedTargetGap;
  const semantic = interpretAnswerSemantics({
    answer: known,
    askedIssueId: loop.currentIssueId ?? 'bm_design',
    askedTargetGap: visibleGap,
  });
  const { review } = buildAnswerReview({
    turnId: 'j6-confirm-yes',
    askedGapId: visibleGap ?? askedTargetGap,
    askedQuestionText: questionText,
    askedIssueId: loop.currentIssueId ?? 'bm_design',
    userAnswer: known,
    displayedQuestionText: questionText,
  });
  return {
    questionText,
    confirmGapId,
    known,
    inferred,
    askedTargetGap,
    visibleGap,
    semantic,
    review,
    issueId: loop.currentIssueId ?? 'bm_design',
  };
}

describe('Recovery 2 P0-1 — Production J6/J7/J8 business confirm slot', () => {
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
    saveUnderstandingPhase('accepted', PROJECT_ID);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    setAiPmAnswerFirstRoutingV1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('J6 Business Confirmation — Confirm Yes closes business, leaves customerPersona OPEN', () => {
    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    const first = commitFirstAskAfterUnderstandingConfirm({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
      entities: null,
    });
    const firstQuestion =
      first.lastDecision?.questionText ?? first.lockedAskSurface?.questionText ?? '';
    expect(isBusinessUnderstandingConfirmQuestion(firstQuestion)).toBe(true);
    expect(inferTargetGapFromQuestionText(firstQuestion)).toBe('businessOneLiner');

    const clippedSource = `${LONG_SOURCE.trim().replace(/\s+/g, ' ').slice(0, 79).trim()}…`;
    const productionQuestion = `제가 이해한 사업은 「${clippedSource}」입니다. 맞나요?`;
    expect(isBusinessUnderstandingConfirmQuestion(productionQuestion)).toBe(true);
    expect(inferTargetGapFromQuestionText(productionQuestion)).toBe('businessOneLiner');

    const sourceYes = interpretAnswerSemantics({
      answer: clippedSource,
      askedIssueId: 'bm_design',
      askedTargetGap: inferTargetGapFromQuestionText(productionQuestion),
    });
    expect(sourceYes.factKey).toBe('business');
    expect(sourceYes.facts.map((f) => f.key)).toEqual(['business']);
    const sourceReview = buildAnswerReview({
      turnId: 'j6-source-confirm',
      askedGapId: 'businessOneLiner',
      askedQuestionText: productionQuestion,
      askedIssueId: 'bm_design',
      userAnswer: clippedSource,
      displayedQuestionText: productionQuestion,
    }).review;
    expect(sourceReview.extractedFacts.some((f) => f.key === 'customer')).toBe(false);
    expect(sourceReview.gapVerdicts.customerPersona?.completeness).not.toBe('CLOSED');
    expect(sourceReview.gapVerdicts.businessOneLiner?.completeness).toBe('CLOSED');

    const path = simulateProductionConfirmYes(PROJECT_ID);
    expect(path.known.length).toBeGreaterThan(4);
    expect(path.inferred).toBe('businessOneLiner');
    expect(path.visibleGap).toBe('businessOneLiner');
    expect(path.askedTargetGap).toBe('businessOneLiner');
    expect(path.semantic.factKey).toBe('business');
    expect(path.semantic.facts.map((f) => f.key)).toEqual(['business']);
    expect(path.semantic.facts.some((f) => f.key === 'customer')).toBe(false);
    expect(path.review.askedGapId).toBe('businessOneLiner');
    expect(path.review.extractedFacts.some((f) => f.key === 'customer')).toBe(false);
    expect(path.review.gapVerdicts.businessOneLiner?.completeness).toBe('CLOSED');
    expect(path.review.gapVerdicts.customerPersona?.completeness).not.toBe('CLOSED');

    const loop = appendLoopTurnWithReview(
      {
        issueId: path.issueId,
        answer: path.known,
        appliedAt: '2026-10-04T18:00:00.000Z',
        semanticFactKey: path.semantic.factKey,
        semanticFactKeys: path.semantic.facts.map((f) => f.key),
        targetGap: path.visibleGap,
        intent: path.semantic.intent,
        askedQuestionText: path.questionText,
      },
      {
        askedGapId: path.visibleGap,
        askedQuestionText: path.questionText,
        askedIssueId: path.issueId,
        userAnswer: path.known,
        displayedQuestionText: path.questionText,
      },
      PROJECT_ID,
    );

    const processed = runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    });

    expect(getClosedGapIds(loop.gapState!)).toContain('businessOneLiner');
    expect(getClosedGapIds(loop.gapState!)).not.toContain('customerPersona');
    expect(loop.gapState?.gaps.customerPersona?.completeness ?? 'OPEN').not.toBe('CLOSED');
    const customerEvidence = (loop.gapState?.gaps.customerPersona?.evidence ?? [])
      .map((item) => item.value)
      .join(' ');
    expect(customerEvidence).not.toMatch(/다양한 관광객이 늘며/);
    expect(currentCustomer(PROJECT_ID)).not.toMatch(/다양한 관광객이 늘며/);
    expect(processed.living.spine.customer).not.toMatch(/다양한 관광객이 늘며/);

    const next = resolveNextQuestionDecision({
      living: processed.living,
      turns: processed.loop.turns,
      memory: processed.memory,
      gapState: processed.loop.gapState,
      projectId: PROJECT_ID,
      persistLastDecision: true,
    });
    expect(isBusinessUnderstandingConfirmQuestion(next?.questionText)).toBe(false);
    expect(processed.loop.gapState?.gaps.customerPersona?.completeness ?? 'OPEN').not.toBe(
      'CLOSED',
    );
  });

  it('J7 Customer Correction — 방한 외국인 → 내국인·외국인 after business confirm', () => {
    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    commitFirstAskAfterUnderstandingConfirm({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
      entities: null,
    });
    appendProductionBusinessConfirmYes('2026-10-04T18:01:00.000Z');
    runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    });
    expect(getClosedGapIds(loadAiPmLoopState(PROJECT_ID).gapState!)).not.toContain(
      'customerPersona',
    );

    const onSlotCorrection = interpretAnswerSemantics({
      answer: FOUNDER_CORRECTION,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
      existingFactsByKey: { customer: PRIOR_INFERRED },
    });
    expect(onSlotCorrection.intent).toBe('correction');
    expect(onSlotCorrection.factKey).toBe('customer');
    expect(onSlotCorrection.value).toBe(CONFIRMED_PERSONA);

    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: FOUNDER_CORRECTION,
        appliedAt: '2026-10-04T18:03:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: FOUNDER_CORRECTION,
        existingFactsByKey: { customer: PRIOR_INFERRED },
        displayedQuestionText: '실제 사용자 / 고객은 누구인가요?',
      },
      PROJECT_ID,
    );
    const processed = runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    });

    expect(currentCustomer(PROJECT_ID)).toBe(CONFIRMED_PERSONA);
    expect(processed.living.spine.customer).toBe(CONFIRMED_PERSONA);
    expect(processed.living.claims.find((c) => c.fieldKey === 'customerPersona')?.value).toBe(
      CONFIRMED_PERSONA,
    );
    expect(getClosedGapIds(loadAiPmLoopState(PROJECT_ID).gapState!)).toContain('customerPersona');

    const snapshot = buildWorkspacePersistedSnapshot(PROJECT_ID);
    sessionStorage.clear();
    applyWorkspaceSnapshotToCache(PROJECT_ID, snapshot);
    expect(currentCustomer(PROJECT_ID)).toBe(CONFIRMED_PERSONA);
    expect(livingCustomer(loadAiPmLoopState(PROJECT_ID).turns).spine).toBe(CONFIRMED_PERSONA);
  });

  it('J8 Cross-slot — business / customer / payer / problem stay uncontaminated', () => {
    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    commitFirstAskAfterUnderstandingConfirm({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
      entities: null,
    });
    appendProductionBusinessConfirmYes('2026-10-04T18:04:00.000Z');
    appendLoopTurnWithReview(
      {
        issueId: 'customer_definition',
        answer: FOUNDER_CORRECTION,
        appliedAt: '2026-10-04T18:05:00.000Z',
        semanticFactKey: 'customer',
        semanticFactKeys: ['customer'],
        targetGap: 'customerPersona',
        intent: 'correction',
      },
      {
        askedGapId: 'customerPersona',
        askedIssueId: 'customer_definition',
        userAnswer: FOUNDER_CORRECTION,
        existingFactsByKey: { customer: PRIOR_INFERRED },
        askedQuestionText: '실제 사용자 / 고객은 누구인가요?',
        displayedQuestionText: '실제 사용자 / 고객은 누구인가요?',
      },
      PROJECT_ID,
    );
    appendLoopTurnWithReview(
      {
        issueId: 'bm_design',
        answer: '체험 예약은 관광객이 결제합니다.',
        appliedAt: '2026-10-04T18:06:00.000Z',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        targetGap: 'payer',
        intent: 'business_fact',
      },
      {
        askedGapId: 'payer',
        askedIssueId: 'bm_design',
        userAnswer: '체험 예약은 관광객이 결제합니다.',
        askedQuestionText: '서비스 비용은 누가 지불하나요?',
        displayedQuestionText: '서비스 비용은 누가 지불하나요?',
      },
      PROJECT_ID,
    );
    appendLoopTurnWithReview(
      {
        issueId: 'problem_definition',
        answer: '양조장이 온라인으로 손님을 모으지 못해 빈 시간이 생깁니다.',
        appliedAt: '2026-10-04T18:07:00.000Z',
        semanticFactKey: 'problem',
        semanticFactKeys: ['problem'],
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
      {
        askedGapId: 'problemJtbd',
        askedIssueId: 'problem_definition',
        userAnswer: '양조장이 온라인으로 손님을 모으지 못해 빈 시간이 생깁니다.',
        askedQuestionText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
        displayedQuestionText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
      },
      PROJECT_ID,
    );

    const processed = runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    });
    const memory = processed.memory;
    const business = getFact(memory, 'business')?.value ?? '';
    const customer = getFact(memory, 'customer')?.value ?? '';
    const payer = getFact(memory, 'buyer')?.value ?? '';
    const problem = getFact(memory, 'problem')?.value ?? '';

    expect(business).toMatch(/다양한 관광객이 늘며/);
    expect(customer).toBe(CONFIRMED_PERSONA);
    expect(payer).toMatch(/관광객이 결제/);
    expect(problem).toMatch(/빈 시간/);
    expect(customer).not.toBe(business);
    expect(customer).not.toBe(payer);
    expect(customer).not.toBe(problem);
    expect(payer).not.toBe(business);
    expect(problem).not.toBe(business);
    expect(problem).not.toBe(payer);

    const gaps = loadAiPmLoopState(PROJECT_ID).gapState?.gaps ?? {};
    expect(gaps.businessOneLiner?.completeness).toBe('CLOSED');
    expect(gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(gaps.payer?.completeness).toBe('CLOSED');
    expect(gaps.problemJtbd?.completeness).toBe('CLOSED');
    expect((gaps.customerPersona?.evidence ?? []).map((e) => e.value).join(' ')).toBe(
      CONFIRMED_PERSONA,
    );
    expect((gaps.customerPersona?.evidence ?? []).map((e) => e.value).join(' ')).not.toMatch(
      /다양한 관광객이 늘며/,
    );
  });
});
