import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  buildFirstReviewRequest,
  buildProductReanalysisRequest,
  consultingQuestions,
  pairConsultingStage,
  parseFeedbackBody,
  parseSections,
  runFirstReview,
  runStageReanalysis,
  saveReviewFeedback,
} from '../ai-pm-review';
import { openAiPmReviewStore, type StoredFeedback } from '../ai-pm-review-store';

const NOW = '2026-10-31T07:40:00.000Z';
const IDEA = '도심 독서 모임. 참가자는 직장인이고 아직 운영 전이다. 가격은 정하지 않았다.';

const FIRST_QUESTIONS = ['누구를 고객으로 하는가?', '가격은 얼마인가?', '어떤 채널로 알리는가?'];
const SECOND_QUESTIONS = ['모임 장소는 어디인가?', '참가 신청은 어떻게 받는가?'];
const THIRD_QUESTIONS = ['주최자는 누구인가?', '운영 요일은 언제인가?'];

function storePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'ai-pm-stage-')), 'reviews.sqlite');
}

function reply(content: string): ChatResponse {
  return {
    id: 'resp-stage',
    model: 'gpt-4o-mini',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 100, outputTokens: 80, totalTokens: 180 },
    usageKnown: true,
    latencyMs: 10,
  };
}

function stageRaw(judgment: string, questions: string[]): string {
  return JSON.stringify({
    summary: '가격은 미확인이라 판단을 유지한다.',
    customer: '직장인',
    problem: '모임 수요가 확인되지 않았다.',
    value: '독서 모임',
    operatingModel: '구상',
    alternatives: '개인 독서',
    differentiation: '미확인',
    payer: '지불자는 확인되지 않았다.',
    revenueModel: '가격은 가설이며 원문에 없다.',
    market: '수요 조사는 입력에 없다.',
    competition: '경쟁은 확인되지 않았다.',
    operations: '운영은 구상이다.',
    profitability: '수익성은 확인되지 않았다.',
    judgment,
    nextVerification: '지불 의사를 확인한다.',
    nextQuestion: questions[0],
    nextQuestionReason: '지불 확인이 다음 판단에 필요하다.',
    strengths: ['모임 구상이 있다'],
    risks: ['수요가 없다'],
    assumptions: ['가격은 확인되지 않았다'],
    evidenceToChange: ['지불 의사'],
    founderFacts: [],
    inferences: ['추론: 지불자는 미확인'],
    choices: ['지불 의사를 먼저 확인한다', '장소를 먼저 확인한다'],
    questions,
  });
}

function userPayload(request: ChatRequest): Record<string, unknown> {
  return JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<string, unknown>;
}

function feedback(partial: Partial<StoredFeedback> & Pick<StoredFeedback, 'comment'>): StoredFeedback {
  return {
    feedbackId: partial.feedbackId ?? 'feedback-1',
    reviewId: 'review-1',
    userId: 'user-stage',
    agreement: 'need_info',
    accuracy: 'hard_to_compare',
    revisionAreas: ['other'],
    nextAction: 'verify_hypotheses',
    marks: [],
    choiceAnswer: null,
    submittedAt: NOW,
    modelCalls: 0,
    ...partial,
  };
}

describe('consulting stage batch', () => {
  it('stores N questions from one first response and falls back to nextQuestion', () => {
    const request = buildFirstReviewRequest(IDEA);
    const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(user).toContain('questions');
    expect(system).toContain('questions');
    expect(request.responseFormat).toEqual({ type: 'json_object' });
    const parsed = parseSections(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS), IDEA);
    expect(consultingQuestions(parsed).map((item) => item.questionId)).toEqual(['q1', 'q2', 'q3']);
    expect(consultingQuestions(parsed).map((item) => item.text)).toEqual(FIRST_QUESTIONS);
    const single = parseSections(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', ['누구를 고객으로 하는가?']).replace(',"questions":["누구를 고객으로 하는가?"]', ''), IDEA);
    expect(consultingQuestions(single)).toEqual([{ questionId: 'q1', text: '누구를 고객으로 하는가?' }]);
  });

  it('links an answer to its question and does not spread one unlabeled answer across the stage', () => {
    const questions = FIRST_QUESTIONS.map((text, index) => ({ questionId: `q${index + 1}`, text }));
    const open = parseFeedbackBody({ reviewId: 'review-1', questionId: 'q3', comment: '온라인 게시로 알린다' });
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    expect(open.value.questionId).toBe('q3');
    expect(open.value.choiceAnswer).toBeNull();
    expect(parseFeedbackBody({ reviewId: 'review-1', comment: '온라인 게시로 알린다' }).ok).toBe(false);
    const choice = parseFeedbackBody({
      reviewId: 'review-1',
      questionId: 'q2',
      choiceId: 'c1',
      choiceLabel: '가격은 아직 없다',
      otherText: '가격은 정하지 않았다',
    });
    expect(choice.ok).toBe(true);
    if (!choice.ok) return;
    expect(choice.value.questionId).toBe('q2');
    expect(choice.value.choiceAnswer?.otherText).toBe('가격은 정하지 않았다');
    const pairs = pairConsultingStage(questions, [
      feedback({ feedbackId: 'old', questionId: 'q1', comment: '이전 답' }),
      feedback({ feedbackId: 'new', questionId: 'q1', comment: '직장인을 고객으로 본다' }),
      feedback({
        feedbackId: 'price',
        questionId: 'q2',
        comment: '가격은 정하지 않았다',
        choiceAnswer: { choiceId: 'c1', label: '가격은 아직 없다', otherText: '가격은 정하지 않았다' },
      }),
    ]);
    expect(pairs.map((pair) => pair.status)).toEqual(['answered', 'answered', 'open']);
    expect(pairs[0]).toMatchObject({ questionId: 'q1', question: FIRST_QUESTIONS[0], supplement: '직장인을 고객으로 본다' });
    expect(pairs[1]).toMatchObject({ questionId: 'q2', choiceLabel: '가격은 아직 없다', supplement: '가격은 정하지 않았다' });
    const unlabeled = pairConsultingStage(questions, [feedback({ comment: '직장인을 고객으로 본다' })]);
    expect(unlabeled.every((pair) => pair.status === 'open')).toBe(true);
    const legacy = pairConsultingStage([{ questionId: 'q1', text: '누구인가?' }], [feedback({ comment: '직장인' })]);
    expect(legacy).toEqual([
      { questionId: 'q1', question: '누구인가?', choiceLabel: null, supplement: '직장인', status: 'answered' },
    ]);
  });

  it('keeps the one-answer request free of a stage batch', () => {
    const sections = parseSections(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS), IDEA);
    expect(sections).not.toBeNull();
    if (!sections) return;
    const request = buildProductReanalysisRequest({
      originalInput: IDEA,
      firstAnalysis: sections,
      priorTurns: [],
      latestAnalysis: sections,
      founderChoice: null,
      founderSupplement: '직장인을 고객으로 본다',
      founderFeedback: null,
    });
    const payload = userPayload(request);
    expect(payload.stagePairs).toBeUndefined();
    expect(payload.thisAnswer).toMatchObject({ supplement: '직장인을 고객으로 본다' });
  });

  it('collects N answers with no model call, then sends one paired reanalysis and repeats', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const firstJudgment = '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const secondJudgment = '직장인을 고객으로 본다는 계획과 가격이 없다는 답을 함께 보았다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const thirdJudgment = '장소와 신청 방법이 계획으로 남는다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const fourthJudgment = '주최와 요일이 계획으로 남는다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const index = calls.length;
      if (index === 1) return reply(stageRaw(firstJudgment, FIRST_QUESTIONS));
      if (index === 2) return reply(stageRaw(secondJudgment, SECOND_QUESTIONS));
      if (index === 3) return reply(stageRaw(thirdJudgment, THIRD_QUESTIONS));
      return reply(stageRaw(fourthJudgment, ['홍보 문구는 무엇인가?', '첫 모임 인원은 몇 명인가?']));
    };
    const first = await runFirstReview({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      text: IDEA,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(first.called).toBe(true);
    expect(first.record.callCount).toBe(1);
    expect(consultingQuestions(first.record.sections).map((item) => item.text)).toEqual(FIRST_QUESTIONS);
    const parentFinishedAt = first.record.finishedAt;

    const saved = await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: first.record.reviewId, questionId: 'q1', comment: '직장인을 고객으로 본다' },
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.feedback.modelCalls).toBe(0);
    const blocked = await runStageReanalysis({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      reviewId: first.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(blocked).toEqual({ ok: false, error: 'stage_incomplete' });
    expect(calls).toHaveLength(1);

    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: {
        reviewId: first.record.reviewId,
        questionId: 'q2',
        choiceId: 'c1',
        choiceLabel: '가격은 아직 없다',
        otherText: '가격은 정하지 않았다',
      },
    });
    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: first.record.reviewId, questionId: 'q3', comment: '온라인 게시로 알린다' },
    });
    expect(calls).toHaveLength(1);

    const integrated = await runStageReanalysis({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      reviewId: first.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(integrated.ok).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.called).toBe(true);
    expect(calls).toHaveLength(2);
    expect(integrated.record.callCount).toBe(1);
    expect(integrated.record.parentReviewId).toBe(first.record.reviewId);
    expect(integrated.record.stageAnswers).toEqual([
      {
        questionId: 'q1',
        question: FIRST_QUESTIONS[0],
        choiceLabel: null,
        supplement: '직장인을 고객으로 본다',
        status: 'answered',
      },
      {
        questionId: 'q2',
        question: FIRST_QUESTIONS[1],
        choiceLabel: '가격은 아직 없다',
        supplement: '가격은 정하지 않았다',
        status: 'answered',
      },
      {
        questionId: 'q3',
        question: FIRST_QUESTIONS[2],
        choiceLabel: null,
        supplement: '온라인 게시로 알린다',
        status: 'answered',
      },
    ]);
    expect(integrated.record.stagePartial).toBeUndefined();
    expect(consultingQuestions(integrated.record.sections).map((item) => item.text)).toEqual(SECOND_QUESTIONS);
    expect(integrated.record.sections?.analysis?.judgmentDetail).toBe(secondJudgment);
    const firstPayload = userPayload(calls[1]!);
    expect(firstPayload.originalInput).toBe(IDEA);
    expect(JSON.stringify(firstPayload)).toContain(firstJudgment);
    expect(firstPayload.thisAnswer).toBeUndefined();
    expect(firstPayload.stagePartial).toBe(false);
    expect(firstPayload.priorStagePairs).toEqual([]);
    expect(firstPayload.stagePairs).toEqual(integrated.record.stageAnswers);
    const again = await runStageReanalysis({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      reviewId: first.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(again.ok && again.called).toBe(false);
    expect(calls).toHaveLength(2);
    expect((await store.readReview('user-stage', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);

    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: integrated.record.reviewId, questionId: 'q1', comment: '도서관 회의실을 장소로 본다' },
    });
    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: integrated.record.reviewId, questionId: 'q2', comment: '온라인 양식으로 신청을 받는다' },
    });
    const second = await runStageReanalysis({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      reviewId: integrated.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(calls).toHaveLength(3);
    expect(second.record.callCount).toBe(1);
    expect(second.record.stageAnswers).toHaveLength(2);
    const secondPayload = userPayload(calls[2]!);
    expect(secondPayload.originalInput).toBe(IDEA);
    expect(JSON.stringify(secondPayload)).toContain(firstJudgment);
    expect(JSON.stringify(secondPayload)).toContain(secondJudgment);
    expect(secondPayload.priorStagePairs).toEqual(integrated.record.stageAnswers);
    expect(secondPayload.stagePairs).toEqual(second.record.stageAnswers);
    expect((secondPayload.stagePairs as Array<{ questionId: string; supplement: string }>)[0]).toMatchObject({
      questionId: 'q1',
      question: SECOND_QUESTIONS[0],
      supplement: '도서관 회의실을 장소로 본다',
    });

    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: second.record.reviewId, questionId: 'q1', comment: '주최는 본인이다' },
    });
    await saveReviewFeedback({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      now: NOW,
      body: { reviewId: second.record.reviewId, questionId: 'q2', comment: '토요일에 연다' },
    });
    const third = await runStageReanalysis({
      store,
      userId: 'user-stage',
      projectId: 'project-stage',
      reviewId: second.record.reviewId,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(calls).toHaveLength(4);
    expect(third.record.callCount).toBe(1);
    const thirdPayload = userPayload(calls[3]!);
    expect(thirdPayload.priorStagePairs).toHaveLength(5);
    expect(thirdPayload.stagePairs).toHaveLength(2);
    expect((await store.readReview('user-stage', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);
    expect((await store.readReview('user-stage', integrated.record.reviewId))?.finishedAt).toBe(integrated.record.finishedAt);
  });

  it('treats an explicit partial analysis as a separate call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const first = await runFirstReview({
      store,
      userId: 'user-partial',
      projectId: 'project-partial',
      text: `${IDEA} 부분 분석.`,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async (request) => {
        calls.push(request);
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      },
      evidence: 'injected_http',
    });
    await saveReviewFeedback({
      store,
      userId: 'user-partial',
      projectId: 'project-partial',
      now: NOW,
      body: { reviewId: first.record.reviewId, questionId: 'q1', comment: '직장인을 고객으로 본다' },
    });
    const partial = await runStageReanalysis({
      store,
      userId: 'user-partial',
      projectId: 'project-partial',
      reviewId: first.record.reviewId,
      now: NOW,
      allowPartial: true,
      chat: async (request) => {
        calls.push(request);
        return reply(stageRaw('고객 답만 반영해 판단을 유지한다. 이유는 나머지 답이 없기 때문이다.', SECOND_QUESTIONS));
      },
      evidence: 'injected_http',
    });
    expect(partial.ok).toBe(true);
    if (!partial.ok) return;
    expect(calls).toHaveLength(2);
    expect(partial.record.callCount).toBe(1);
    expect(partial.record.stagePartial).toBe(true);
    expect(partial.record.stageAnswers).toHaveLength(1);
    const payload = userPayload(calls[1]!);
    expect(payload.stagePartial).toBe(true);
    expect(payload.stagePairs).toEqual([
      {
        questionId: 'q1',
        question: FIRST_QUESTIONS[0],
        choiceLabel: null,
        supplement: '직장인을 고객으로 본다',
        status: 'answered',
      },
      { questionId: 'q2', question: FIRST_QUESTIONS[1], choiceLabel: null, supplement: '', status: 'open' },
      { questionId: 'q3', question: FIRST_QUESTIONS[2], choiceLabel: null, supplement: '', status: 'open' },
    ]);
  });

  it('leaves the follow-up route as one supplement per call', () => {
    const route = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    expect(route).toContain('runFollowUpReview');
    expect(route).not.toContain('runStageReanalysis');
  });
});
