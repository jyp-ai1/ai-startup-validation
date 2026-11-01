import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ChatResponse } from '@repo/ai';

import { evaluateDecisionContract, requestCarriesAnswer, type ContractSelection, type DecisionLedger } from '../ai-pm-decision-contract';
import { runDecisionContractFollowUp, type DecisionContractInput } from '../ai-pm-decision-contract-run';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

const ANSWER = '체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다.';
const CONCEPT = '체험을 원하는 고객과 상품 구성은 구상이다';
const SUPPLY = '공급 계약과 가격은 없다';
const PRICE = '가격은 없다';
const DEMAND_QUESTION = '양조장 체험에 대한 수요가 충분한가?';
const DEMAND_YES = '양조장 체험에 대한 수요가 충분하다';
const PRIOR_JUDGMENT = '양조장 체험에 대한 수요와 온라인 마케팅의 효과가 불확실하지만, 전통주에 대한 관심 증가와 개인 맞춤형 체험 제공이라는 강점이 있다.';

describe('decision contract', () => {
  it('stays outside the product review and the experiment B harness', () => {
    const contract = readFileSync(new URL('../ai-pm-decision-contract.ts', import.meta.url), 'utf8');
    const runner = readFileSync(new URL('../ai-pm-decision-contract-run.ts', import.meta.url), 'utf8');
    for (const source of [contract, runner]) {
      expect(source).not.toContain('runStageReanalysis');
      expect(source).not.toContain('runFirstReview');
      expect(source).not.toContain('ai-pm-experiment-b');
      expect(source).not.toContain("from './ai-pm-review'");
    }
    expect(contract).toContain('currentAnswer: input.currentAnswer');
  });

  it('rejects a request that drops the answer', () => {
    expect(requestCarriesAnswer({ model: 'gpt-4o', messages: [{ role: 'user', content: JSON.stringify({ priorJudgment: PRIOR_JUDGMENT }) }] }, ANSWER)).toBe(false);
  });

  it('does not call a model when the answer is missing', async () => {
    const result = await runCase(async () => {
      throw new Error('model_called');
    }, { currentAnswer: undefined });
    expect(result.calls).toBe(0);
    expect(result.quality.failures).toContain('answer_missing');
    expect(result.record.callCount).toBe(0);
    expect(result.record.evidence).toBe('not_run');
    expect(result.quality.selectionAllowed).toBe(false);
  });

  it('fails a span that is not the cited slice and does not call selection', async () => {
    const ledger = validLedger();
    const change = ledger.changes[0];
    if (!change) throw new Error('missing change');
    change.span = '없는 문장';
    const result = await runCase(stateChat(ledger), { currentAnswer: ANSWER });
    expect(result.calls).toBe(1);
    expect(result.quality.failures).toContain('span_mismatch');
    expect(result.quality.groundingPass).toBe(false);
    expect(result.quality.selectionAllowed).toBe(false);
    expect(result.record.callCount).toBe(1);
  });

  it('fails when an unanswered demand question is rewritten as a positive fact', async () => {
    const ledger = validLedger();
    ledger.judgmentText = `${DEMAND_YES}.`;
    ledger.answerImpact = DEMAND_YES;
    const result = await runCase(stateChat(ledger), { currentAnswer: ANSWER });
    expect(result.calls).toBe(1);
    expect(result.quality.failures).toContain('unanswered_promoted_positive');
    expect(result.quality.selectionAllowed).toBe(false);
  });

  it('keeps simulation confirmed facts empty', async () => {
    const ledger = validLedger();
    ledger.confirmedFacts = ['체험 예약이 확인되었다'];
    const result = await runCase(stateChat(ledger), { currentAnswer: ANSWER });
    expect(result.calls).toBe(1);
    expect(result.quality.failures).toContain('simulation_promoted');
    expect(result.quality.unknownPass).toBe(false);
    const passed = evaluateDecisionContract(contextOf(ANSWER), validLedger());
    expect(passed.failures).not.toContain('simulation_promoted');
    expect(validLedger().confirmedFacts).toEqual([]);
  });

  it('keeps demand uncertainty and withholds the business judgment before selection', async () => {
    const kept = validLedger();
    kept.delta = kept.delta.filter((item) => item.kind !== 'kept');
    const droppedKept = await runCase(stateChat(kept), { currentAnswer: ANSWER });
    expect(droppedKept.calls).toBe(1);
    expect(droppedKept.quality.failures).toContain('uncertainty_not_kept');
    expect(droppedKept.quality.deltaPass).toBe(false);

    const withheld = validLedger();
    withheld.delta = withheld.delta.filter((item) => item.kind !== 'withheld');
    const droppedWithheld = await runCase(stateChat(withheld), { currentAnswer: ANSWER });
    expect(droppedWithheld.calls).toBe(1);
    expect(droppedWithheld.quality.failures).toContain('judgment_not_withheld');
    expect(droppedWithheld.quality.selectionAllowed).toBe(false);
  });

  it('reuses a failed row without a second model call', async () => {
    const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'decision-contract-reuse-')), 'reviews.sqlite'));
    const input = {
      ...contextOf(ANSWER),
      store,
      userId: 'contract-user',
      projectId: 'contract-project',
      parent: parent(),
      now: '2026-11-01T12:20:00.000Z',
      sourceFeedbackId: null,
      priorRisks: ['양조장과의 협력 문제'],
    };
    const ledger = validLedger();
    ledger.judgmentText = DEMAND_YES;
    const first = await runDecisionContractFollowUp({ ...input, chat: stateChat(ledger) });
    expect(first.record.status).toBe('failed');
    let secondCalls = 0;
    const second = await runDecisionContractFollowUp({
      ...input,
      chat: async () => {
        secondCalls += 1;
        throw new Error('duplicate_called_model');
      },
    });
    expect(secondCalls).toBe(0);
    expect(second.called).toBe(false);
    expect(second.record.reviewId).toBe(first.record.reviewId);
    store.close();
  });

  it('calls selection only after grounding, unknowns, and delta pass', async () => {
    let calls = 0;
    const sent: string[] = [];
    const result = await runCase(async (request) => {
      calls += 1;
      const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
      sent.push(user);
      const content = calls === 1 ? JSON.stringify(validLedger()) : JSON.stringify(validSelection());
      return modelResponse(content, `chatcmpl-${calls}`);
    }, { currentAnswer: ANSWER });
    expect(calls).toBe(2);
    expect(result.quality.groundingPass).toBe(true);
    expect(result.quality.unknownPass).toBe(true);
    expect(result.quality.deltaPass).toBe(true);
    expect(result.quality.selectionAllowed).toBe(true);
    expect(result.quality.qualityPass).toBe(true);
    expect(result.selection?.selectedCandidateId).toBe('c-supply');
    const stateUser = JSON.parse(sent[0] ?? '{}') as { currentAnswer?: string };
    const selectionUser = JSON.parse(sent[1] ?? '{}') as { currentAnswer?: string; ledger?: { judgmentText?: string } };
    expect(stateUser.currentAnswer).toBe(ANSWER);
    expect(selectionUser.currentAnswer).toBe(ANSWER);
    expect(selectionUser.ledger?.judgmentText).toContain('유보');
    expect(result.record.status).toBe('succeeded');
    expect(result.record.sections?.judgment).toContain('유보');
  });
});

async function runCase(
  chat: DecisionContractInput['chat'],
  extra: { currentAnswer: string | undefined },
): Promise<Awaited<ReturnType<typeof runDecisionContractFollowUp>> & { calls: number }> {
  const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'decision-contract-')), 'reviews.sqlite'));
  let calls = 0;
  try {
    const result = await runDecisionContractFollowUp({
      ...contextOf(extra.currentAnswer ?? ''),
      currentAnswer: extra.currentAnswer,
      store,
      userId: 'contract-user',
      projectId: 'contract-project',
      parent: parent(),
      now: '2026-11-01T12:20:00.000Z',
      chat: async (request) => {
        calls += 1;
        return chat(request);
      },
      sourceFeedbackId: null,
      priorRisks: ['양조장과의 협력 문제', '관광객 수요 변동'],
    });
    return { ...result, calls };
  } finally {
    store.close();
  }
}

function stateChat(ledger: DecisionLedger): DecisionContractInput['chat'] {
  return async () => modelResponse(JSON.stringify(ledger), 'chatcmpl-state');
}

function contextOf(currentAnswer: string) {
  return {
    currentAnswer,
    originalIdea: '전통주 양조장 체험을 안내하는 사업을 구상 중이다.',
    priorAnswers: [],
    priorJudgment: PRIOR_JUDGMENT,
    closedQuestions: [DEMAND_QUESTION],
    priorChoiceLabels: [[DEMAND_YES, '양조장 체험에 대한 수요가 부족하다', '아직 정하지 못했다', '기타 / 직접 입력']],
    openUncertainties: [DEMAND_YES, '온라인 마케팅이 효과적이다'],
    unresolvedMarks: [
      { text: DEMAND_YES, presentInAnswers: false },
      { text: '온라인 마케팅이 효과적이다', presentInAnswers: false },
    ],
    answerSource: 'simulation' as const,
  };
}

function validLedger(): DecisionLedger {
  const conceptAt = ANSWER.indexOf(CONCEPT);
  const supplyAt = ANSWER.indexOf(SUPPLY);
  const priceAt = ANSWER.indexOf(PRICE);
  return {
    changes: [
      { id: 'ch-concept', statement: CONCEPT, span: CONCEPT, spanStart: conceptAt, spanEnd: conceptAt + CONCEPT.length },
      { id: 'ch-supply', statement: '공급 계약은 없다', span: SUPPLY, spanStart: supplyAt, spanEnd: supplyAt + SUPPLY.length },
      { id: 'ch-price', statement: '가격은 없다', span: PRICE, spanStart: priceAt, spanEnd: priceAt + PRICE.length },
    ],
    answeredQuestions: [],
    unansweredQuestions: [{ id: 'uq-demand', question: DEMAND_QUESTION, changeIds: [] }],
    unconfirmed: [{ id: 'uf-purchase', text: '실제 구매는 확인되지 않음' }],
    confirmedFacts: [],
    delta: [
      { kind: 'kept', text: '수요는 여전히 불확실하다', cites: ['uq-demand'] },
      { kind: 'added', text: '체험 상품은 구상이다', cites: ['ch-concept'] },
      { kind: 'added', text: '공급 계약은 없다', cites: ['ch-supply'] },
      { kind: 'added', text: '가격은 없다', cites: ['ch-price'] },
      { kind: 'withheld', text: '사업성 판단은 수요 근거가 없어 유보한다', cites: ['uq-demand', 'uf-purchase'] },
    ],
    judgmentKept: true,
    judgmentText: '수요는 여전히 불확실하고 사업성 판단은 유보한다.',
    answerImpact: '이번 답은 상품 구성이 구상이고 공급 계약과 가격은 없다. 수요는 확인되지 않는다.',
  };
}

function validSelection(): ContractSelection {
  return {
    candidates: [
      { candidateId: 'c-supply', judgmentTarget: '공급 계약이 없는 상태에서 무엇을 확인할 것인가', fromNewAnswer: true, citedIds: ['ch-supply'] },
      { candidateId: 'c-demand', judgmentTarget: '수요는 아직 미확인이다', fromNewAnswer: false, citedIds: ['uq-demand'] },
    ],
    selectedCandidateId: 'c-supply',
    selectionReason: '검증된 변화 ch-supply와 미확인 uq-demand를 비교하면 공급 계약 없음이 이번 답으로 열렸다.',
    citedIds: ['ch-supply', 'uq-demand'],
    nextQuestions: [
      {
        text: '공급 계약을 맺을 양조장이 정해져 있는가?',
        verificationPurpose: '공급 계약의 상대가 있는지 확인한다',
        choices: ['계약 상대가 정해져 있다', '아직 상대가 없다'],
      },
    ],
  };
}

function parent(): StoredReview {
  return {
    reviewId: 'parent-contract',
    userId: 'contract-user',
    version: 1,
    parentReviewId: null,
    sourceFeedbackId: null,
    supplementSha: null,
    projectId: 'contract-project',
    inputSha: 'sha',
    inputText: 'idea',
    inputOrigin: 'typed',
    fileName: null,
    status: 'succeeded',
    evidence: 'injected_http',
    provider: 'openai',
    model: 'gpt-4o-2024-08-06',
    sections: null,
    rawContent: null,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    usageKnown: true,
    callCount: 1,
    latencyMs: 1,
    error: null,
    requestedAt: '2026-11-01T00:00:00.000Z',
    finishedAt: '2026-11-01T00:00:00.000Z',
  };
}

function modelResponse(content: string, id: string): ChatResponse {
  return {
    id,
    model: 'gpt-4o-2024-08-06',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
    usageKnown: true,
    latencyMs: 5,
  };
}
