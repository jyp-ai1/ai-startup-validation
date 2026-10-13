/**
 * PR #197 login-UI S4 routing — typed submit must hit throughLoop,
 * not persist T6 as payer / drop the turn.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import { buildBusinessChoiceQuestion, type BusinessChoiceOption } from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { getConflictFact, getFact } from '../conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  applyTypedAnswerThroughLoop,
  shouldRouteTypedAnswerThroughLoop,
} from '../route-typed-answer-through-loop';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const S4 = `# 구독 박스
서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`;

const S6 = `# 가사 중개
서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱
대상: 맞벌이 가정 / 도우미
문제: 믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다
수익: 거래 수수료`;

const T6 = '사실 아이가 아니라 혼자 사는 20대가 메인이에요';
const T7 = '지금 메인 고객은 혼자 사는 20대예요';

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

function reset(projectId: string, documentText: string) {
  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'answer',
      currentIssueId: 'problem_definition',
      ceoJudgment: emptyCeoJudgmentState(0),
    },
    projectId,
  );
}

function memoryNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  return buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
}

function livingNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  return buildLivingUnderstandingState({
    documentText,
    understanding: buildBusinessUnderstanding(documentText),
    turns: loop.turns,
    memory: memoryNow(projectId, documentText),
    gapState: loop.gapState,
  });
}

function applyGap(projectId: string, documentText: string, targetGap: string, pattern: RegExp) {
  const question = buildBusinessChoiceQuestion({
    living: livingNow(projectId, documentText),
    documentText,
    targetGap,
  });
  const option =
    question.options.find((o: BusinessChoiceOption) => o.kind === 'specific' && pattern.test(o.label)) ??
    question.options.find((o: BusinessChoiceOption) => o.kind === 'specific')!;
  return applyBusinessChoiceThroughLoop({
    projectId,
    documentText,
    option,
    askedQuestionText: question.questionText,
  });
}

describe('PR #197 login-UI S4 typed routing', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('routes T6 off-slot and T7 reconfirm, not payer role or on-slot 아니라', () => {
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: T6,
        askedGap: 'payer',
        customerCompleteness: 'CLOSED',
      }),
    ).toBe(true);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: T7,
        askedGap: 'customerPersona',
        customerCompleteness: 'CONTRADICTED',
      }),
    ).toBe(true);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: '집이 낸다',
        askedGap: 'payer',
        customerCompleteness: 'CLOSED',
      }),
    ).toBe(false);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: '아직 모르겠음',
        askedGap: 'payer',
        customerCompleteness: 'CLOSED',
      }),
    ).toBe(false);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.',
        askedGap: 'customerPersona',
        customerCompleteness: 'CLOSED',
      }),
    ).toBe(false);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.',
        askedGap: 'problemJtbd',
        customerCompleteness: 'CLOSED',
      }),
    ).toBe(true);
  });

  it('T6 typed on payer is stored as customer correction, not buyer', () => {
    reset('ui-s4', S4);
    applyGap('ui-s4', S4, 'customerPersona', /아이|부모/);
    expect(loadAiPmLoopState('ui-s4').gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');

    const afterT6 = applyTypedAnswerThroughLoop({
      projectId: 'ui-s4',
      documentText: S4,
      answer: T6,
      askedGap: 'payer',
      askedQuestionText: '이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?',
      customerCompleteness: 'CLOSED',
    });

    const loop = loadAiPmLoopState('ui-s4');
    const last = loop.turns.at(-1);
    expect(last?.answer).toBe(T6);
    expect(last?.targetGap).not.toBe('payer');
    expect(loop.gapState?.gaps.customerPersona?.completeness).toBe('CONTRADICTED');

    const memory = memoryNow('ui-s4', S4);
    expect(getFact(memory, 'customer')).toBeNull();
    expect(getConflictFact(memory, 'customer')?.value).toMatch(/20대/);
    expect(
      memory.facts.some(
        (f) => f.key === 'customer' && f.lifecycle === 'superseded' && /맞벌이|부모/.test(f.value),
      ),
    ).toBe(true);

    const livingCustomer = afterT6.livingAfter.claims.find((c) => c.fieldKey === 'customerPersona');
    expect(livingCustomer?.status).toBe('contradiction');
    expect(afterT6.judgmentAfter.dimensions.customer.summary).toMatch(/충돌|20대/);
    expect(afterT6.judgmentAfter.dimensions.customer.summary).not.toBe('맞벌이 부모');
    expect(afterT6.nextTargetGap).toBe('customerPersona');
  });

  it('T7 typed reconfirm aligns customer gap / Memory / living / judgment and leaves payer', () => {
    reset('ui-s4-t7', S4);
    applyGap('ui-s4-t7', S4, 'customerPersona', /아이|부모/);
    applyTypedAnswerThroughLoop({
      projectId: 'ui-s4-t7',
      documentText: S4,
      answer: T6,
      askedGap: 'payer',
      askedQuestionText: '이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?',
      customerCompleteness: 'CLOSED',
    });

    const afterT7 = applyTypedAnswerThroughLoop({
      projectId: 'ui-s4-t7',
      documentText: S4,
      answer: T7,
      askedGap: 'customerPersona',
      askedQuestionText: '어느 쪽이 지금 맞는 고객인가요?',
      customerCompleteness: 'CONTRADICTED',
    });

    const loop = loadAiPmLoopState('ui-s4-t7');
    expect(loop.gapState?.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(loop.turns.at(-1)?.answer).toBe(T7);
    expect(loop.turns.at(-1)?.targetGap).toBe('customerPersona');

    const memory = memoryNow('ui-s4-t7', S4);
    expect(getFact(memory, 'customer')?.value).toMatch(/20대/);
    expect(getFact(memory, 'customer')?.value).not.toMatch(/맞벌이 부모/);
    expect(getConflictFact(memory, 'customer')).toBeNull();

    const livingCustomer = afterT7.livingAfter.claims.find((c) => c.fieldKey === 'customerPersona');
    expect(livingCustomer?.status).toBe('confirmed');
    expect(livingCustomer?.value).toMatch(/20대/);
    expect(afterT7.judgmentAfter.dimensions.customer.summary).toMatch(/20대/);
    expect(afterT7.judgmentAfter.dimensions.customer.summary).not.toBe('맞벌이 부모');
    expect(afterT7.nextTargetGap).not.toBe('customerPersona');
    expect(afterT7.nextTargetGap).not.toBe('payer');
    expect(afterT7.nextQuestionText ?? '').not.toMatch(/누구에게 무엇을 제공/);
  });

  it('S6 집이 낸다 still closes payer when not routed', () => {
    reset('ui-s6', S6);
    applyGap('ui-s6', S6, 'problemJtbd', /믿|사람|도우미/);
    applyGap('ui-s6', S6, 'customerPersona', /맞벌이|집|가정/);
    expect(
      shouldRouteTypedAnswerThroughLoop({
        answer: '집이 낸다',
        askedGap: 'payer',
        customerCompleteness: loadAiPmLoopState('ui-s6').gapState?.gaps.customerPersona?.completeness,
      }),
    ).toBe(false);
    const afterPayer = applyGap('ui-s6', S6, 'payer', /집이 낸다|집/);
    expect(loadAiPmLoopState('ui-s6').gapState?.gaps.payer?.completeness).toBe('CLOSED');
    expect(afterPayer.nextTargetGap).not.toBe('payer');
    expect(afterPayer.nextQuestionText ?? '').not.toMatch(/누구에게 무엇을 제공/);
  });
});
