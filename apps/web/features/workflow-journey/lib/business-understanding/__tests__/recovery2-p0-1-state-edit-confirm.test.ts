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
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
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
