import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  AI_PM_REVIEW_MODEL,
  buildProductReanalysisRequest,
  consultingQuestions,
  submitConsultingStage,
  runFirstReview,
  type ContinuityStatement,
} from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections, type StagePair, type StagePriorReading, type StoredFeedback } from '../ai-pm-review-store';

const NOW = '2026-11-02T00:00:00.000Z';
const IDEA =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 전통주 양조장 체험을 안내하는 사업을 구상 중이다.';
const QUESTION = '양조장과의 협력 가능성을 어떻게 확인할 것인가?';
const PRICE_QUESTION = '체험 가격을 언제 정할 계획인가?';
const UNLINKED = 'SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.';
const EXTRA = '축제 일정은 다음 달로 생각하고 있다.';
const COOPERATION = '협력 방법은 정하지 않았다.';
const PRICE = '가격은 아직 정하지 않았다.';
const PLACE = '장소 수용은 아직 모른다.';
const STAFF = '안내 인력은 아직 정하지 못했다.';

const NEXT = [
  {
    text: '체험 장소의 수용 인원을 확인했는가?',
    purpose: '장소 수용은 협력과 가격과 다른 빈칸이다',
    choices: ['수용 인원을 먼저 적는다', '수용 인원은 아직 모른다'],
    judgment: '이번 답은 구상과 가격 미정만 말했다. 계약 문서는 없다.',
    unresolved: '가격과 협력은 서로 다른 빈칸으로 남는다',
  },
  {
    text: '안내 인력은 누구로 둘 계획인가?',
    purpose: '안내 인력은 장소 수용과 다른 빈칸이다',
    choices: ['안내 인력을 먼저 적는다', '안내 인력은 아직 모른다'],
    judgment: '장소 쪽 기록은 아직 없다. 협력 문서는 늘지 않았다.',
    unresolved: '장소 수용은 아직 빈칸이다',
  },
  {
    text: '예약 취소 규칙은 정했는가?',
    purpose: '취소 규칙은 안내 인력과 다른 빈칸이다',
    choices: ['취소 규칙을 먼저 적는다', '취소 규칙은 아직 모른다'],
    judgment: '인력 계획은 아직 없다. 수용 인원 기록도 없다.',
    unresolved: '안내 인력은 아직 빈칸이다',
  },
];

function store() {
  return openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'e2e-continuity-')), 'reviews.sqlite'));
}

function reply(content: string): ChatResponse {
  return {
    id: 'resp-e2e',
    model: AI_PM_REVIEW_MODEL,
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 20, outputTokens: 20, totalTokens: 40 },
    usageKnown: true,
    latencyMs: 1,
  };
}

function userJson(request: ChatRequest): Record<string, unknown> {
  return JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<string, unknown>;
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
      {
        text: PRICE_QUESTION,
        choices: ['가격 기준을 먼저 적는다.', '아직 정하지 못했다.', '기타 / 직접 입력'],
      },
    ],
  });
}

function stageRaw(request: ChatRequest, round: (typeof NEXT)[number]): string {
  const payload = userJson(request);
  const pairs = ((payload.stagePairs ?? []) as Array<{ questionId: string; choiceId: string | null; status: string; choiceLabel?: string | null; supplement?: string }>).filter(
    (pair) => pair.status === 'answered',
  );
  const continuesObjectiveId =
    (payload.verificationObjectives as { unresolved?: Array<{ objectiveId?: string }> } | undefined)?.unresolved?.find((row) => row.objectiveId)
      ?.objectiveId ?? '';
  const cites = pairs
    .map((pair) => (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim())
    .filter((text) => text.replace(/\s+/g, '').length >= 2);
  const nextQuestions = [
    {
      text: round.text,
      choices: round.choices,
      verificationPurpose: round.purpose,
      reaskReason: null,
      ...(continuesObjectiveId ? { continuesObjectiveId } : {}),
    },
  ];
  return JSON.stringify({
    answerInterpretation: pairs.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 새 정보와 미정을 말한다`,
      founderBasis: `${pair.questionId}에서 창업자가 말한 범위는 입력에 적힌 구상이다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의 기록은 없다`,
      judgmentEffect: `${pair.questionId} 답으로 성공 가능성은 높아지지 않았다. 실행은 유보한다.`,
      openRisk: `${pair.questionId}의 남은 빈칸은 아직 확인되지 않았다`,
    })),
    impactOnPreviousJudgment: `${round.unresolved} 이번 답의 영향은 직전 문장과 다르다.`,
    updatedJudgment: round.judgment,
    judgmentReason: `${round.purpose} 그래서 실행은 유보한다. 이번 답 ${cites.join(' ')}을 확인했다. 남은 불확실성은 협력이다.`,
    answerEvidence: pairs.map((pair) => ({
      questionKey: (pair as { questionKey?: string }).questionKey || pair.questionId,
      answerText: (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim(),
      provenance: /^\s*SIMULATION\b/m.test(`${pair.choiceLabel ?? ''}\n${pair.supplement ?? ''}`) ? 'SIMULATION' : 'FOUNDER_INPUT',
      epistemicStatus: 'FOUNDER_CLAIM',
    })),
    verifiedFacts: [],
    unverifiedClaims: [COOPERATION],
    assumptions: ['협력은 확인되지 않았다'],
    resolvedIssues: [],
    unresolvedIssues: [round.unresolved],
    nextVerification: round.purpose,
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

function choice(questionId: string, comment: string) {
  return { questionId, choiceId: 'c2', choiceLabel: '아직 정하지 못했다.', comment };
}

describe('end to end consulting continuity', () => {
  it('carries one brewery context across four stub rounds without a live model', async () => {
    const db = store();
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const round = NEXT[calls.length - 2];
      return reply(round ? stageRaw(request, round) : firstRaw());
    };
    const first = await runFirstReview({
      store: db,
      userId: 'e2e-user',
      projectId: 'e2e-brewery',
      text: IDEA,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(first.record.status).toBe('succeeded');
    expect(first.record.model).toBe(AI_PM_REVIEW_MODEL);
    expect(consultingQuestions(first.record.sections).map((question) => question.questionId)).toEqual(['q1', 'q2']);
    expect(consultingQuestions(first.record.sections)[0]?.choices?.map((item) => item.id)).toEqual(['c1', 'c2', 'other']);
    const base = {
      store: db,
      userId: 'e2e-user',
      projectId: 'e2e-brewery',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const partial = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [choice('q1', COOPERATION), { questionId: 'q9', comment: EXTRA }],
    });
    expect(partial.ok && partial.called).toBe(false);
    expect(partial.ok && partial.pending).toBe(true);
    expect(calls).toHaveLength(1);
    const open = await db.listFeedback('e2e-user', first.record.reviewId);
    expect(open.find((item) => item.questionId === 'q1')?.choiceAnswer).toMatchObject({ choiceId: 'c2', label: '아직 정하지 못했다.' });
    expect(open.some((item) => item.choiceAnswer?.choiceId === 'c1')).toBe(false);
    expect(open.find((item) => item.comment === EXTRA)).toMatchObject({
      questionId: null,
      unlinked: true,
      provenance: 'FOUNDER_INPUT',
      epistemicStatus: 'FOUNDER_CLAIM',
      modelCalls: 0,
    });

    const second = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [
        choice('q2', PRICE),
        { unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT', epistemicStatus: 'VERIFIED_FACT' },
        { unlinked: true, comment: ` ${UNLINKED} ` },
      ],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.record.error).toBeNull();
    expect(second.called).toBe(true);
    expect(second.record.status).toBe('succeeded');
    expect(second.record.parentReviewId).toBe(first.record.reviewId);
    expect(second.record.callCount).toBe(1);
    expect(consultingQuestions(second.record.sections).map((question) => question.text)).toEqual([NEXT[0].text]);
    const round2 = userJson(calls[1] ?? { model: AI_PM_REVIEW_MODEL, messages: [] });
    expect(round2.originalInput).toBe(IDEA);
    expect(JSON.stringify(round2.firstAnalysis)).toContain('전통주 양조장에 관심 있는 관광객');
    expect(JSON.stringify(round2.stagePairs)).toContain(COOPERATION);
    expect(JSON.stringify(round2.stagePairs)).toContain(PRICE);
    expect(JSON.stringify(round2.stagePairs)).not.toContain(UNLINKED);
    expect(JSON.stringify(round2.stagePairs)).not.toContain(EXTRA);
    const round2Pairs = round2.stagePairs as Array<{ questionId: string; choiceId: string | null; offeredChoices: Array<{ choiceId: string }> }>;
    expect(round2Pairs.find((pair) => pair.questionId === 'q1')?.choiceId).toBe('c2');
    expect(round2Pairs.find((pair) => pair.questionId === 'q1')?.offeredChoices.map((item) => item.choiceId)).toEqual(['c1', 'c2', 'other']);
    const round2Unlinked = round2.unlinkedStatements as Array<{ text: string; questionId: string | null; provenance: string; epistemicStatus: string }>;
    expect(round2Unlinked.map((item) => item.text).sort()).toEqual([EXTRA, UNLINKED].sort());
    expect(round2Unlinked.find((item) => item.text === UNLINKED)).toMatchObject({
      questionId: null,
      provenance: 'SIMULATION',
      epistemicStatus: 'FOUNDER_CLAIM',
    });
    expect(round2Unlinked.some((item) => item.epistemicStatus === 'VERIFIED_FACT')).toBe(false);

    const duplicate = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [choice('q1', COOPERATION), choice('q2', PRICE), { unlinked: true, comment: UNLINKED }, { questionId: 'q9', comment: EXTRA }],
    });
    expect(duplicate.ok && duplicate.called).toBe(false);
    expect(calls).toHaveLength(2);

    const third = await submitConsultingStage({
      ...base,
      reviewId: second.record.reviewId,
      answers: [choice('q1', PLACE), { unlinked: true, comment: UNLINKED }, { comment: EXTRA }],
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.record.error).toBeNull();
    expect(third.called).toBe(true);
    expect(third.record.parentReviewId).toBe(second.record.reviewId);
    expect(consultingQuestions(third.record.sections).map((question) => question.text)).toEqual([NEXT[1].text]);
    const round3 = userJson(calls[2] ?? { model: AI_PM_REVIEW_MODEL, messages: [] });
    const round3Text = JSON.stringify(round3);
    expect(round3.originalInput).toBe(IDEA);
    expect(round3Text).toContain(COOPERATION);
    expect(round3Text).toContain(PRICE);
    expect(round3Text).toContain(PLACE);
    expect(round3Text).toContain(UNLINKED);
    expect(round3Text).toContain(EXTRA);
    expect(round3Text).toContain(QUESTION);
    expect(round3Text).toContain(NEXT[0].text);
    expect(round3Text).toContain(NEXT[0].judgment);
    const round3Unlinked = round3.unlinkedStatements as Array<{ text: string }>;
    expect(round3Unlinked).toHaveLength(2);
    const round3Current = round3.stagePairs as Array<{ supplement: string; question: string; choiceId: string | null; choiceLabel: string | null }>;
    expect(round3Current).toEqual([
      expect.objectContaining({ supplement: PLACE, choiceId: 'c2', choiceLabel: '수용 인원은 아직 모른다' }),
    ]);
    expect(JSON.stringify(round3.priorStagePairs)).toContain(COOPERATION);

    const fourth = await submitConsultingStage({
      ...base,
      reviewId: third.record.reviewId,
      answers: [choice('q1', STAFF)],
    });
    expect(fourth.ok).toBe(true);
    if (!fourth.ok) return;
    expect(fourth.record.error).toBeNull();
    expect(fourth.called).toBe(true);
    expect(fourth.record.parentReviewId).toBe(third.record.reviewId);
    expect(consultingQuestions(fourth.record.sections).map((question) => question.text)).toEqual([NEXT[2].text]);
    expect(consultingQuestions(fourth.record.sections)[0]?.choices?.map((item) => item.id)).toEqual(['c1', 'c2']);
    const round4 = userJson(calls[3] ?? { model: AI_PM_REVIEW_MODEL, messages: [] });
    const round4Text = JSON.stringify(round4);
    expect(round4.originalInput).toBe(IDEA);
    expect(round4Text).toContain(COOPERATION);
    expect(round4Text).toContain(PRICE);
    expect(round4Text).toContain(PLACE);
    expect(round4Text).toContain(STAFF);
    expect(round4Text).toContain(UNLINKED);
    expect(round4Text).toContain(NEXT[0].judgment);
    expect(round4Text).toContain(NEXT[1].judgment);
    expect(round4.stagePairs).toEqual([
      expect.objectContaining({ supplement: STAFF, choiceId: 'c2', choiceLabel: '안내 인력은 아직 모른다' }),
    ]);
    expect(JSON.stringify(round4.priorStagePairs)).toContain(PLACE);
    const links = round4.answerLinks as Array<{ sourceReviewId: string; questionId: string; supplement: string }>;
    expect(links.filter((link) => link.questionId === 'q1').map((link) => link.sourceReviewId)).toEqual([
      first.record.reviewId,
      second.record.reviewId,
      third.record.reviewId,
    ]);

    const again = await submitConsultingStage({
      ...base,
      reviewId: third.record.reviewId,
      answers: [choice('q1', STAFF), { unlinked: true, comment: UNLINKED }],
    });
    expect(again.ok && again.called).toBe(false);
    expect(calls).toHaveLength(4);
    expect(calls.every((request) => request.model === AI_PM_REVIEW_MODEL)).toBe(true);

    const reviews = await db.listReviews('e2e-user', 'e2e-brewery');
    const feedback: StoredFeedback[] = [];
    for (const review of reviews) feedback.push(...(await db.listFeedback('e2e-user', review.reviewId)));
    expect(feedback.filter((item) => item.unlinked && item.comment === UNLINKED)).toHaveLength(1);
    expect(feedback.filter((item) => item.unlinked && item.comment === EXTRA)).toHaveLength(1);
    const reread = await db.readReview('e2e-user', fourth.record.reviewId);
    expect(reread?.parentReviewId).toBe(third.record.reviewId);
    expect(reread?.sections?.nextQuestion).toBe(NEXT[2].text);
    expect(reread?.callCount).toBe(1);
    expect(reviews.filter((review) => review.status === 'succeeded')).toHaveLength(4);
    expect(reviews.reduce((sum, review) => sum + (review.totalTokens ?? 0), 0)).toBe(160);
    db.close();
  });

  it('drops old analysis briefs and keeps the idea, answers, and unlinked text', () => {
    const judgment = '최초 판단: 체험 상품과 공급 양조장이 아직 연결되지 않았다';
    const sections: ReviewSections = {
      customer: '전통주를 좋아하는 관광객',
      problem: '체험을 제공할 양조장 연결이 확인되지 않았다',
      market: '시장 크기는 입력에 없다',
      revenueModel: '수익 구조는 가설이며 원문에 없다',
      execution: '운영은 아직 구상이다',
      risks: ['공급 계약이 없다'],
      uncertain: ['공급 연결은 확인되지 않았다'],
      hypotheses: ['공급 연결은 확인되지 않았다'],
      judgment,
      nextQuestion: QUESTION,
      nextQuestionReason: '연결이 없으면 체험 상품을 실행할 수 없다',
      answerHint: '선택하거나 직접 적습니다.',
      claimConfirmation: null,
      analysis: {
        summary: judgment,
        value: '양조장 체험을 안내한다',
        operatingModel: '구상',
        payer: '지불자는 확인되지 않았다',
        competition: '경쟁은 확인되지 않았다',
        operations: '운영은 아직 구상이다',
        profitability: '수익성은 확인되지 않았다',
        strengths: ['체험 구상이 있다'],
        assumptions: ['공급 연결은 확인되지 않았다'],
        evidenceToChange: ['양조장 접촉'],
        founderFacts: [],
        inferences: ['체험 수요는 가설이다'],
        judgmentDetail: judgment,
        choices: [{ id: 'c2', label: '아직 정하지 못했다.' }],
        product: '양조장 체험 안내',
        supply: '공급 양조장은 아직 없다',
        marketing: '온라인 마케팅 지원은 구상이다',
        alternatives: '',
        differentiation: '',
        nextVerification: '공급 연결을 확인한다',
      },
    };
    const pair: StagePair = {
      questionId: 'q1',
      question: QUESTION,
      offeredChoices: [{ choiceId: 'c2', label: '아직 정하지 못했다.' }],
      choiceId: 'c2',
      choiceLabel: '아직 정하지 못했다.',
      supplement: COOPERATION,
      status: 'answered',
    };
    const reading: StagePriorReading = {
      reviewId: 'core-review',
      judgment,
      judgmentReason: '확인된 협력이 없어 실행은 유보한다',
      impactOnPreviousJudgment: '최초 방향은 유지되고 공급은 아직 비어 있다',
      resolvedIssues: [],
      unresolvedIssues: ['공급 계약은 확인되지 않았다'],
      customer: sections.customer,
      problem: sections.problem,
      revenueModel: sections.revenueModel,
      product: '양조장 체험 안내',
      supply: '공급 양조장은 아직 없다',
      marketing: '온라인 마케팅 지원은 구상이다',
      nextQuestion: QUESTION,
    };
    const unlinked: ContinuityStatement = {
      feedbackId: 'extra-1',
      questionId: null,
      choiceId: null,
      text: UNLINKED,
      submittedAt: NOW,
      provenance: 'SIMULATION',
      epistemicStatus: 'FOUNDER_CLAIM',
      evidenceId: null,
    };
    const linked: ContinuityStatement = { ...unlinked, feedbackId: 'answer-1', questionId: 'q1', choiceId: 'c2', text: COOPERATION, provenance: 'FOUNDER_INPUT' };
    const filler = Array.from({ length: 8 }, (_, index) => ({
      reviewId: `drop-${index}`,
      judgment: `DROP_OLD_${index}`,
      nextQuestion: `DROP_OLD_Q_${index}`,
      assumptions: [`DROP_OLD_ASSUMPTION_${index} ${'과거 세부 문장 '.repeat(4000)}`],
      risks: [`DROP_OLD_RISK_${index}`],
    }));
    const request = buildProductReanalysisRequest({
      originalInput: IDEA,
      firstAnalysis: sections,
      priorTurns: [],
      priorAnalyses: filler,
      previousQuestions: [QUESTION],
      latestAnalysis: sections,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [pair],
      priorStagePairs: [pair],
      answerLinks: [
        {
          sourceReviewId: 'core-review',
          questionId: 'q1',
          question: QUESTION,
          choiceId: 'c2',
          choiceLabel: '아직 정하지 못했다.',
          supplement: COOPERATION,
          submittedAt: NOW,
          status: 'answered',
        },
      ],
      priorReadings: [reading],
      unlinkedStatements: [unlinked],
      answerRecords: [linked],
    });
    const payload = userJson(request);
    const serialized = JSON.stringify(payload);
    expect(payload.originalInput).toBe(IDEA);
    expect(serialized).toContain(UNLINKED);
    expect(serialized).toContain(COOPERATION);
    expect(serialized).toContain(judgment);
    expect(serialized).not.toContain('DROP_OLD_0');
    expect(payload.priorAnalyses).toEqual([]);
    expect(payload.unlinkedStatements).toHaveLength(1);
    expect(payload.answerRecords).toHaveLength(1);
    expect(request.model).toBe('gpt-4o-mini');
  });
});
