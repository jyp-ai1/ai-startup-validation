import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  collapseDuplicateStatements,
  evaluateSourcedStatement,
  settleSavedStatement,
} from '../ai-pm-decision-contract';
import { AI_PM_REVIEW_MODEL, consultingQuestions, runFirstReview, submitConsultingStage } from '../ai-pm-review';
import { openAiPmReviewStore } from '../ai-pm-review-store';

const NOW = '2026-11-01T14:40:00.000Z';
const IDEA =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 전통주 양조장 체험을 안내하는 사업을 구상 중이다.';
const QUESTION = '양조장과의 협력 가능성을 어떻게 확인할 것인가?';
const ANSWER = '상품은 구상 단계이며 공급 계약과 가격은 없다.';
const UNLINKED = 'SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.';
const CONTRACT_CLAIM = '양조장과 계약했다';

function store() {
  return openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'continuity-')), 'reviews.sqlite'));
}

function reply(content: string): ChatResponse {
  return {
    id: 'resp-continuity',
    model: 'gpt-4o-mini',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 20, outputTokens: 20, totalTokens: 40 },
    usageKnown: true,
    latencyMs: 1,
  };
}

function firstRaw(): string {
  return JSON.stringify({
    summary: '양조장 체험 안내를 구상 중이다.',
    customer: '전통주 양조장에 관심 있는 관광객',
    problem: '문제는 입력에 없다.',
    value: '체험 안내',
    operatingModel: '구상',
    alternatives: '개별 방문',
    differentiation: '미확인',
    payer: '지불자는 확인되지 않았다.',
    revenueModel: '가격은 가설이며 원문에 없다.',
    market: '시장 규모는 입력에 없다.',
    competition: '경쟁은 입력에 없다.',
    operations: '운영은 구상이다.',
    profitability: '수익성은 확인되지 않았다.',
    judgment: '수요 충족은 확인되지 않았다. 협력은 미확인이다.',
    nextVerification: '협력 확인 방법을 묻는다.',
    nextQuestion: QUESTION,
    nextQuestionReason: '공급이 확인되지 않았다.',
    strengths: ['구상이 있다'],
    risks: ['협력은 미확인이다'],
    assumptions: ['협력 가능성은 확인되지 않았다'],
    evidenceToChange: ['협력 기록'],
    founderFacts: [],
    inferences: ['추론: 경쟁은 미확인'],
    choices: ['양조장과 직접 협상하여 의사를 확인한다.', '아직 정하지 못했다.', '기타 / 직접 입력'],
    questions: [
      {
        text: QUESTION,
        choices: ['양조장과 직접 협상하여 의사를 확인한다.', '아직 정하지 못했다.', '기타 / 직접 입력'],
      },
    ],
  });
}

function userJson(request: ChatRequest): Record<string, unknown> {
  return JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<string, unknown>;
}

const PRICE_QUESTION = '체험 가격을 언제 정할 계획인가?';

function firstRawTwoQuestions(): string {
  const raw = JSON.parse(firstRaw()) as { questions: unknown };
  raw.questions = [
    {
      text: QUESTION,
      choices: ['양조장과 직접 협상하여 의사를 확인한다.', '아직 정하지 못했다.', '기타 / 직접 입력'],
    },
    {
      text: PRICE_QUESTION,
      choices: ['가격 기준을 먼저 적는다.', '아직 정하지 못했다.', '기타 / 직접 입력'],
    },
  ];
  return JSON.stringify(raw);
}

function continuityFollow(request: ChatRequest): string {
  const payload = userJson(request);
  const pairs = (payload.stagePairs ?? []) as Array<{ questionId: string; choiceId: string | null; status: string; choiceLabel?: string | null; supplement?: string }>;
  const answered = pairs.filter((pair) => pair.status === 'answered');
  const continuesObjectiveId =
    (payload.verificationObjectives as { unresolved?: Array<{ objectiveId?: string }> } | undefined)?.unresolved?.find((row) => row.objectiveId)
      ?.objectiveId ?? '';
  const cites = answered
    .map((pair) => (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim())
    .filter((text) => text.replace(/\s+/g, '').length >= 2);
  const nextQuestions = [
    {
      text: '체험 장소의 수용 인원을 확인했는가?',
      choices: ['장소 수용 인원을 먼저 적는다', '수용 인원은 아직 모른다'],
      verificationPurpose: '장소 수용은 협력과 가격과 다른 미확인이다',
      reaskReason: null,
      ...(continuesObjectiveId ? { continuesObjectiveId } : {}),
    },
  ];
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 구상과 미정을 말하고 확인된 사실은 늘리지 않는다`,
      founderBasis: `${pair.questionId}에서 창업자가 말한 범위는 입력에 적힌 구상이다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의 기록은 없다`,
      judgmentEffect: `${pair.questionId} 답으로 성공 가능성은 높아지지 않았다. 실행은 유보한다.`,
      openRisk: `${pair.questionId}의 협력과 가격은 아직 확인되지 않았다`,
    })),
    impactOnPreviousJudgment: '이번 답은 구상과 미정을 말했다. 이전 문장을 유지로 복사하지 않는다.',
    updatedJudgment: '계약 기록은 없다. 상품은 구상이다. 가격은 미정이다. 남은 위험은 협력과 수요다.',
    judgmentReason: `계약 기록과 가격이 없어 실행은 유보한다. 이번 답 ${cites.join(' ')}을 확인했다. 남은 불확실성은 협력이다.`,
    answerEvidence: answered.map((pair) => ({
      questionKey: (pair as { questionKey?: string }).questionKey || pair.questionId,
      answerText: ((pair.choiceLabel ?? '').replace(/^\s*SIMULATION\b[.:]?\s*/iu, '').trim() || (pair.supplement ?? '').replace(/^\s*SIMULATION\b[.:]?\s*/iu, '').trim()),
      provenance: /^\s*SIMULATION\b/m.test(`${pair.choiceLabel ?? ''}\n${pair.supplement ?? ''}`) ? 'SIMULATION' : 'FOUNDER_INPUT',
      epistemicStatus: 'FOUNDER_CLAIM',
    })),
    verifiedFacts: [],
    unverifiedClaims: [ANSWER],
    assumptions: ['협력은 확인되지 않았다'],
    resolvedIssues: [],
    unresolvedIssues: ['가격과 협력은 아직 서로 다른 미확인이다'],
    nextVerification: '장소 수용을 따로 확인한다.',
    customer: '관광객',
    problem: '문제는 입력에 없다',
    value: '체험 안내',
    product: '구상 중인 체험',
    market: '시장 규모는 입력에 없다',
    revenueModel: '가격은 미정이다',
    operations: '운영은 구상이다',
    supply: '공급 계약은 입력에 없다',
    supplyState: 'confirmed',
    marketing: '알림 방법은 입력에 없다',
    marketingState: 'confirmed',
    competition: '경쟁은 입력에 없다',
    executionNote: '실행은 아직 확인되지 않았다',
    risks: ['협력은 미확인이다'],
    nextQuestions,
    nextQuestionChoices: nextQuestions.map((item) => item.choices),
  });
}

describe('consulting continuity contract', () => {
  it('keeps simulation provenance apart from an unverified claim', () => {
    const saved = settleSavedStatement({
      text: UNLINKED,
      provenance: 'FOUNDER_INPUT',
      epistemicStatus: 'VERIFIED_FACT',
    });
    expect(saved.provenance).toBe('SIMULATION');
    expect(saved.epistemicStatus).toBe('FOUNDER_CLAIM');
    expect(
      evaluateSourcedStatement({
        text: UNLINKED,
        provenance: 'SIMULATION',
        epistemicStatus: 'FOUNDER_CLAIM',
        spanText: '아직 참여 의향은 확인하지 못했다',
        sourceText: UNLINKED,
      }),
    ).toEqual([]);
    expect(
      evaluateSourcedStatement({
        text: UNLINKED,
        provenance: 'SIMULATION',
        epistemicStatus: 'VERIFIED_FACT',
        spanText: '문의했지만',
        sourceText: UNLINKED,
      }),
    ).toEqual(expect.arrayContaining(['span_is_not_verification', 'claim_promoted_to_fact', 'simulation_promoted']));
  });

  it('does not treat a founder sentence as a verified fact', () => {
    const saved = settleSavedStatement({ text: CONTRACT_CLAIM, epistemicStatus: 'VERIFIED_FACT' });
    expect(saved.provenance).toBe('FOUNDER_INPUT');
    expect(saved.epistemicStatus).toBe('FOUNDER_CLAIM');
    expect(
      evaluateSourcedStatement({
        text: CONTRACT_CLAIM,
        provenance: 'FOUNDER_INPUT',
        epistemicStatus: 'VERIFIED_FACT',
        spanText: CONTRACT_CLAIM,
        sourceText: CONTRACT_CLAIM,
        evidenceId: null,
      }),
    ).toEqual(expect.arrayContaining(['span_is_not_verification', 'claim_promoted_to_fact']));
    const verified = settleSavedStatement({
      text: '계약서 사본이 있다.',
      provenance: 'EXTERNAL_EVIDENCE',
      epistemicStatus: 'VERIFIED_FACT',
      evidenceId: 'evidence-1',
    });
    expect(verified).toMatchObject({ provenance: 'EXTERNAL_EVIDENCE', epistemicStatus: 'VERIFIED_FACT', evidenceId: 'evidence-1' });
  });

  it('counts one repeated unlinked sentence once', () => {
    const collapsed = collapseDuplicateStatements([
      { text: ANSWER, id: 'a' },
      { text: `  ${ANSWER}  `, id: 'b' },
      { text: '가격은 미정이다.', id: 'c' },
    ]);
    expect(collapsed.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('stores unlinked text without closing the question or calling the model', async () => {
    const db = store();
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      return reply(firstRaw());
    };
    const first = await runFirstReview({
      store: db,
      userId: 'continuity-user',
      projectId: 'continuity-project',
      text: IDEA,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(first.record.status).toBe('succeeded');
    expect(AI_PM_REVIEW_MODEL).toBe('gpt-4o-mini');
    const base = {
      store: db,
      userId: 'continuity-user',
      projectId: 'continuity-project',
      reviewId: first.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const pending = await submitConsultingStage({
      ...base,
      answers: [{ unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT', epistemicStatus: 'VERIFIED_FACT' }],
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    expect(pending.called).toBe(false);
    expect(pending.pending).toBe(true);
    expect(calls).toHaveLength(1);
    const open = consultingQuestions(pending.record.sections).map((question) => question.questionId);
    expect(open).toEqual(['q1']);
    const stored = await db.listFeedback('continuity-user', first.record.reviewId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      questionId: null,
      unlinked: true,
      comment: UNLINKED,
      provenance: 'SIMULATION',
      epistemicStatus: 'FOUNDER_CLAIM',
      modelCalls: 0,
    });
    const again = await submitConsultingStage({
      ...base,
      answers: [{ comment: UNLINKED }],
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.called).toBe(false);
    expect(await db.listFeedback('continuity-user', first.record.reviewId)).toHaveLength(1);
    const reread = await db.listFeedback('continuity-user', first.record.reviewId);
    expect(reread[0]?.feedbackId).toBe(stored[0]?.feedbackId);
    db.close();
  });

  it('keeps the real choice id and sends unlinked text beside the answer', async () => {
    const db = store();
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      return reply(calls.length > 1 ? continuityFollow(request) : firstRawTwoQuestions());
    };
    const first = await runFirstReview({
      store: db,
      userId: 'continuity-user',
      projectId: 'continuity-project',
      text: IDEA,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const base = {
      store: db,
      userId: 'continuity-user',
      projectId: 'continuity-project',
      reviewId: first.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const chosen = await submitConsultingStage({
      ...base,
      answers: [
        { questionId: 'q1', choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment: '협력 방법은 정하지 않았다.' },
        { questionId: 'q1', choiceLabel: '양조장과 직접 협상하여 의사를 확인한다.' },
      ],
    });
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    expect(chosen.called).toBe(false);
    expect(chosen.pending).toBe(true);
    expect(consultingQuestions(chosen.record.sections).map((question) => question.questionId)).toEqual(['q1', 'q2']);
    const linked = await db.listFeedback('continuity-user', first.record.reviewId);
    expect(linked.some((item) => item.choiceAnswer?.choiceId === 'c1')).toBe(false);
    expect(linked.find((item) => item.choiceAnswer)?.choiceAnswer).toMatchObject({ choiceId: 'c2', label: '아직 정하지 못했다.' });
    expect(linked.some((item) => item.questionId === 'q1' && item.choiceAnswer === null && item.comment.includes('직접 협상'))).toBe(true);
    const analyzed = await submitConsultingStage({
      ...base,
      answers: [
        { questionId: 'q1', choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment: ANSWER },
        { questionId: 'q2', choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment: '가격은 아직 정하지 않았다.' },
        { unlinked: true, comment: UNLINKED },
        { unlinked: true, comment: ` ${UNLINKED} ` },
      ],
    });
    expect(analyzed.ok).toBe(true);
    if (!analyzed.ok) return;
    expect(analyzed.record.error).toBeNull();
    expect(analyzed.record.status).toBe('succeeded');
    expect(analyzed.called).toBe(true);
    expect(calls).toHaveLength(2);
    const payload = userJson(calls[1] ?? { model: 'gpt-4o-mini', messages: [] });
    const pairs = payload.stagePairs as Array<{ questionId: string; choiceId: string | null; supplement: string; status: string }>;
    const unlinked = payload.unlinkedStatements as Array<{ text: string; questionId: string | null; provenance: string; epistemicStatus: string }>;
    const records = payload.answerRecords as Array<{ questionId: string; choiceId: string | null; epistemicStatus: string; provenance: string }>;
    expect(pairs.some((pair) => (pair.supplement ?? '').includes(UNLINKED) || pair.questionId === null)).toBe(false);
    expect(pairs.find((pair) => pair.questionId === 'q1')).toMatchObject({
      questionId: 'q1',
      status: 'answered',
      choiceId: 'c2',
      supplement: ANSWER,
    });
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0]).toMatchObject({
      text: UNLINKED,
      questionId: null,
      provenance: 'SIMULATION',
      epistemicStatus: 'FOUNDER_CLAIM',
    });
    expect(records.some((record) => record.epistemicStatus === 'VERIFIED_FACT')).toBe(false);
    expect(records.find((record) => record.text === undefined || record.questionId === 'q1')).toBeTruthy();
    const saved = await db.listFeedback('continuity-user', first.record.reviewId);
    expect(saved.filter((item) => item.unlinked).map((item) => item.comment)).toEqual([UNLINKED]);
    const duplicate = await submitConsultingStage({
      ...base,
      answers: [
        { questionId: 'q1', choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment: ANSWER },
        { questionId: 'q2', choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment: '가격은 아직 정하지 않았다.' },
        { unlinked: true, comment: UNLINKED },
      ],
    });
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.called).toBe(false);
    expect(calls).toHaveLength(2);
    const reread = await db.readReview('continuity-user', analyzed.record.reviewId);
    expect(reread?.parentReviewId).toBe(first.record.reviewId);
    expect(reread?.callCount).toBe(1);
    db.close();
  });
});
