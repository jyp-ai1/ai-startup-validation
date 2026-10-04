/**
 * Recovery 2 P0-1 — CPO 2-Pass 2 independent verification.
 * Asserts canonical artifacts (review / gapState / living / snapshot.aiPmLoop),
 * not conversationMemory or UI copy alone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';
import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { getFact } from '../conversation-memory';
import { loadConversationMemory } from '../conversation-memory-store';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
import { getClosedGapIds } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  supersedeTurnAndInvalidateDownstream,
} from '../workspace-ai-pm-loop-store';
import { AI_PM_LOOP_ISSUE_ORDER } from '../workspace-ai-pm-loop-types';

const PROJECT_ID = 'recovery2-p0-1-2pass2';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const PRIOR_INFERRED = '방한 외국인';
const FOUNDER_CORRECTION = '방한 외국인이 아니라 내국인과 외국인 모두입니다.';
const CONFIRMED_PERSONA = '내국인·외국인';
const EDITED_PERSONA = '전통주 양조장 체험객';
const PAYER_ANSWER = '체험 예약은 관광객이 결제합니다.';

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

function gapEvidence(gapId: string): string[] {
  return (loadAiPmLoopState(PROJECT_ID).gapState?.gaps[gapId]?.evidence ?? []).map(
    (item) => item.value,
  );
}

function activeCustomerReviews(): string[] {
  return loadAiPmLoopState(PROJECT_ID)
    .turns.filter((turn) => !turn.superseded && turn.review)
    .flatMap((turn) => turn.review!.extractedFacts.filter((fact) => fact.key === 'customer'))
    .map((fact) => fact.value);
}

function livingFromLoop() {
  const loop = loadAiPmLoopState(PROJECT_ID);
  const memory = loadConversationMemory(PROJECT_ID);
  return buildLivingUnderstandingState({
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
    turns: loop.turns,
    memory,
  });
}

function appendCustomer(answer: string, appliedAt: string, intent: 'correction' | 'business_fact') {
  return appendLoopTurnWithReview(
    {
      issueId: 'customer_definition',
      answer,
      appliedAt,
      semanticFactKey: 'customer',
      semanticFactKeys: ['customer'],
      targetGap: 'customerPersona',
      intent,
    },
    {
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      userAnswer: answer,
      existingFactsByKey:
        intent === 'correction' ? { customer: PRIOR_INFERRED } : undefined,
    },
    PROJECT_ID,
  );
}

function appendPayer(appliedAt: string) {
  return appendLoopTurnWithReview(
    {
      issueId: 'bm_design',
      answer: PAYER_ANSWER,
      appliedAt,
      semanticFactKey: 'buyer',
      semanticFactKeys: ['buyer'],
      targetGap: 'payer',
      intent: 'business_fact',
    },
    {
      askedGapId: 'payer',
      askedIssueId: 'bm_design',
      userAnswer: PAYER_ANSWER,
    },
    PROJECT_ID,
  );
}

function process() {
  return runLoopAnswerProcessing({
    projectId: PROJECT_ID,
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
  });
}

describe('Recovery 2 P0-1 — CPO 2-Pass 2 canonical state', () => {
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

  it('1. explicit edit rebuilds gapState and drops prior review evidence', () => {
    appendCustomer(PRIOR_INFERRED, '2026-10-04T13:00:00.000Z', 'business_fact');
    process();
    expect(getClosedGapIds(loadAiPmLoopState(PROJECT_ID).gapState!)).toContain('customerPersona');
    expect(gapEvidence('customerPersona').join(' ')).toMatch(/방한 외국인/);

    const afterEdit = supersedeTurnAndInvalidateDownstream(
      'customer_definition',
      AI_PM_LOOP_ISSUE_ORDER,
      PROJECT_ID,
    );
    expect(afterEdit.turns.filter((turn) => !turn.superseded)).toHaveLength(0);
    expect(getClosedGapIds(afterEdit.gapState!)).not.toContain('customerPersona');
    expect(gapEvidence('customerPersona').join(' ')).not.toMatch(/방한 외국인/);
    expect(activeCustomerReviews()).toEqual([]);

    appendCustomer(EDITED_PERSONA, '2026-10-04T13:01:00.000Z', 'correction');
    process();
    expect(gapEvidence('customerPersona').join(' ')).toContain(EDITED_PERSONA);
    expect(gapEvidence('customerPersona').join(' ')).not.toMatch(/방한 외국인/);
    expect(activeCustomerReviews()).toEqual([EDITED_PERSONA]);
    expect(activeCustomerReviews()).not.toContain(PRIOR_INFERRED);
  });

  it('2. next turn cannot overwrite correction with AI inference', () => {
    appendCustomer(FOUNDER_CORRECTION, '2026-10-04T13:02:00.000Z', 'correction');
    process();
    appendPayer('2026-10-04T13:03:00.000Z');
    const processed = process();

    const payerReview = loadAiPmLoopState(PROJECT_ID).turns.at(-1)?.review;
    expect(payerReview?.extractedFacts.find((fact) => fact.key === 'customer')?.value).not.toBe(
      PRIOR_INFERRED,
    );
    expect(processed.living.spine.customer).toBe(CONFIRMED_PERSONA);
    expect(processed.living.claims.find((c) => c.fieldKey === 'customerPersona')?.value).toBe(
      CONFIRMED_PERSONA,
    );
    expect(gapEvidence('customerPersona').join(' ')).toContain(CONFIRMED_PERSONA);
    expect(gapEvidence('customerPersona').join(' ')).not.toMatch(/방한 외국인/);
    expect(getFact(processed.memory, 'customer')?.value).toBe(CONFIRMED_PERSONA);
  });

  it('3. CLOSED→PENDING is blocked on next turn, allowed only as explicit edit reopen', () => {
    appendCustomer(PRIOR_INFERRED, '2026-10-04T13:04:00.000Z', 'business_fact');
    process();
    appendCustomer(FOUNDER_CORRECTION, '2026-10-04T13:05:00.000Z', 'correction');
    process();
    expect(loadAiPmLoopState(PROJECT_ID).gapState?.gaps.customerPersona?.completeness).toBe(
      'CLOSED',
    );
    expect(gapEvidence('customerPersona').join(' ')).toContain(CONFIRMED_PERSONA);

    appendPayer('2026-10-04T13:06:00.000Z');
    process();
    expect(loadAiPmLoopState(PROJECT_ID).gapState?.gaps.customerPersona?.completeness).toBe(
      'CLOSED',
    );
    expect(loadAiPmLoopState(PROJECT_ID).gapState?.gaps.customerPersona?.completeness).not.toMatch(
      /OPEN|PARTIAL/,
    );

    const afterEdit = supersedeTurnAndInvalidateDownstream(
      'customer_definition',
      AI_PM_LOOP_ISSUE_ORDER,
      PROJECT_ID,
    );
    expect(afterEdit.gapState?.gaps.customerPersona?.completeness).not.toBe('CLOSED');
    expect(getClosedGapIds(afterEdit.gapState!)).not.toContain('customerPersona');
  });

  it('4. refresh → snapshot → cache → hydrate keeps review/gapState/living, not memory only', () => {
    appendCustomer(FOUNDER_CORRECTION, '2026-10-04T13:07:00.000Z', 'correction');
    process();
    appendPayer('2026-10-04T13:08:00.000Z');
    process();

    const snapshot = buildWorkspacePersistedSnapshot(PROJECT_ID);
    const snapshotCustomer = snapshot.aiPmLoop?.gapState?.gaps.customerPersona;
    expect(snapshotCustomer?.completeness).toBe('CLOSED');
    expect((snapshotCustomer?.evidence ?? []).map((item) => item.value).join(' ')).toContain(
      CONFIRMED_PERSONA,
    );
    expect(
      snapshot.aiPmLoop?.turns
        .filter((turn) => !turn.superseded)
        .flatMap((turn) => turn.review?.extractedFacts ?? [])
        .some((fact) => fact.key === 'customer' && fact.value === CONFIRMED_PERSONA),
    ).toBe(true);

    sessionStorage.clear();
    applyWorkspaceSnapshotToCache(PROJECT_ID, snapshot);

    const hydrated = loadAiPmLoopState(PROJECT_ID);
    expect(hydrated.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(gapEvidence('customerPersona').join(' ')).toContain(CONFIRMED_PERSONA);
    expect(gapEvidence('customerPersona').join(' ')).not.toMatch(/방한 외국인/);
    expect(activeCustomerReviews()).toContain(CONFIRMED_PERSONA);
    expect(getFact(loadConversationMemory(PROJECT_ID), 'customer')?.value).toBe(CONFIRMED_PERSONA);

    const living = livingFromLoop();
    expect(living.spine.customer).toBe(CONFIRMED_PERSONA);
    expect(living.claims.find((c) => c.fieldKey === 'customerPersona')?.value).toBe(
      CONFIRMED_PERSONA,
    );
  });

  it('5. customer correction does not contaminate payer/problem/business', () => {
    appendCustomer(FOUNDER_CORRECTION, '2026-10-04T13:09:00.000Z', 'correction');
    const afterCorrection = process();
    expect(getFact(afterCorrection.memory, 'buyer')?.value ?? '').not.toBe(CONFIRMED_PERSONA);
    expect(getFact(afterCorrection.memory, 'problem')?.value ?? '').not.toMatch(/내국인·외국인|방한/);
    expect(getFact(afterCorrection.memory, 'business')?.value ?? '').not.toBe(CONFIRMED_PERSONA);
    expect(afterCorrection.loop.gapState?.gaps.payer?.completeness).not.toBe('CONTRADICTED');
    expect(afterCorrection.loop.gapState?.gaps.problemJtbd?.completeness).not.toBe('CONTRADICTED');

    appendPayer('2026-10-04T13:10:00.000Z');
    const afterPayer = process();
    expect(getFact(afterPayer.memory, 'customer')?.value).toBe(CONFIRMED_PERSONA);
    expect(getFact(afterPayer.memory, 'buyer')?.value).toMatch(/결제/);
    expect(getFact(afterPayer.memory, 'buyer')?.value).not.toBe(CONFIRMED_PERSONA);
    expect(afterPayer.loop.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(afterPayer.living.claims.find((c) => c.fieldKey === 'payer')?.value ?? '').not.toBe(
      CONFIRMED_PERSONA,
    );
  });
});
