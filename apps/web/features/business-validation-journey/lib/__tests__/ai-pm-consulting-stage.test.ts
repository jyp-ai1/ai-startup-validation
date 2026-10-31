import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import { AiPmReviewPanel } from '../../components/ai-pm-review-panel';
import { composeReviewInput } from '../ai-pm-review-intake';
import {
  acceptedStageQuestions,
  buildEvidenceLedger,
  buildFirstReviewRequest,
  buildProductReanalysisRequest,
  consultingQuestions,
  founderAnswerKinds,
  pairConsultingStage,
  parseFeedbackBody,
  parseSections,
  runFirstReview,
  runStageReanalysis,
  saveReviewFeedback,
  submitConsultingStage,
  type AiPmReviewView,
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

function requestPayload(request: ChatRequest): Record<string, unknown> | null {
  const content = request.messages.find((message) => message.role === 'user')?.content ?? '';
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function contractReply(request: ChatRequest, judgment: string, questions: string[]): string {
  const payload = requestPayload(request);
  if (!payload || !Array.isArray(payload.stagePairs)) return stageRaw(judgment, questions);
  const pairs = payload.stagePairs as Array<{ questionId: string; choiceId: string | null; status: string }>;
  const answered = pairs.filter((pair) => pair.status === 'answered');
  const nextQuestions = questions.map((text) => ({
    text,
    choices: [`${text} 쪽을 먼저 본다`, `${text} 쪽은 아직 정하지 못했다`],
  }));
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 선택의 의미`,
    })),
    impactOnPreviousJudgment: '이번 답이 기존 판단에 준 영향이다.',
    updatedJudgment: judgment,
    judgmentReason: '지불 확인이 없어 판단을 유지한다.',
    verifiedFacts: [],
    unverifiedClaims: [],
    assumptions: ['가격은 확인되지 않았다'],
    resolvedIssues: [],
    unresolvedIssues: ['지불 의사는 확인되지 않았다'],
    nextVerification: '지불 의사를 확인한다.',
    nextQuestions,
    nextQuestionChoices: nextQuestions.map((item) => item.choices),
  });
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
    expect(user).toContain('questions가 없거나 비어 있으면 상담 단계가 아니다');
    expect(user).not.toContain('하나면 상담 단계가 아니다');
    expect(system).toContain('questions');
    expect(system).toContain('질문이 없거나 배열이 없으면 상담 단계가 아니다');
    expect(system).not.toContain('질문이 하나이거나');
    expect(request.responseFormat?.type).toBe('json_schema');
    if (request.responseFormat?.type === 'json_schema') {
      const questions = request.responseFormat.schema.properties as {
        questions: { type: string; minItems: number; items: { required: string[]; properties: { choices: { minItems: number } } } };
      };
      expect(questions.questions.type).toBe('array');
      expect(questions.questions.minItems).toBe(1);
      expect(questions.questions.items.required).toEqual(['text', 'choices']);
      expect(questions.questions.items.properties.choices.minItems).toBe(2);
    }
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
      {
        questionId: 'q1',
        question: '누구인가?',
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '직장인',
        status: 'answered',
      },
    ]);
    expect(pairs[1]?.choiceId).toBe('c1');
    expect(pairs[1]?.offeredChoices).toEqual([]);
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
    expect(payload.answerReading).toBeUndefined();
    expect(payload.thisAnswer).toMatchObject({ supplement: '직장인을 고객으로 본다' });
  });

  it('labels stored brewery answers without turning the cooperation claim into a fact', () => {
    expect(
      founderAnswerKinds({ choiceLabel: '양조장과의 협력 가능성이 높다.', supplement: '양조장과의 협력 가능성이 높다.' }),
    ).toEqual(['claim', 'choice']);
    expect(founderAnswerKinds({ choiceLabel: null, supplement: '양조장과의 협력 가능성이 높다.' })).toEqual(['claim']);
    expect(
      founderAnswerKinds({
        choiceLabel: '양조장과의 협력 방안 구체화',
        supplement: '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
      }),
    ).toEqual(['plan', 'choice']);
    expect(
      founderAnswerKinds({
        choiceLabel: '아직 떠오르는 양조장이 없다',
        supplement: '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.',
      }),
    ).toEqual(['fact', 'choice']);
    expect(
      founderAnswerKinds({
        choiceLabel: '양조장 후보 선정 기준을 구체화한다.',
        supplement: '체험으로 만들고 마실 수 있는 양조장인지를 기준으로 후보를 고르겠다. 그 기준에 맞는 양조장은 아직 정하지 못했다.',
      }),
    ).toEqual(['fact', 'plan', 'choice']);
    const ledger = buildEvidenceLedger({
      consultingPath: [],
      founderSupplement: '양조장과의 협력 가능성이 높다.\n양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
    });
    expect(ledger.verifiedFacts).toEqual([]);
    expect(ledger.founderClaims).toEqual([]);
    const sections = parseSections(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS), IDEA);
    expect(sections).not.toBeNull();
    if (!sections) return;
    const request = buildProductReanalysisRequest({
      originalInput: IDEA,
      firstAnalysis: sections,
      latestAnalysis: sections,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      experimentRecords: [{ reviewId: 'exp-1', supplement: '반복 실험', role: 'repeat_experiment' }],
      failedCalls: [{ reviewId: 'fail-1', role: 'failed_call' }],
      priorTurns: [
        {
          question: '실험 질문',
          choiceLabel: null,
          supplement: '실험 답',
          judgment: '실험 판단',
          nextVerification: '',
          nextQuestion: '실험 질문',
        },
      ],
      stagePairs: [
        {
          questionId: 'hist-1',
          question: '어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?',
          offeredChoices: [{ choiceId: 'c1', label: '양조장과의 협력 가능성이 높다.' }],
          choiceId: 'c1',
          choiceLabel: '양조장과의 협력 가능성이 높다.',
          supplement: '양조장과의 협력 가능성이 높다.',
          status: 'answered',
        },
      ],
    });
    const stagePayload = userPayload(request);
    const stageLedger = stagePayload.evidenceLedger as { verifiedFacts: string[]; founderClaims: string[]; stillUnknown: string[] };
    expect(stageLedger.verifiedFacts).toEqual([]);
    expect(stageLedger.founderClaims).toEqual(['양조장과의 협력 가능성이 높다.']);
    expect(stageLedger.stillUnknown).toEqual([]);
    expect(stagePayload.answerReading).toEqual([{ questionId: 'hist-1', kinds: ['claim', 'choice'] }]);
    expect(stagePayload.thisAnswer).toBeUndefined();
    expect(stagePayload.verificationStage).toBeUndefined();
    expect(stagePayload.experimentRecords).toBeUndefined();
    expect(stagePayload.failedCalls).toBeUndefined();
    expect(stagePayload.priorTurns).toBeUndefined();
    expect(JSON.stringify(stagePayload.stagePairs)).toContain('offeredChoices');
    expect(JSON.stringify(stagePayload.stagePairs)).not.toContain('priorChoices');
    expect(stagePayload.stagePairs).toMatchObject([
      { choiceId: 'c1', offeredChoices: [{ choiceId: 'c1', label: '양조장과의 협력 가능성이 높다.' }] },
    ]);
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).toContain('answerInterpretation');
    expect(system).toContain('choiceLabel만 반복하면 해석이 아니다');
    expect(system).toContain('선정 기준');
    expect(system).toContain('잠재력과 현재 확인된 실행 가능성은 별개다');
    expect(system).toContain('진전과 미해결을 먼저 적는다');
    expect(system).not.toContain('verificationStage');
    if (request.responseFormat?.type === 'json_schema') {
      const meaning = request.responseFormat.schema.properties as {
        answerInterpretation: { items: { properties: { meaning: { description: string } } } };
        updatedJudgment: { description: string };
        verifiedFacts: { description: string };
        nextQuestions: { items: { properties: { text: { description: string } } } };
      };
      expect(meaning.answerInterpretation.items.properties.meaning.description).toContain('supplement');
      expect(meaning.updatedJudgment.description).toContain('unverifiedClaims');
      expect(meaning.verifiedFacts.description).toContain('주장');
      expect(meaning.nextQuestions.items.properties.text.description).toContain('선정 기준');
      expect(request.responseFormat.schema.required).toEqual([
        'answerInterpretation',
        'verifiedFacts',
        'unverifiedClaims',
        'assumptions',
        'resolvedIssues',
        'unresolvedIssues',
        'impactOnPreviousJudgment',
        'updatedJudgment',
        'judgmentReason',
        'nextVerification',
        'nextQuestions',
        'nextQuestionChoices',
      ]);
    }
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
      if (index === 1) return reply(contractReply(request, firstJudgment, FIRST_QUESTIONS));
      if (index === 2) return reply(contractReply(request, secondJudgment, SECOND_QUESTIONS));
      if (index === 3) return reply(contractReply(request, thirdJudgment, THIRD_QUESTIONS));
      return reply(contractReply(request, fourthJudgment, ['홍보 문구는 무엇인가?', '첫 모임 인원은 몇 명인가?']));
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
    const siblingSections = structuredClone(first.record.sections);
    if (siblingSections?.analysis) siblingSections.analysis.judgmentDetail = '형제 실험 판단은 상담 이력이 아니다.';
    if (siblingSections) siblingSections.judgment = '형제 실험 판단은 상담 이력이 아니다.';
    expect(
      (
        await store.insertReview({
          ...first.record,
          reviewId: 'sibling-experiment',
          parentReviewId: null,
          version: first.record.version + 40,
          sections: siblingSections,
        })
      ).wrote,
    ).toBe(true);

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
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '직장인을 고객으로 본다',
        status: 'answered',
      },
      {
        questionId: 'q2',
        question: FIRST_QUESTIONS[1],
        offeredChoices: [],
        choiceId: 'c1',
        choiceLabel: '가격은 아직 없다',
        supplement: '가격은 정하지 않았다',
        status: 'answered',
      },
      {
        questionId: 'q3',
        question: FIRST_QUESTIONS[2],
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '온라인 게시로 알린다',
        status: 'answered',
      },
    ]);
    expect(integrated.record.stagePartial).toBeUndefined();
    expect(integrated.record.stageReading?.updatedJudgment).toBe(secondJudgment);
    expect(consultingQuestions(integrated.record.sections).map((item) => item.text)).toEqual(SECOND_QUESTIONS);
    expect(integrated.record.sections?.analysis?.judgmentDetail).toBe(secondJudgment);
    const firstPayload = userPayload(calls[1]!);
    expect(firstPayload.originalInput).toBe(IDEA);
    expect(JSON.stringify(firstPayload)).toContain(firstJudgment);
    expect(firstPayload.thisAnswer).toBeUndefined();
    expect(firstPayload.stagePartial).toBe(false);
    expect(firstPayload.priorStagePairs).toEqual([]);
    expect(firstPayload.stagePairs).toEqual(integrated.record.stageAnswers);
    expect(firstPayload.verificationStage).toBeUndefined();
    expect(firstPayload.experimentRecords).toBeUndefined();
    expect(firstPayload.priorTurns).toBeUndefined();
    expect(JSON.stringify(firstPayload.priorAnalyses ?? [])).not.toContain('형제 실험');
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
        const stage = Array.isArray(requestPayload(request)?.stagePairs);
        return reply(
          contractReply(
            request,
            stage
              ? '고객 답만 반영해 판단을 유지한다. 이유는 나머지 답이 없기 때문이다.'
              : '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.',
            stage ? SECOND_QUESTIONS : FIRST_QUESTIONS,
          ),
        );
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
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '직장인을 고객으로 본다',
        status: 'answered',
      },
      {
        questionId: 'q2',
        question: FIRST_QUESTIONS[1],
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '',
        status: 'open',
      },
      {
        questionId: 'q3',
        question: FIRST_QUESTIONS[2],
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '',
        status: 'open',
      },
    ]);
  });

  it('does not treat a missing question list as a consulting stage, and keeps one listed question', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const missing = stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS).replace(
        /,"questions":\[[^\]]*\]/,
        '',
      );
      return reply(calls.length === 1 ? missing : stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', ['누구를 고객으로 하는가?']));
    };
    const missing = await runFirstReview({
      store,
      userId: 'user-missing',
      projectId: 'project-missing',
      text: `${IDEA} 질문 없음.`,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(missing.called).toBe(true);
    expect(missing.record.status).toBe('failed');
    expect(missing.record.error).toBe('stage_questions_missing');
    expect(missing.record.callCount).toBe(1);
    expect(acceptedStageQuestions(missing.record.sections)).toBe(false);
    expect(consultingQuestions(missing.record.sections)).toEqual([{ questionId: 'q1', text: FIRST_QUESTIONS[0] }]);
    const single = await runFirstReview({
      store,
      userId: 'user-missing',
      projectId: 'project-missing',
      text: `${IDEA} 질문 하나.`,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(single.record.status).toBe('succeeded');
    expect(single.record.error).toBeNull();
    expect(single.record.callCount).toBe(1);
    expect(acceptedStageQuestions(single.record.sections)).toBe(true);
    expect(consultingQuestions(single.record.sections)).toEqual([{ questionId: 'q1', text: '누구를 고객으로 하는가?' }]);
    expect(calls).toHaveLength(2);
    const follow = await submitConsultingStage({
      store,
      userId: 'user-missing',
      projectId: 'project-missing',
      reviewId: missing.record.reviewId,
      answers: [{ questionId: 'q1', comment: '직장인을 고객으로 본다' }],
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(false);
    if (follow.ok) return;
    expect(follow.error).toBe('review_missing');
    expect(calls).toHaveLength(2);
  });

  it('calls once for a one-question stage and keeps that answer on the next stage', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const one = ['누구를 고객으로 하는가?'];
    const next = ['지불 의사를 누구에게 확인하는가?'];
    const after = ['첫 모임을 언제 여는가?'];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', one));
      }
      const prior = Array.isArray(payload.priorStagePairs) ? payload.priorStagePairs.length : 0;
      return reply(contractReply(request, '고객을 직장인으로 본다는 답을 반영했다. 이유는 지불 확인이 없기 때문이다.', prior === 0 ? next : after));
    };
    const base = {
      store,
      userId: 'user-one',
      projectId: 'project-one',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 질문 하나 단계.`, origin: 'typed', fileName: null });
    expect(first.record.status).toBe('succeeded');
    expect(first.record.callCount).toBe(1);
    expect(consultingQuestions(first.record.sections).map((item) => item.text)).toEqual(one);
    const parentFinishedAt = first.record.finishedAt;
    const open = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers: [] });
    expect(open.ok && open.pending && !open.called).toBe(true);
    expect(calls).toHaveLength(1);
    const integrated = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q1', choiceId: 'c1', choiceLabel: '직장인', otherText: '참가자는 직장인이다' }],
    });
    expect(integrated.ok).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.pending).toBe(false);
    expect(integrated.called).toBe(true);
    expect(integrated.record.callCount).toBe(1);
    expect(integrated.record.parentReviewId).toBe(first.record.reviewId);
    expect(calls).toHaveLength(2);
    const stageRequest = calls[1]!;
    expect(stageRequest.responseFormat?.type).toBe('json_schema');
    if (stageRequest.responseFormat?.type === 'json_schema') {
      const schema = stageRequest.responseFormat.schema.properties as { nextQuestions: { minItems: number } };
      expect(schema.nextQuestions.minItems).toBe(1);
    }
    const system = stageRequest.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).toContain('nextQuestions는 서로 다른 질문 1개 이상이다');
    const payload = userPayload(stageRequest);
    expect(payload.stagePairs).toEqual(integrated.record.stageAnswers);
    expect(JSON.stringify(payload.stagePairs)).toContain('참가자는 직장인이다');
    expect(consultingQuestions(integrated.record.sections).map((item) => item.text)).toEqual(next);
    const duplicate = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q1', choiceId: 'c1', choiceLabel: '직장인', otherText: '참가자는 직장인이다' }],
    });
    expect(duplicate.ok && !duplicate.called && !duplicate.pending).toBe(true);
    expect(calls).toHaveLength(2);
    expect((await store.readReview('user-one', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);
    const saved = await store.listFeedback('user-one', first.record.reviewId);
    expect(saved.every((item) => item.modelCalls === 0)).toBe(true);
    const second = await submitConsultingStage({
      ...base,
      reviewId: integrated.record.reviewId,
      answers: [{ questionId: 'q1', comment: '참가자에게 먼저 확인한다' }],
    });
    expect(second.ok && second.called).toBe(true);
    if (!second.ok) return;
    expect(second.record.callCount).toBe(1);
    expect(calls).toHaveLength(3);
    const secondPayload = userPayload(calls[2]!);
    expect(secondPayload.priorStagePairs).toEqual(integrated.record.stageAnswers);
    expect(secondPayload.stagePairs).toHaveLength(1);
    const inputText = composeReviewInput({ text: `${IDEA} 질문 하나 화면.`, purpose: 'overall' });
    const raw = JSON.parse(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', ['지불 의사를 누구에게 확인하는가?'])) as {
      questions: unknown;
    };
    raw.questions = [{ text: '지불 의사를 누구에게 확인하는가?', choices: ['참가자', '아직 정하지 못했다'] }];
    const sections = parseSections(JSON.stringify(raw), inputText);
    const view: AiPmReviewView = {
      reviewId: 'one-question-review',
      projectId: 'project-one-view',
      version: 1,
      parentReviewId: null,
      status: 'ready',
      inputOrigin: 'typed',
      fileName: null,
      inputText,
      sections,
      questionSource: 'model-review',
      finishedAt: NOW,
      feedback: [],
      revision: null,
      consultingTurn: null,
      failure: null,
    };
    const html = renderToStaticMarkup(
      createElement(AiPmReviewPanel, { initialText: inputText, projectId: 'project-one-view', initialReviews: [view] }),
    );
    expect(html).toContain('data-question-id="q1"');
    expect(html).toContain('지불 의사를 누구에게 확인하는가?');
    expect(html).toContain('답 저장');
    expect(html).not.toContain('질문 2개 이상');
  });

  it('stores a stage response with no next question as failed after one call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      if (Array.isArray(requestPayload(request)?.stagePairs)) {
        const parsed = JSON.parse(contractReply(request, '질문이 없는 응답이다. 이유는 형식 확인이다.', ['쓰지 않는 질문'])) as {
          nextQuestions: unknown;
          nextQuestionChoices: unknown;
        };
        parsed.nextQuestions = [];
        parsed.nextQuestionChoices = [];
        return reply(JSON.stringify(parsed));
      }
      return reply(contractReply(request, '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
    };
    const base = {
      store,
      userId: 'user-zero',
      projectId: 'project-zero',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 다음 질문 없음.`, origin: 'typed', fileName: null });
    const failed = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '직장인을 고객으로 본다' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(calls).toHaveLength(2);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.sections).toBeNull();
    expect(failed.record.rawContent).toContain('nextQuestions');
    expect(failed.record.error).toContain('stage_questions_missing');
  });

  it('saves stage answers on the product path and calls once when the stage is complete', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const firstJudgment = '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const secondJudgment = '직장인을 고객으로 본다는 계획과 가격이 없다는 답을 함께 보았다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const thirdJudgment = '장소와 신청 방법이 계획으로 남는다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const fourthJudgment = '주최와 요일이 계획으로 남는다. 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const index = calls.length;
      if (index === 1) return reply(contractReply(request, firstJudgment, FIRST_QUESTIONS));
      if (index === 2) return reply(contractReply(request, secondJudgment, SECOND_QUESTIONS));
      if (index === 3) return reply(contractReply(request, thirdJudgment, THIRD_QUESTIONS));
      return reply(contractReply(request, fourthJudgment, ['홍보 문구는 무엇인가?', '첫 모임 인원은 몇 명인가?']));
    };
    const base = {
      store,
      userId: 'user-product',
      projectId: 'project-product',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({
      ...base,
      text: IDEA,
      origin: 'typed',
      fileName: null,
    });
    expect(first.record.status).toBe('succeeded');
    expect(first.record.callCount).toBe(1);
    expect(consultingQuestions(first.record.sections).map((item) => item.text)).toEqual(FIRST_QUESTIONS);
    const parentFinishedAt = first.record.finishedAt;

    const one = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q1', comment: '직장인을 고객으로 본다' }],
    });
    expect(one.ok && one.pending && !one.called).toBe(true);
    expect(calls).toHaveLength(1);
    if (one.ok) expect(one.record.reviewId).toBe(first.record.reviewId);

    const two = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q2', choiceId: 'c1', choiceLabel: '가격은 아직 없다', otherText: '가격은 정하지 않았다' }],
    });
    expect(two.ok && two.pending && !two.called).toBe(true);
    expect(calls).toHaveLength(1);

    const integrated = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q3', comment: '온라인 게시로 알린다' }],
    });
    expect(integrated.ok).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.pending).toBe(false);
    expect(integrated.called).toBe(true);
    expect(calls).toHaveLength(2);
    expect(integrated.record.callCount).toBe(1);
    expect(integrated.record.parentReviewId).toBe(first.record.reviewId);
    expect(integrated.record.stageAnswers).toEqual([
      {
        questionId: 'q1',
        question: FIRST_QUESTIONS[0],
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '직장인을 고객으로 본다',
        status: 'answered',
      },
      {
        questionId: 'q2',
        question: FIRST_QUESTIONS[1],
        offeredChoices: [],
        choiceId: 'c1',
        choiceLabel: '가격은 아직 없다',
        supplement: '가격은 정하지 않았다',
        status: 'answered',
      },
      {
        questionId: 'q3',
        question: FIRST_QUESTIONS[2],
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '온라인 게시로 알린다',
        status: 'answered',
      },
    ]);
    const payload = userPayload(calls[1]!);
    expect(payload.originalInput).toBe(IDEA);
    expect(payload.firstAnalysis).toBeTruthy();
    expect(payload.evidenceLedger).toBeTruthy();
    expect(JSON.stringify(payload)).toContain(firstJudgment);
    expect(payload.thisAnswer).toBeUndefined();
    expect(payload.stagePairs).toEqual(integrated.record.stageAnswers);
    expect(payload.answerReading).toEqual([
      { questionId: 'q1', kinds: [] },
      { questionId: 'q2', kinds: ['choice'] },
      { questionId: 'q3', kinds: [] },
    ]);
    expect(consultingQuestions(integrated.record.sections).length).toBeGreaterThanOrEqual(2);

    const duplicate = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '직장인을 고객으로 본다' },
        { questionId: 'q2', choiceId: 'c1', choiceLabel: '가격은 아직 없다', otherText: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(duplicate.ok && !duplicate.called && !duplicate.pending).toBe(true);
    expect(calls).toHaveLength(2);
    expect((await store.readReview('user-product', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);

    const second = await submitConsultingStage({
      ...base,
      reviewId: integrated.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '도서관 회의실을 장소로 본다' },
        { questionId: 'q2', comment: '온라인 양식으로 신청을 받는다' },
      ],
    });
    expect(second.ok && second.called).toBe(true);
    if (!second.ok) return;
    expect(calls).toHaveLength(3);
    expect(second.record.parentReviewId).toBe(integrated.record.reviewId);
    expect(second.record.callCount).toBe(1);
    const secondPayload = userPayload(calls[2]!);
    expect(secondPayload.priorStagePairs).toEqual(integrated.record.stageAnswers);
    expect(secondPayload.stagePairs).toHaveLength(2);
    expect(consultingQuestions(second.record.sections).map((item) => item.text)).toEqual(THIRD_QUESTIONS);

    const third = await submitConsultingStage({
      ...base,
      reviewId: second.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '주최는 본인이다' },
        { questionId: 'q2', comment: '토요일에 연다' },
      ],
    });
    expect(third.ok && third.called).toBe(true);
    if (!third.ok) return;
    expect(calls).toHaveLength(4);
    expect(third.record.parentReviewId).toBe(second.record.reviewId);
    expect(third.record.callCount).toBe(1);
    const thirdPayload = userPayload(calls[3]!);
    expect(thirdPayload.priorStagePairs).toHaveLength(5);
    expect(thirdPayload.stagePairs).toHaveLength(2);
    expect(consultingQuestions(third.record.sections).length).toBeGreaterThanOrEqual(2);
    expect((await store.readReview('user-product', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);
    expect((await store.readReview('user-product', integrated.record.reviewId))?.finishedAt).toBe(integrated.record.finishedAt);
  });

  it('stores a malformed stage response once and does not call again', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      if (Array.isArray(requestPayload(request)?.stagePairs)) return reply('not-json');
      return reply(contractReply(request, '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
    };
    const base = {
      store,
      userId: 'user-format',
      projectId: 'project-format',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: IDEA, origin: 'typed', fileName: null });
    expect(first.record.status).toBe('succeeded');
    const answers = [
      { questionId: 'q1', comment: '직장인을 고객으로 본다' },
      { questionId: 'q2', comment: '가격은 정하지 않았다' },
      { questionId: 'q3', comment: '온라인 게시로 알린다' },
    ];
    const failed = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.called).toBe(true);
    expect(failed.pending).toBe(false);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.rawContent).toBe('not-json');
    expect(failed.record.sections).toBeNull();
    expect(failed.record.error).toContain('invalid_json');
    expect(calls).toHaveLength(2);
    const again = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers });
    expect(again.ok && !again.called).toBe(true);
    expect(calls).toHaveLength(2);
    if (again.ok) expect(again.record.status).toBe('failed');
  });

  it('stores a repeated stage question as failed after one call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(contractReply(request, '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const repeated = contractReply(request, '질문을 반복한 응답이다. 이유는 형식 확인이다.', [FIRST_QUESTIONS[0]!, '새 질문인가?']);
      return reply(repeated);
    };
    const base = {
      store,
      userId: 'user-repeat',
      projectId: 'project-repeat',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 반복.`, origin: 'typed', fileName: null });
    const failed = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '직장인을 고객으로 본다' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(calls).toHaveLength(2);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.sections).toBeNull();
    expect(failed.record.error).toContain('stage_questions_repeated');
    expect(failed.record.rawContent).toContain(FIRST_QUESTIONS[0]);
  });

  it('renders one answer field per question and does not reuse one shared choice list', () => {
    const inputText = composeReviewInput({ text: IDEA, purpose: 'overall' });
    const raw = JSON.parse(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS)) as {
      questions: unknown;
    };
    raw.questions = [
      { text: FIRST_QUESTIONS[0], choices: ['직장인', '학생'] },
      { text: FIRST_QUESTIONS[1], choices: ['가격은 아직 없다', '월 1만원'] },
      { text: FIRST_QUESTIONS[2], choices: ['온라인 게시', '오프라인 안내'] },
    ];
    const sections = parseSections(JSON.stringify(raw), inputText);
    expect(sections?.analysis?.questions).toHaveLength(3);
    const view: AiPmReviewView = {
      reviewId: 'stage-review',
      projectId: 'project-stage',
      version: 1,
      parentReviewId: null,
      status: 'ready',
      inputOrigin: 'typed',
      fileName: null,
      inputText,
      sections,
      questionSource: 'model-review',
      finishedAt: NOW,
      feedback: [],
      revision: null,
      consultingTurn: null,
      failure: null,
    };
    const html = renderToStaticMarkup(
      createElement(AiPmReviewPanel, { initialText: inputText, projectId: 'project-stage', initialReviews: [view] }),
    );
    expect(html).toContain('data-question-id="q1"');
    expect(html).toContain('data-question-id="q2"');
    expect(html).toContain('data-question-id="q3"');
    expect(html).toContain('누구를 고객으로 하는가?');
    expect(html).toContain('가격은 얼마인가?');
    expect(html).toContain('어떤 채널로 알리는가?');
    expect(html).toContain('답 저장');
    expect(html).toContain('data-testid="ai-pm-choice-submit"');
    expect(html).not.toContain('이 답으로 다시 분석');
    const firstQuestion = html.slice(html.indexOf('data-question-id="q1"'), html.indexOf('data-question-id="q2"'));
    const secondQuestion = html.slice(html.indexOf('data-question-id="q2"'), html.indexOf('data-question-id="q3"'));
    expect(firstQuestion).toContain('직장인');
    expect(firstQuestion).not.toContain('월 1만원');
    expect(secondQuestion).toContain('월 1만원');
    expect(secondQuestion).not.toContain('직장인');
    expect(firstQuestion).not.toContain('지불 의사를 먼저 확인한다');
    expect(html).not.toMatch(/gpt|gemini|openai|token/i);
  });

  it('connects the follow-up route to the stage, not one supplement per call', () => {
    const route = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    expect(route).toContain('submitConsultingStage');
    expect(route).not.toContain('runFollowUpReview');
    expect(panel).toContain('/api/ai-pm-review/follow-up');
    expect(panel).toContain('answers');
    expect(panel).toContain('data-question-id');
    expect(panel).not.toMatch(/gpt|gemini|openai|token/i);
  });
});
