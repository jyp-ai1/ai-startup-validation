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
  buildAnsweredQuestionState,
  buildProductReanalysisRequest,
  judgeStageContract,
  consultingQuestions,
  founderAnswerKinds,
  pairConsultingStage,
  parseFeedbackBody,
  parseSections,
  runFirstReview,
  runStageReanalysis,
  saveReviewFeedback,
  stageFieldForRequest,
  submitConsultingStage,
  type AiPmReviewView,
} from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections, type StagePair, type StagePriorReading, type StoredFeedback, type StoredReview } from '../ai-pm-review-store';

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
    verificationPurpose: `${text}와 다른 불확실성. 아직 확인하지 않은 다음 검증이다`,
  }));
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 계획을 구체화하고 확인된 사실은 늘리지 않는다`,
      founderBasis: `${pair.questionId}에서 이렇게 말한 이유는 입력에 적힌 계획이다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의는 없다`,
      judgmentEffect: `${pair.questionId} 답은 확인된 사실이 아니다. 성공 가능성은 높아지지 않았다. 이전 판단은 유지되고 검증된 사실은 늘지 않는다.`,
      openRisk: `${pair.questionId}의 지불은 아직 검증되지 않았다`,
    })),
    impactOnPreviousJudgment: '이번 답이 기존 판단에 준 영향이다.',
    updatedJudgment: `유지: 확인 전 위험은 남는다. 이번 답: ${judgment} 변경: 확인된 사실이 아니면 바꾸지 않는다. 남은 위험: 지불이나 공급은 아직 없다.`,
    judgmentReason: '지불 확인이 없어 판단을 유지한다.',
    verifiedFacts: [],
    unverifiedClaims: [],
    assumptions: ['가격은 확인되지 않았다'],
    resolvedIssues: [],
    unresolvedIssues: [`${questions[0] ?? '다음 확인'}는 아직 확인되지 않았다`],
    nextVerification: '지불 의사를 확인한다.',
    customer: '직장인',
    problem: '모임 수요가 확인되지 않았다',
    value: '함께 읽는 자리',
    product: '독서 모임',
    market: '수요는 입력에 없다',
    revenueModel: '가격은 가설이며 원문에 없다',
    operations: '운영은 아직 구상이다',
    supply: '장소 공급은 입력에 없다',
    supplyState: 'confirmed',
    marketing: '알림 방법은 아직 확인되지 않았다',
    marketingState: 'confirmed',
    competition: '경쟁은 확인되지 않았다',
    executionNote: '실행은 아직 확인되지 않았다',
    risks: ['수요가 확인되지 않았다'],
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

function identified<T extends { questionId: string }>(
  pairs: T[] | null | undefined,
  sourceReviewId: string | null | undefined,
): Array<T & { sourceReviewId: string | null; questionKey: string }> {
  const source = sourceReviewId ?? null;
  return (pairs ?? []).map((pair) => ({
    ...pair,
    sourceReviewId: source,
    questionKey: source ? `${source}:${pair.questionId}` : pair.questionId,
  }));
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
    const unlabeledOne = pairConsultingStage(
      [{ questionId: 'q1', text: '누구인가?' }],
      [feedback({ comment: '양조장과의 협력 가능성이 높다.', choiceAnswer: { choiceId: 'c1', label: '양조장과의 협력 가능성이 높다.', otherText: '양조장과의 협력 가능성이 높다.' } })],
    );
    expect(unlabeledOne).toEqual([
      {
        questionId: 'q1',
        question: '누구인가?',
        offeredChoices: [],
        choiceId: null,
        choiceLabel: null,
        supplement: '',
        status: 'open',
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
    expect(stagePayload.answerReading).toEqual([{ questionId: 'hist-1', sourceReviewId: null, questionKey: 'hist-1', kinds: ['claim', 'choice'] }]);
    expect(stagePayload.answerSource).toEqual([{ questionId: 'hist-1', sourceReviewId: null, questionKey: 'hist-1', source: 'founder' }]);
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
    expect(system).toContain('founderBasis');
    expect(system).toContain('observedEvidence');
    expect(system).toContain('judgmentEffect');
    expect(system).toContain('openRisk');
    expect(system).toContain('확인된 접촉이나 합의가 없다고');
    expect(system).toContain('확인된 사실, 주장, 가설을 가른다');
    expect(system).toContain('코드가 붙인 분류가 있어도 그 문장을 사실로 승격하지 않는다');
    expect(system).toContain('사업 전체를 다시 적는다');
    expect(system).toContain('nextQuestions는 서로 다른 질문 1개 이상이다');
    expect(system).toContain('성공 가능성을 높이지 않는다');
    expect(system).toContain('성공 가능성은 높아지지 않았다');
    expect(system).toContain('이번 답');
    expect(system).toContain('남은 위험');
    expect(system).toContain('사업 모델의 잠재력');
    expect(system).toContain('미확인 주장');
    expect(system).toContain('실행 가능성');
    expect(system).toContain('판단 문장이 이전과 같아도 그 검토가 있으면 재평가다');
    expect(system).toContain('전략 컨설턴트');
    expect(system).toContain('고정된 순서를 강제하지 않는다');
    expect(system).toContain('사업 목적은 방금 답한 질문의 목적과 달라야 한다');
    expect(system).toContain('다음 판단을 가장 크게 바꾸는 영역');
    expect(system).not.toContain('어떻게 구체화할 것인가');
    expect(system).not.toContain('순서는 대상이 있는지');
    expect(system).toContain('존재 여부에 이미 답이 있으면');
    expect(system).toContain('answerSource.source가 simulation');
    expect(system).toContain('이는 사실이다라고 쓰지 않는다');
    expect(system).toContain('그 질문을 반복하지 않는다');
    expect(system).not.toContain('양조장 후보가 있는가');
    expect(system).not.toContain('후보 양조장');
    expect(system).toContain('아직 확인되지 않았다');
    expect(system).toContain('위험을 빼지 않는다');
    expect(system).toContain('그대로 복사하지 않고');
    expect(system).toContain('구체적으로만 더한');
    expect(system).not.toContain('priorJudgmentText를 이어 쓰지 않는다');
    expect(system).not.toContain('verificationStage');
    if (request.responseFormat?.type === 'json_schema') {
      const meaning = request.responseFormat.schema.properties as {
        answerInterpretation: { items: { required: string[]; properties: { meaning: { description: string } } } };
        updatedJudgment: { description: string };
        verifiedFacts: { description: string };
        nextQuestions: { items: { required: string[]; properties: { text: { description: string }; verificationPurpose: { description: string } } } };
      };
      expect(meaning.answerInterpretation.items.properties.meaning.description).toContain('choiceLabel');
      expect(meaning.answerInterpretation.items.required).toEqual([
        'questionId',
        'choiceId',
        'meaning',
        'founderBasis',
        'observedEvidence',
        'judgmentEffect',
        'openRisk',
      ]);
      expect(meaning.updatedJudgment.description).toContain('unverifiedClaims');
      expect(meaning.verifiedFacts.description).toContain('주장');
      expect(meaning.nextQuestions.items.properties.text.description).toContain('이미 제출된 질문');
      expect(meaning.nextQuestions.items.properties.text.description).toContain('구체적으로만 더한');
      expect(meaning.nextQuestions.items.properties.text.description).toContain('다른 사업 목적');
      expect(meaning.nextQuestions.items.properties.text.description).not.toContain('후보, 접촉');
      const supply = request.responseFormat.schema.properties as { supply: { description: string }; marketing: { description: string } };
      expect(supply.supply.description).toContain('아직 확인되지 않았다');
      expect(supply.marketing.description).toContain('빈 문자열은 실패다');
      expect(meaning.nextQuestions.items.properties.verificationPurpose.description).toContain('불확실성');
      expect(meaning.nextQuestions.items.required).toEqual(['text', 'choices', 'verificationPurpose']);
      expect(request.responseFormat.schema.required).toEqual([
        'answerInterpretation',
        'statementReadings',
        'verifiedFacts',
        'unverifiedClaims',
        'assumptions',
        'resolvedIssues',
        'unresolvedIssues',
        'customer',
        'problem',
        'value',
        'product',
        'market',
        'revenueModel',
        'operations',
        'supply',
        'supplyState',
        'marketing',
        'marketingState',
        'competition',
        'executionNote',
        'risks',
        'objectiveCandidates',
        'selectedCandidateId',
        'selectionReason',
        'nextVerification',
        'nextQuestions',
        'nextQuestionChoices',
        'impactOnPreviousJudgment',
        'keptBusinessPremise',
        'executionPossibility',
        'updatedJudgment',
        'judgmentReason',
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
    expect(integrated.record.stageReading?.updatedJudgment).toContain(secondJudgment);
    expect(integrated.record.stageReading?.updatedJudgment).toContain('남은 위험');
    expect(consultingQuestions(integrated.record.sections).map((item) => item.text)).toEqual(SECOND_QUESTIONS);
    expect(integrated.record.sections?.analysis?.judgmentDetail).toContain(secondJudgment);
    const firstPayload = userPayload(calls[1]!);
    expect(firstPayload.originalInput).toBe(IDEA);
    expect(JSON.stringify(firstPayload)).toContain(firstJudgment);
    expect(JSON.stringify(firstPayload)).toContain('가격은 미확인이라 판단을 유지한다.');
    expect(firstPayload.thisAnswer).toBeUndefined();
    expect(firstPayload.stagePartial).toBe(false);
    expect(firstPayload.priorStagePairs).toEqual([]);
    expect(firstPayload.stagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
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
    expect(JSON.stringify(secondPayload)).toContain('이번 답이 기존 판단에 준 영향이다.');
    expect(secondPayload.priorStagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
    expect(secondPayload.stagePairs).toEqual(identified(second.record.stageAnswers, second.record.parentReviewId));
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
    expect(thirdPayload.originalInput).toBe(IDEA);
    expect(JSON.stringify(thirdPayload)).toContain(firstJudgment);
    expect(JSON.stringify(thirdPayload)).toContain('직장인을 고객으로 본다');
    expect(JSON.stringify(thirdPayload)).toContain('도서관 회의실을 장소로 본다');
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
    expect(payload.stagePairs).toEqual(
      identified(
        [
          {
            questionId: 'q1',
            question: FIRST_QUESTIONS[0],
            offeredChoices: [],
            choiceId: null,
            choiceLabel: null,
            supplement: '직장인을 고객으로 본다',
            status: 'answered' as const,
          },
          {
            questionId: 'q2',
            question: FIRST_QUESTIONS[1],
            offeredChoices: [],
            choiceId: null,
            choiceLabel: null,
            supplement: '',
            status: 'open' as const,
          },
          {
            questionId: 'q3',
            question: FIRST_QUESTIONS[2],
            offeredChoices: [],
            choiceId: null,
            choiceLabel: null,
            supplement: '',
            status: 'open' as const,
          },
        ],
        partial.record.parentReviewId,
      ),
    );
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
    expect(payload.stagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
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
    expect(secondPayload.priorStagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
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

  it('does not attach an answer that has no question id, then sends only the linked answer', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const one = ['누구를 고객으로 하는가?'];
    const next = ['지불 의사를 누구에게 확인하는가?'];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', one));
      }
      return reply(contractReply(request, '직장인 답을 반영했다. 이유는 지불 확인이 없기 때문이다.', next));
    };
    const base = {
      store,
      userId: 'user-unlabeled',
      projectId: 'project-unlabeled',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 식별자 없는 답.`, origin: 'typed', fileName: null });
    expect(first.called).toBe(true);
    expect(first.record.callCount).toBe(1);
    expect(first.record.status).toBe('succeeded');
    const parentFinishedAt = first.record.finishedAt;
    const unlabeled = await saveReviewFeedback({
      store,
      userId: 'user-unlabeled',
      projectId: 'project-unlabeled',
      now: NOW,
      body: {
        reviewId: first.record.reviewId,
        choiceId: 'c1',
        choiceLabel: '양조장과의 협력 가능성이 높다.',
        otherText: '양조장과의 협력 가능성이 높다.',
      },
    });
    expect(unlabeled.ok).toBe(true);
    if (!unlabeled.ok) return;
    expect(unlabeled.feedback.questionId).toBeUndefined();
    expect(unlabeled.feedback.modelCalls).toBe(0);
    const held = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers: [] });
    expect(held.ok && held.pending && !held.called).toBe(true);
    expect(calls).toHaveLength(1);
    const integrated = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q1', comment: '참가자는 직장인이다' }],
    });
    expect(integrated.ok).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.pending).toBe(false);
    expect(integrated.called).toBe(true);
    expect(integrated.record.callCount).toBe(1);
    expect(integrated.record.status).toBe('succeeded');
    expect(integrated.record.parentReviewId).toBe(first.record.reviewId);
    expect(integrated.record.stageAnswers).toEqual([
      expect.objectContaining({ questionId: 'q1', supplement: '참가자는 직장인이다', status: 'answered' }),
    ]);
    expect(JSON.stringify(integrated.record.stageAnswers)).not.toContain('양조장');
    const payload = userPayload(calls[1]!);
    expect(JSON.stringify(payload.stagePairs)).toContain('참가자는 직장인이다');
    expect(JSON.stringify(payload)).not.toContain('양조장');
    expect(integrated.record.sourceFeedbackId).not.toBe(unlabeled.feedback.feedbackId);
    const duplicate = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [{ questionId: 'q1', comment: '참가자는 직장인이다' }],
    });
    expect(duplicate.ok && !duplicate.called && !duplicate.pending).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.record.reviewId).toBe(integrated.record.reviewId);
    expect(calls).toHaveLength(2);
    expect((await store.readReview('user-unlabeled', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);
    const second = await submitConsultingStage({
      ...base,
      reviewId: integrated.record.reviewId,
      answers: [{ questionId: 'q1', comment: '참가자에게 먼저 확인한다' }],
    });
    expect(second.ok && second.called && second.record.callCount === 1).toBe(true);
    if (!second.ok) return;
    expect(calls).toHaveLength(3);
    const secondPayload = userPayload(calls[2]!);
    expect(secondPayload.priorStagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
    expect(JSON.stringify(secondPayload.priorStagePairs)).not.toContain('양조장');
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
    expect(JSON.stringify(payload)).toContain('가격은 미확인이라 판단을 유지한다.');
    expect(payload.thisAnswer).toBeUndefined();
    expect(payload.stagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
    expect(payload.answerReading).toEqual(
      identified(
        [
          { questionId: 'q1', kinds: [] },
          { questionId: 'q2', kinds: ['choice'] },
          { questionId: 'q3', kinds: [] },
        ],
        integrated.record.parentReviewId,
      ),
    );
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
    expect(secondPayload.priorStagePairs).toEqual(identified(integrated.record.stageAnswers, integrated.record.parentReviewId));
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

  it('fails a wording-only repeat of an answered question after one call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(contractReply(request, '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const paraphrased = contractReply(request, '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', [
        '누구를 고객으로 구체적으로 하는가?',
      ]);
      return reply(paraphrased);
    };
    const base = {
      store,
      userId: 'user-paraphrase',
      projectId: 'project-paraphrase',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 표현만 변경.`, origin: 'typed', fileName: null });
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
    expect(failed.record.error).not.toContain('stage_fields_missing');
    expect(failed.record.rawContent).toContain('구체적으로');
  });

  it('keeps the stored empty supply failure and also marks the repeated cooperation question', async () => {
    const stored = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? stored.rounds[1]?.raw ?? '' : stored.rounds[0]?.raw ?? '');
    };
    const base = {
      store,
      userId: 'user-stored-fail',
      projectId: 'project-stored-fail',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({
      ...base,
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
    });
    expect(first.record.status).toBe('succeeded');
    const questions = consultingQuestions(first.record.sections);
    expect(questions.map((question) => question.text)).toContain('양조장과의 협력 관계를 어떻게 구축할 것인가?');
    const failed = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(calls).toHaveLength(2);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.error).toContain('stage_fields_missing');
    expect(failed.record.error).toContain('stage_questions_repeated');
    expect(failed.record.error).not.toContain('stage_choices_missing');
    expect(failed.record.rawContent).toContain('"supply": ""');
    expect(failed.record.sections).toBeNull();
  });

  it('marks the reordered cooperation question from the live quality-fix raw as repeated', async () => {
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const follow = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-1.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string; rowError: string }> };
    expect(follow.rounds[0]?.rowError).toBe('stage_fields_missing');
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? follow.rounds[0]?.raw ?? '' : first.rounds[0]?.raw ?? '');
    };
    const base = {
      store,
      userId: 'user-quality-fix-raw',
      projectId: 'project-quality-fix-raw',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const parent = await runFirstReview({
      ...base,
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
    });
    const questions = consultingQuestions(parent.record.sections);
    const failed = await submitConsultingStage({
      ...base,
      reviewId: parent.record.reviewId,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(calls).toHaveLength(2);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.error).toContain('stage_fields_missing');
    expect(failed.record.error).toContain('stage_questions_repeated');
    expect(failed.record.rawContent).toContain('구축할 계획인가');
  });

  it('normalizes a stored blank supply at request time and does not rewrite the stored row', () => {
    const stored: ReviewSections = {
      customer: '관광객',
      problem: '연결이 없다',
      market: '시장은 입력에 없다',
      revenueModel: '수익은 가설이다',
      execution: '',
      risks: ['수요'],
      uncertain: ['협력이 원활할 것이다'],
      hypotheses: ['협력이 원활할 것이다'],
      judgment: '기회이나 리스크가 있다',
      nextQuestion: '협력 관계를 어떻게 구축할 것인가?',
      nextQuestionReason: '공급이 없다',
      answerHint: '적습니다',
      claimConfirmation: null,
      analysis: {
        summary: '요약',
        value: '체험',
        operatingModel: '구상',
        payer: '미확인',
        competition: '미확인',
        operations: '구상',
        profitability: '미확인',
        strengths: [],
        assumptions: ['협력이 원활할 것이다'],
        evidenceToChange: [],
        founderFacts: [],
        inferences: [],
        judgmentDetail: '기회이나 리스크가 있다',
        choices: [],
        product: '',
        supply: '',
        marketing: '   ',
      },
    };
    const reading: StagePriorReading = {
      reviewId: 'parent',
      judgment: stored.judgment,
      judgmentReason: '',
      impactOnPreviousJudgment: '',
      resolvedIssues: [],
      unresolvedIssues: ['협력이 원활할 것이다'],
      customer: stored.customer,
      problem: stored.problem,
      revenueModel: stored.revenueModel,
      product: '',
      supply: '',
      marketing: '',
      nextQuestion: stored.nextQuestion,
    };
    const pair: StagePair = {
      questionId: 'q1',
      question: stored.nextQuestion,
      offeredChoices: [],
      choiceId: null,
      choiceLabel: null,
      supplement: '가능성이 높다',
      status: 'answered',
    };
    const request = buildProductReanalysisRequest({
      originalInput: '양조장 체험',
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [pair],
      priorReadings: [reading],
    });
    expect(stored.analysis?.supply).toBe('');
    expect(stored.analysis?.marketing).toBe('   ');
    expect(stored.analysis?.product).toBe('');
    expect(reading.supply).toBe('');
    expect(reading.unresolvedIssues).toEqual(['협력이 원활할 것이다']);
    const payload = userPayload(request);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('"supply":""');
    expect(serialized).not.toContain('"marketing":""');
    expect(serialized).not.toContain('"product":""');
    expect((payload.firstAnalysis as { supply: { state: string; text: string } }).supply).toEqual({
      state: 'not_analyzed',
      text: '아직 분석되지 않았다',
    });
    const first = payload.firstAnalysis as { product: string; unresolvedIssues: string[]; priorHypotheses: string[] };
    expect(first.product).toBe('아직 분석되지 않았다');
    expect(first.unresolvedIssues).toEqual([]);
    expect(first.priorHypotheses).toEqual(['협력이 원활할 것이다']);
    const blocked = payload.doNotCopy as { priorUnresolvedIssues: string[] };
    expect(blocked.priorUnresolvedIssues).toEqual(['협력이 원활할 것이다']);
    const task = payload.revisionTask as {
      updatedJudgment?: string;
      unresolvedIssues?: string;
      nextQuestion?: string;
      priorQuestionText?: string;
    };
    expect(task.updatedJudgment).toContain('사업 모델의 잠재력');
    expect(task.updatedJudgment).toContain('문장이 같다는 이유만으로 실패가 아니다');
    expect(task.nextQuestion).toContain('같은 목적');
    expect(task.nextQuestion).toContain('존재 여부');
    expect(task.nextQuestion).toContain('방금 답한 질문을 반복하지 않는다');
    expect(task.unresolvedIssues).toContain('priorUnresolvedIssues');
    expect(task.priorQuestionText).toBeUndefined();
    expect(serialized).not.toContain('양조장 후보가 있는가');
    const readings = payload.priorReadings as Array<{
      supply: { state: string };
      marketing: { state: string };
      product: string;
      unresolvedIssues: string[];
      priorHypotheses: string[];
    }>;
    expect(readings[0]?.supply).toEqual({ state: 'not_analyzed', text: '아직 분석되지 않았다' });
    expect(readings[0]?.marketing.state).toBe('not_analyzed');
    expect(readings[0]?.product).toBe('아직 분석되지 않았다');
    expect(readings[0]?.unresolvedIssues).toEqual([]);
    expect(readings[0]?.priorHypotheses).toEqual(['협력이 원활할 것이다']);
    const latest = payload.latestAnalysis as { analysis: { supply: { state: string }; marketing: { state: string } } };
    expect(latest.analysis.marketing.state).toBe('not_analyzed');
    expect(stageFieldForRequest('공급 계약이 있다')).toEqual({ state: 'confirmed', text: '공급 계약이 있다' });
    expect(stageFieldForRequest('아직 확인되지 않았다').state).toBe('unconfirmed');
    if (request.responseFormat?.type === 'json_schema') {
      const supply = request.responseFormat.schema.properties as {
        supply: { pattern?: string };
        supplyState: { enum: string[] };
      };
      expect(supply.supply.pattern).toBe('^.+$');
      expect(supply.supplyState.enum).toEqual(['confirmed', 'unconfirmed', 'not_analyzed']);
      const profile = request.responseFormat.schema.properties as { value: { pattern?: string }; product: { pattern?: string } };
      expect(profile.value.pattern).toBe('^.+$');
      expect(profile.product.pattern).toBe('^.+$');
    }
  });

  it('simulation: an answered existence question is context for the model, and the code does not write the next question', () => {
    const stored: ReviewSections = {
      customer: '방문객',
      problem: '자리가 없다',
      market: '수요는 입력에 없다',
      revenueModel: '가격은 가설이다',
      execution: '',
      risks: ['자리가 없다'],
      uncertain: ['대상이 있는지 모른다'],
      hypotheses: ['수요가 있다'],
      judgment: '모델의 여지는 남으나 대상은 확인되지 않았다',
      nextQuestion: '볼 대상이 있는가?',
      nextQuestionReason: '존재가 다음 확인이다',
      answerHint: '적습니다',
      claimConfirmation: null,
      analysis: {
        summary: '요약',
        value: '자리',
        operatingModel: '구상',
        payer: '미확인',
        competition: '미확인',
        operations: '구상',
        profitability: '미확인',
        strengths: [],
        assumptions: ['수요가 있다'],
        evidenceToChange: [],
        founderFacts: [],
        inferences: [],
        judgmentDetail: '모델의 여지는 남으나 대상은 확인되지 않았다',
        choices: [],
        product: '체험 자리',
        supply: '아직 분석되지 않았다',
        marketing: '아직 분석되지 않았다',
      },
    };
    const request = buildProductReanalysisRequest({
      originalInput: 'SIMULATION 대상 존재 답변',
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [
        {
          questionId: 'q1',
          question: '볼 대상이 있는가?',
          offeredChoices: [],
          choiceId: null,
          choiceLabel: null,
          supplement: 'SIMULATION 대상은 아직 없다',
          status: 'answered',
        },
      ],
    });
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    const payload = userPayload(request);
    const task = payload.revisionTask as { nextQuestion?: string };
    expect(system).toContain('존재 여부에 이미 답이 있으면');
    expect(system).toContain('코드는 질문 문장을 정하지 않는다');
    expect(system).toContain('고정된 질문 순서는 없다');
    expect(task.nextQuestion).toContain('미확인 영역');
    expect(task.nextQuestion).not.toContain('접촉');
    expect(task.nextQuestion).not.toContain('볼 대상이 있는가');
    expect(JSON.stringify(payload.stagePairs)).toContain('SIMULATION 대상은 아직 없다');
    expect(payload.answerSource).toEqual([{ questionId: 'q1', sourceReviewId: null, questionKey: 'q1', source: 'simulation' }]);
    expect(JSON.stringify(payload)).not.toContain('양조장 후보가 있는가');
  });

  it('passes the prior judgment sentence and splits the current answer into statements', () => {
    const prior = '이전판단고유문장잠재력은남고협력은불확실하다추가검증이필요하다';
    const stored: ReviewSections = {
      customer: '방문객',
      problem: '자리가 없다',
      market: '수요는 입력에 없다',
      revenueModel: '가격은 가설이다',
      execution: '',
      risks: ['자리가 없다'],
      uncertain: ['대상이 있는지 모른다'],
      hypotheses: ['수요가 있다'],
      judgment: prior,
      nextQuestion: '양조장과의 접촉이 있었는가?',
      nextQuestionReason: '접촉이 다음 확인이다',
      answerHint: '적습니다',
      claimConfirmation: null,
      analysis: {
        summary: '요약',
        value: '자리',
        operatingModel: '구상',
        payer: '미확인',
        competition: '미확인',
        operations: '구상',
        profitability: '미확인',
        strengths: [],
        assumptions: ['수요가 있다'],
        evidenceToChange: [],
        founderFacts: [],
        inferences: [],
        judgmentDetail: prior,
        choices: [],
        product: '체험 자리',
        supply: '아직 분석되지 않았다',
        marketing: '아직 분석되지 않았다',
      },
    };
    const simulation =
      'SIMULATION. 한 양조장에 문의했다고 말한다. 상대의 반응은 아직 없다. 참여 의향은 확인하지 못했다. 체험과 운영 조건은 합의되지 않았다.';
    const request = buildProductReanalysisRequest({
      originalInput: '양조장 체험',
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [
        {
          questionId: 'q1',
          question: '양조장과의 접촉이 있었는가?',
          offeredChoices: [],
          choiceId: null,
          choiceLabel: null,
          supplement: simulation,
          status: 'answered',
        },
      ],
    });
    const payload = userPayload(request);
    const names: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        names.push(key);
        walk(child);
      }
    };
    walk(payload);
    expect(names).toContain('priorJudgmentText');
    expect(JSON.stringify(payload)).toContain(prior);
    expect(payload.currentAnswerStatements).toEqual([
      { questionId: 'q1', sourceReviewId: null, questionKey: 'q1', source: 'simulation', index: 0, statement: '한 양조장에 문의했다고 말한다.' },
      { questionId: 'q1', sourceReviewId: null, questionKey: 'q1', source: 'simulation', index: 1, statement: '상대의 반응은 아직 없다.' },
      { questionId: 'q1', sourceReviewId: null, questionKey: 'q1', source: 'simulation', index: 2, statement: '참여 의향은 확인하지 못했다.' },
      { questionId: 'q1', sourceReviewId: null, questionKey: 'q1', source: 'simulation', index: 3, statement: '체험과 운영 조건은 합의되지 않았다.' },
    ]);
    expect(payload.closedQuestions).toEqual([
      { questionId: 'q1', sourceReviewId: null, questionKey: 'q1', text: '양조장과의 접촉이 있었는가?', askAgain: false },
    ]);
    expect(Object.keys(payload)[0]).toBe('businessState');
    const businessState = payload.businessState as {
      areaOrderIsNotPriority: boolean;
      statedRecord: { originalIdea: string; confirmed: string[] };
      areaStatus: Array<{ areaId: string; status: string }>;
      priorReview: { judgment: string; reviewedObjectives: string[]; hypotheses: string[]; unresolved: string[]; resolved: string[]; operations: string };
    };
    expect(businessState.areaOrderIsNotPriority).toBe(true);
    expect(businessState.statedRecord.originalIdea).toBe('양조장 체험');
    expect(businessState.statedRecord.confirmed).toEqual([]);
    expect(businessState.priorReview.reviewedObjectives).toEqual(['양조장과의 접촉이 있었는가?']);
    expect(businessState.priorReview.judgment).toBe(prior);
    expect(businessState.priorReview.hypotheses).toEqual(['대상이 있는지 모른다']);
    expect(businessState.priorReview.unresolved).toEqual([]);
    expect(businessState.priorReview.resolved).toEqual([]);
    expect(businessState.priorReview.operations).toBe('구상');
    expect(JSON.stringify(businessState.areaStatus)).not.toContain(prior);
    expect(businessState.areaStatus.find((item) => item.areaId === 'customer')).toMatchObject({
      status: 'founder_claim',
      epistemicStatus: 'FOUNDER_CLAIM',
      provenance: 'AI_INFERENCE',
      informationPresent: true,
      verified: false,
      analysisComplete: false,
      text: '방문객',
    });
    expect(businessState.areaStatus.find((item) => item.areaId === 'revenue')?.status).toBe('assumption');
    expect(businessState.areaStatus.find((item) => item.areaId === 'operations')).toMatchObject({ status: 'founder_claim', text: '구상' });
    expect(businessState.areaStatus.find((item) => item.areaId === 'supply')?.status).toBe('not_analyzed');
    expect(businessState.areaStatus.find((item) => item.areaId === 'product')?.status).toBe('founder_claim');
    const priced = buildProductReanalysisRequest({
      originalInput: '양조장 체험',
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [
        {
          questionId: 'q1',
          question: '양조장과의 접촉이 있었는가?',
          offeredChoices: [],
          choiceId: null,
          choiceLabel: null,
          supplement: 'SIMULATION. 공급 계약과 가격은 없다.',
          status: 'answered',
        },
      ],
    });
    const pricedStatus = (userPayload(priced).businessState as { areaStatus: Array<{ areaId: string; status: string }> }).areaStatus;
    expect(pricedStatus.find((item) => item.areaId === 'price')?.status).toBe('claim');
    expect(pricedStatus.find((item) => item.areaId === 'supply')?.status).toBe('not_analyzed');
    expect(JSON.stringify(payload)).not.toContain('상대의 회신이 있었는가');
    if (request.responseFormat?.type === 'json_schema') {
      const properties = request.responseFormat.schema.properties as {
        answerInterpretation: { items: { properties: { meaning: { description: string }; judgmentEffect: { description: string } } } };
        statementReadings: {
          items: { required: string[]; properties: { kind: { description: string }; source: { enum: string[] } } };
        };
        unresolvedIssues: { description: string };
      };
      expect(properties.answerInterpretation.items.properties.meaning.description).toContain('사실을 제공한다');
      expect(properties.answerInterpretation.items.properties.judgmentEffect.description).toContain('updatedJudgment와 같은 판단');
      expect(properties.statementReadings.items.required).toContain('source');
      expect(properties.statementReadings.items.properties.source.enum).toEqual(['simulation', 'founder']);
      expect(properties.statementReadings.items.properties.kind.description).toContain('counterparty_response');
      expect(properties.statementReadings.items.properties.kind.description).toContain('agreed_terms');
      expect(properties.unresolvedIssues.description).toContain('회신 부재');
    }
    const plain = buildProductReanalysisRequest({
      originalInput: '양조장 체험',
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '가능성이 높다',
      founderFeedback: null,
    });
    const plainPayload = userPayload(plain);
    expect(JSON.stringify(plainPayload)).toContain(prior);
    const plainNames: string[] = [];
    const walkPlain = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(walkPlain);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        plainNames.push(key);
        walkPlain(child);
      }
    };
    walkPlain(plainPayload);
    expect(plainNames).toContain('priorJudgmentText');
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).not.toContain('상대의 회신이 있었는가');
  });

  it('separates a blank supply from a missing supply and rejects a state that does not match the text', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const parsed = JSON.parse(
        contractReply(request, '지불은 그대로 미확인이다. 이유는 새 증거가 없기 때문이다.', ['지불 의사를 누구에게 확인할 것인가?']),
      ) as Record<string, unknown>;
      const supplement = JSON.stringify(payload.stagePairs);
      if (supplement.includes('공백 공급')) {
        parsed.supply = '   ';
        return reply(JSON.stringify(parsed));
      }
      if (supplement.includes('빠진 공급')) {
        delete parsed.supply;
        return reply(JSON.stringify(parsed));
      }
      if (supplement.includes('상태 불일치')) {
        parsed.supply = '독점 공급 계약을 체결했다';
        parsed.supplyState = 'not_analyzed';
        return reply(JSON.stringify(parsed));
      }
      if (supplement.includes('판단 문장 포함')) {
        parsed.updatedJudgment =
          '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다. 이번 답은 확인된 사실이 아니다.';
        return reply(JSON.stringify(parsed));
      }
      parsed.updatedJudgment = '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
      return reply(JSON.stringify(parsed));
    };
    const base = {
      store,
      userId: 'user-blank-field',
      projectId: 'project-blank-field',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 공급 상태.`, origin: 'typed', fileName: null });
    const answersFor = (comment: string) => [
      { questionId: 'q1', comment },
      { questionId: 'q2', comment: '가격은 정하지 않았다' },
      { questionId: 'q3', comment: '온라인 게시로 알린다' },
    ];
    const blank = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers: answersFor('공백 공급') });
    expect(blank.ok).toBe(true);
    if (!blank.ok) return;
    expect(blank.record.callCount).toBe(1);
    expect(blank.record.error).toContain('stage_field_blank');
    expect(blank.record.error).not.toContain('stage_fields_missing');
    expect(blank.record.rawContent).toContain('"supply":"   "');
    const missingParent = await runFirstReview({
      ...base,
      userId: 'user-missing-field',
      projectId: 'project-missing-field',
      text: `${IDEA} 공급 누락.`,
    });
    const missing = await submitConsultingStage({
      ...base,
      userId: 'user-missing-field',
      projectId: 'project-missing-field',
      reviewId: missingParent.record.reviewId,
      answers: answersFor('빠진 공급'),
    });
    expect(missing.ok).toBe(true);
    if (!missing.ok) return;
    expect(missing.record.error).toContain('stage_fields_missing');
    expect(missing.record.error).not.toContain('stage_field_blank');
    const mismatchParent = await runFirstReview({
      ...base,
      userId: 'user-mismatch-field',
      projectId: 'project-mismatch-field',
      text: `${IDEA} 상태 불일치.`,
    });
    const mismatch = await submitConsultingStage({
      ...base,
      userId: 'user-mismatch-field',
      projectId: 'project-mismatch-field',
      reviewId: mismatchParent.record.reviewId,
      answers: answersFor('상태 불일치'),
    });
    expect(mismatch.ok).toBe(true);
    if (!mismatch.ok) return;
    expect(mismatch.record.error).toContain('stage_content_insufficient');
    expect(mismatch.record.callCount).toBe(1);
    const copiedParent = await runFirstReview({
      ...base,
      userId: 'user-copied-judgment',
      projectId: 'project-copied-judgment',
      text: `${IDEA} 판단 복사.`,
    });
    const copied = await submitConsultingStage({
      ...base,
      userId: 'user-copied-judgment',
      projectId: 'project-copied-judgment',
      reviewId: copiedParent.record.reviewId,
      answers: answersFor('판단만 복사'),
    });
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    expect(copied.record.status).toBe('succeeded');
    expect(copied.record.error).toBeNull();
    expect(copied.record.sections?.judgment).toContain('가격이 정해지지 않아 판단을 유지한다');
    const wrappedParent = await runFirstReview({
      ...base,
      userId: 'user-wrapped-judgment',
      projectId: 'project-wrapped-judgment',
      text: `${IDEA} 판단 포함.`,
    });
    const wrapped = await submitConsultingStage({
      ...base,
      userId: 'user-wrapped-judgment',
      projectId: 'project-wrapped-judgment',
      reviewId: wrappedParent.record.reviewId,
      answers: answersFor('판단 문장 포함'),
    });
    expect(wrapped.ok).toBe(true);
    if (!wrapped.ok) return;
    expect(wrapped.record.status).toBe('succeeded');
    expect(wrapped.record.error).toBeNull();
    expect(wrapped.record.sections?.judgment).toContain('이번 답은 확인된 사실이 아니다');
    expect(calls.filter((request) => Array.isArray(requestPayload(request)?.stagePairs))).toHaveLength(5);
  });

  it('marks the live multi-round cooperation question as repeated and the empty issue lists as dropped', async () => {
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const follow = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-multi-round-validation.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string; rowStatus: string; rowError: string | null }> };
    expect(follow.rounds[0]?.rowStatus).toBe('succeeded');
    expect(follow.rounds[0]?.rowError ?? null).toBeNull();
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? follow.rounds[0]?.raw ?? '' : first.rounds[0]?.raw ?? '');
    };
    const base = {
      store,
      userId: 'user-multi-round',
      projectId: 'project-multi-round',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const parent = await runFirstReview({
      ...base,
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
    });
    const questions = consultingQuestions(parent.record.sections);
    const judged = await submitConsultingStage({
      ...base,
      reviewId: parent.record.reviewId,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
    });
    expect(judged.ok).toBe(true);
    if (!judged.ok) return;
    expect(judged.record.callCount).toBe(1);
    expect(judged.record.error).toContain('stage_questions_repeated');
    expect(judged.record.error).toContain('stage_issues_dropped');
    expect(judged.record.rawContent).toContain('어떻게 구체화할 것인가');
  });

  it('marks the live quality-fix-2 cooperation-plan question as repeated after punctuation is ignored', async () => {
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const follow = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-2.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string; rowError: string }> };
    expect(follow.rounds[0]?.rowError).toBe('stage_field_blank,stage_judgment_copied,stage_issues_copied');
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? follow.rounds[0]?.raw ?? '' : first.rounds[0]?.raw ?? '');
    };
    const base = {
      store,
      userId: 'user-quality-fix-2',
      projectId: 'project-quality-fix-2',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const parent = await runFirstReview({
      ...base,
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
    });
    const questions = consultingQuestions(parent.record.sections);
    const failed = await submitConsultingStage({
      ...base,
      reviewId: parent.record.reviewId,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.error).toContain('stage_questions_repeated');
    expect(failed.record.error).not.toContain('stage_judgment_copied');
    expect(failed.record.error).toContain('stage_issues_copied');
    expect(failed.record.rawContent).toContain('아직 분석되지 않았다');
  });

  it('stores the quality-fix-4 reassessment that kept the judgment without the four labels', async () => {
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const follow = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-4.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string; rowError: string; executionId: string }> };
    expect(follow.rounds[0]?.executionId).toBe('chatcmpl-EfIFfQCEMCFaqtK3Av6GpcAW6qS9U');
    expect(follow.rounds[0]?.rowError).toBe('stage_reassessment_missing');
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? follow.rounds[0]?.raw ?? '' : first.rounds[0]?.raw ?? '');
    };
    const parent = await runFirstReview({
      store,
      userId: 'user-quality-fix-4',
      projectId: 'project-quality-fix-4',
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const questions = consultingQuestions(parent.record.sections);
    const judged = await submitConsultingStage({
      store,
      userId: 'user-quality-fix-4',
      projectId: 'project-quality-fix-4',
      reviewId: parent.record.reviewId,
      now: NOW,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
      chat,
      evidence: 'injected_http',
    });
    expect(judged.ok).toBe(true);
    if (!judged.ok) return;
    expect(judged.record.callCount).toBe(1);
    expect(judged.record.error ?? '').not.toContain('stage_reassessment_missing');
    expect(judged.record.sections).not.toBeNull();
    expect(judged.record.stageReading?.updatedJudgment).toContain('확인되지 않았다');
    expect(judged.record.stageReading?.impactOnPreviousJudgment).toContain('유지');
    expect(judged.record.stageReading?.judgmentReason.length).toBeGreaterThan(0);
    expect(judged.record.stageReading?.answerInterpretation[0]?.meaning).toContain('확인된 사실이 아니다');
    expect(judged.record.stageReading?.unresolvedIssues).toContain('양조장 후보가 없다.');
    expect(judged.record.sections?.nextQuestion).toContain('후보');
    expect(judged.record.rawContent).toContain('유지, 양조장 협력 가능성이 높다는 주장은 확인되지 않았다');
  });

  it('replays the quality-fix-6 raw and keeps the not-analyzed sentence punctuation', async () => {
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const follow = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-6.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string; rowError: string; executionId: string }> };
    expect(follow.rounds[0]?.executionId).toBe('chatcmpl-EfIliKvGG2fydxXw2ZlhTjjSlcrGH');
    expect(follow.rounds[0]?.rowError).toBe('stage_content_insufficient');
    expect(follow.rounds[0]?.raw).toContain('아직 분석되지 않았다.');
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const payload = requestPayload(request);
      return reply(payload && Array.isArray(payload.stagePairs) ? follow.rounds[0]?.raw ?? '' : first.rounds[0]?.raw ?? '');
    };
    const parent = await runFirstReview({
      store,
      userId: 'user-quality-fix-6',
      projectId: 'project-quality-fix-6',
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const questions = consultingQuestions(parent.record.sections);
    const judged = await submitConsultingStage({
      store,
      userId: 'user-quality-fix-6',
      projectId: 'project-quality-fix-6',
      reviewId: parent.record.reviewId,
      now: NOW,
      answers: questions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
      chat,
      evidence: 'injected_http',
    });
    expect(judged.ok).toBe(true);
    if (!judged.ok) return;
    expect(judged.record.callCount).toBe(1);
    expect(judged.record.error ?? null).toBeNull();
    const reread = await store.readReview('user-quality-fix-6', judged.record.reviewId);
    expect(reread?.error ?? null).toBeNull();
    expect(reread?.sections?.analysis?.supply).toBe('아직 분석되지 않았다.');
    expect(reread?.sections?.analysis?.marketing).toBe('아직 분석되지 않았다.');
    expect(reread?.rawContent).toContain('"supply": "아직 분석되지 않았다."');
    expect(reread?.rawContent).toContain('"supplyState": "not_analyzed"');
    expect(reread?.rawContent).toContain('"marketing": "아직 분석되지 않았다."');
    expect(reread?.rawContent).toContain('"marketingState": "not_analyzed"');
    expect(reread?.stageReading?.updatedJudgment).toBe(
      '사업 모델의 잠재력은 남을 수 있으나, 양조장과의 협력 관계가 불확실하다. 추가 검증이 필요하다.',
    );
    expect(reread?.sections?.nextQuestion).toBe('양조장과의 접촉이 있었는가?');
    expect(reread?.stageReading?.verifiedFacts).toEqual([]);
    expect(reread?.stageReading?.unverifiedClaims?.[0]).toContain('양조장 협력 가능성이 높다고 판단한다');
  });

  it('rejects an unnegated rise and stores a sentence that withdraws that rise', async () => {
    const risen = '협력 가능성이 높아졌다.';
    const withdrawn = '협력 가능성이 높다는 판단은 유지되지 않는다.';
    const cases: Array<{ id: string; sentence: string; error: string | null }> = [
      { id: 'rise-claim', sentence: risen, error: 'stage_claim_as_positive' },
      { id: 'rise-withdrawn', sentence: withdrawn, error: null },
    ];
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const supplement = JSON.stringify(payload.stagePairs);
      const matched = cases.find((item) => supplement.includes(item.id));
      const parsed = JSON.parse(contractReply(request, '지불은 그대로 미확인이다.', ['첫 유료 참가자는 있는가?'])) as Record<string, unknown>;
      if (matched) {
        const items = parsed.answerInterpretation as Array<Record<string, string>>;
        for (const item of items) {
          item.meaning = matched.sentence;
          item.judgmentEffect = matched.sentence;
        }
        parsed.judgmentReason = matched.sentence;
        parsed.updatedJudgment = matched.sentence;
        parsed.verifiedFacts = [];
      }
      return reply(JSON.stringify(parsed));
    };
    for (const item of cases) {
      const userId = `user-${item.id}`;
      const parent = await runFirstReview({
        store,
        userId,
        projectId: `project-${item.id}`,
        text: `${IDEA} ${item.id}`,
        origin: 'typed',
        fileName: null,
        now: NOW,
        chat,
        evidence: 'injected_http',
      });
      const judged = await submitConsultingStage({
        store,
        userId,
        projectId: `project-${item.id}`,
        reviewId: parent.record.reviewId,
        now: NOW,
        answers: [
          { questionId: 'q1', comment: item.id },
          { questionId: 'q2', comment: '가격은 정하지 않았다' },
          { questionId: 'q3', comment: '온라인 게시로 알린다' },
        ],
        chat,
        evidence: 'injected_http',
      });
      expect(judged.ok).toBe(true);
      if (!judged.ok) return;
      expect(judged.record.callCount).toBe(1);
      if (item.error) {
        expect(judged.record.error).toContain(item.error);
        expect(judged.record.sections).toBeNull();
      } else {
        expect(judged.record.error ?? null).toBeNull();
        expect(judged.record.sections).not.toBeNull();
      }
    }
    const failed = await store.readReview('user-rise-claim', (await store.listReviews('user-rise-claim', 'project-rise-claim')).at(-1)?.reviewId ?? '');
    expect(failed?.error).toContain('stage_claim_as_positive');
    expect(failed?.sections).toBeNull();
    expect(failed?.rawContent).toContain(risen);
    const kept = await store.readReview('user-rise-withdrawn', (await store.listReviews('user-rise-withdrawn', 'project-rise-withdrawn')).at(-1)?.reviewId ?? '');
    expect(kept?.error ?? null).toBeNull();
    expect(kept?.stageReading?.answerInterpretation[0]?.meaning).toBe(withdrawn);
    expect(kept?.stageReading?.answerInterpretation[0]?.judgmentEffect).toBe(withdrawn);
    expect(kept?.stageReading?.judgmentReason).toBe(withdrawn);
    expect(kept?.stageReading?.updatedJudgment).toBe(withdrawn);
    expect(kept?.stageReading?.verifiedFacts).toEqual([]);
    expect(kept?.sections?.nextQuestion).toBe('첫 유료 참가자는 있는가?');
  });

  it('revalidates the quality-fix-11 raw without a new model call', async () => {
    const evidencePath = new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-11.json', import.meta.url);
    const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as {
      liveCallCount: number;
      simulationAnswer: string;
      rounds: Array<{ raw?: string; rowError: string | null; executionId: string; reviewId: string }>;
    };
    expect(evidence.liveCallCount).toBe(1);
    expect(evidence.rounds[1]?.executionId).toBe('chatcmpl-EfKI4PVBVfvgbQLpkkOODPZkgudWH');
    expect(evidence.rounds[1]?.rowError).toBe('stage_claim_as_positive');
    expect(evidence.rounds[1]?.reviewId).toBe('d311d088-71ad-4131-9614-3c8ec178a24a');
    const preservedRaw = evidence.rounds[1]?.raw ?? '';
    expect(preservedRaw).toContain('협력 가능성이 높다는 판단은 유지되지 않는다.');
    const first = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const second = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-6.json', import.meta.url), 'utf8'),
    ) as { rounds: Array<{ raw: string }> };
    const store = openAiPmReviewStore(storePath());
    let injectedCalls = 0;
    const chat = async (request: ChatRequest) => {
      injectedCalls += 1;
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) return reply(first.rounds[0]?.raw ?? '');
      const current = JSON.stringify(payload.stagePairs);
      return reply(current.includes('문의했다고') ? preservedRaw : (second.rounds[0]?.raw ?? ''));
    };
    const userId = 'user-quality-fix-12';
    const projectId = 'project-quality-fix-12';
    const parent = await runFirstReview({
      store,
      userId,
      projectId,
      text: '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const firstQuestions = consultingQuestions(parent.record.sections);
    const secondReview = await submitConsultingStage({
      store,
      userId,
      projectId,
      reviewId: parent.record.reviewId,
      now: NOW,
      answers: firstQuestions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.' : '추가 사실은 없다.',
      })),
      chat,
      evidence: 'injected_http',
    });
    expect(secondReview.ok).toBe(true);
    if (!secondReview.ok) return;
    expect(secondReview.record.error ?? null).toBeNull();
    expect(secondReview.record.sections?.nextQuestion).toContain('접촉');
    const thirdQuestions = consultingQuestions(secondReview.record.sections);
    const replay = await submitConsultingStage({
      store,
      userId,
      projectId,
      reviewId: secondReview.record.reviewId,
      now: NOW,
      answers: thirdQuestions.map((question, index) => ({
        questionId: question.questionId,
        comment: index === 0 ? evidence.simulationAnswer : '추가 사실은 없다.',
      })),
      chat,
      evidence: 'injected_http',
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(injectedCalls).toBe(3);
    expect(replay.record.callCount).toBe(1);
    expect(replay.record.reviewId).not.toBe(evidence.rounds[1]?.reviewId);
    expect(replay.record.error ?? null).toBeNull();
    const reread = await store.readReview(userId, replay.record.reviewId);
    expect(reread?.error ?? null).toBeNull();
    expect(reread?.stageReading?.answerInterpretation[0]?.meaning).toBe('양조장에 문의했다고 주장하나, 확인된 사실은 없다.');
    expect(reread?.stageReading?.answerInterpretation[0]?.judgmentEffect).toBe('협력 가능성이 높다는 판단은 유지되지 않는다.');
    expect(reread?.stageReading?.judgmentReason).toBe(
      '협력 가능성이 높다는 판단은 유지되지 않는다. 확인된 접촉이 없으므로 성공 가능성은 높아지지 않았다.',
    );
    expect(reread?.stageReading?.updatedJudgment).toBe(
      '사업 모델의 잠재력은 남을 수 있으나, 협력 가능성은 높지 않다. 현재 가장 중요한 미해결 위험은 양조장과의 협력 관계가 불확실하다는 점이다. 추가 검증이 필요한 이유는 상대의 반응이 없고, 참여 의향이 확인되지 않았기 때문이다.',
    );
    expect(reread?.stageReading?.verifiedFacts).toEqual([]);
    expect(reread?.stageReading?.unresolvedIssues).toEqual([
      '양조장과의 협력 관계가 불확실하다.',
      '상대의 반응이 없다.',
      '참여 의향이 확인되지 않았다.',
      '체험과 운영 조건이 합의되지 않았다.',
    ]);
    expect(reread?.sections?.nextQuestion).toBe('양조장과의 후속 연락이 가능한가?');
    expect(reread?.rawContent).toContain('협력 가능성이 높다는 판단은 유지되지 않는다.');
    expect(reread?.rawContent).toContain('"verifiedFacts": []');
    const stillFailed = JSON.parse(readFileSync(evidencePath, 'utf8')) as { rounds: Array<{ rowError: string | null; executionId: string }> };
    expect(stillFailed.rounds[1]?.executionId).toBe('chatcmpl-EfKI4PVBVfvgbQLpkkOODPZkgudWH');
    expect(stillFailed.rounds[1]?.rowError).toBe('stage_claim_as_positive');
  });

  it('accepts trailing punctuation only for not_analyzed and keeps the model sentence', async () => {
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const parsed = JSON.parse(
        contractReply(request, '지불은 그대로 미확인이다. 이유는 새 증거가 없기 때문이다.', ['첫 유료 참가자는 있는가?']),
      ) as Record<string, unknown>;
      const supplement = JSON.stringify(payload.stagePairs);
      if (supplement.includes('마침표 미분석')) {
        parsed.supply = '  아직 분석되지 않았다.  ';
        parsed.supplyState = 'not_analyzed';
        parsed.marketing = '아직 분석되지 않았다。';
        parsed.marketingState = 'not_analyzed';
        return reply(JSON.stringify(parsed));
      }
      parsed.supply = '아직 확인되지 않았다.';
      parsed.supplyState = 'unconfirmed';
      return reply(JSON.stringify(parsed));
    };
    const base = {
      store,
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const keptParent = await runFirstReview({
      ...base,
      userId: 'user-not-analyzed-period',
      projectId: 'project-not-analyzed-period',
      text: `${IDEA} 마침표 미분석.`,
      origin: 'typed',
      fileName: null,
    });
    const kept = await submitConsultingStage({
      ...base,
      userId: 'user-not-analyzed-period',
      projectId: 'project-not-analyzed-period',
      reviewId: keptParent.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '마침표 미분석' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.record.error ?? null).toBeNull();
    const reread = await store.readReview('user-not-analyzed-period', kept.record.reviewId);
    expect(reread?.sections?.analysis?.supply).toBe('아직 분석되지 않았다.');
    expect(reread?.sections?.analysis?.marketing).toBe('아직 분석되지 않았다。');
    expect(reread?.rawContent).toContain('"supplyState":"not_analyzed"');
    const otherParent = await runFirstReview({
      ...base,
      userId: 'user-unconfirmed-period',
      projectId: 'project-unconfirmed-period',
      text: `${IDEA} 마침표 미확인.`,
      origin: 'typed',
      fileName: null,
    });
    const other = await submitConsultingStage({
      ...base,
      userId: 'user-unconfirmed-period',
      projectId: 'project-unconfirmed-period',
      reviewId: otherParent.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '마침표 미확인' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.record.error).toContain('stage_content_insufficient');
    expect(other.record.sections).toBeNull();
  });

  it('accepts a kept or changed reassessment and rejects a response that does not reassess', async () => {
    const prior = '가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
    const nextQuestion = '첫 유료 참가자는 있는가?';
    const cases: Array<{ id: string; patch: Record<string, unknown>; error: string | null }> = [
      {
        id: 'case-change',
        patch: {
          updatedJudgment: '고객을 직장인으로 좁혀도 가격은 없고 지불 확인이 없어 이전보다 낮게 본다.',
          impactOnPreviousJudgment: '이번 답은 고객 범위를 줄였고 가격 공백은 그대로라 이전 판단을 낮춘다.',
          judgmentReason: '확인된 지불이 없어 낙관을 낮춘다.',
          unresolvedIssues: ['첫 유료 참가자가 없다'],
          resolvedIssues: [],
        },
        error: null,
      },
      {
        id: 'case-keep',
        patch: {
          updatedJudgment: '가격 공백은 그대로라 기존 판단을 유지한다.',
          impactOnPreviousJudgment: '이번 답은 새 증거를 더하지 않아 이전 판단의 결론을 바꾸지 않는다.',
          judgmentReason: '지불 확인이 여전히 없어 같은 결론을 유지한다.',
          unresolvedIssues: ['지불 의사가 있는 참가자가 없다'],
          resolvedIssues: [],
        },
        error: null,
      },
      {
        id: 'case-claim',
        patch: {
          updatedJudgment: '가격이 곧 정해질 것이라는 말은 근거가 없어 성공 가능성을 올리지 않는다.',
          impactOnPreviousJudgment: '긍정적 주장은 확인된 사실이 아니라 이전 판단을 바꾸지 않는다.',
          judgmentReason: '별도 증거가 없어 그 주장을 근거로 쓰지 않는다.',
          verifiedFacts: [],
          unverifiedClaims: ['가격이 곧 정해질 것이라는 주장이 있다'],
          unresolvedIssues: ['실제 가격 제안이 없다'],
          resolvedIssues: [],
        },
        error: null,
      },
      {
        id: 'case-resolved',
        patch: {
          updatedJudgment: '장소 공백은 닫혔고 지불은 그대로 미확인이라 그 부분만 남긴다.',
          impactOnPreviousJudgment: '이번 답은 장소 위험을 닫고 지불 위험은 그대로 둔다.',
          judgmentReason: '장소는 확인됐고 지불 증거는 늘지 않았다.',
          resolvedIssues: ['장소가 없다는 위험은 이번 답으로 닫혔다'],
          unresolvedIssues: ['첫 모임의 지불은 아직 없다'],
        },
        error: null,
      },
      {
        id: 'case-new-risk',
        patch: {
          updatedJudgment: '가격 공백에 더해 장소 대관이 거절될 수 있어 위험은 늘었다.',
          impactOnPreviousJudgment: '이번 답은 기존 판단을 유지한 채 장소 대관 거절을 새 위험으로 더한다.',
          judgmentReason: '새 위험은 확인된 대관이 없기 때문이다.',
          unresolvedIssues: ['장소 대관이 거절될 수 있다'],
          resolvedIssues: [],
          risks: ['장소 대관이 거절될 수 있다'],
        },
        error: null,
      },
      {
        id: 'case-no-reassessment',
        patch: {
          impactOnPreviousJudgment: '기존 문장을 한 줄로만 반복한다.',
          updatedJudgment: '기존 문장을 한 줄로만 반복한다.',
          judgmentReason: '기존 문장을 한 줄로만 반복한다.',
          unresolvedIssues: ['아직 확인하지 않은 지불이 있다'],
          resolvedIssues: [],
        },
        error: 'stage_reassessment_missing',
      },
      {
        id: 'case-pasted-prior',
        patch: {
          impactOnPreviousJudgment: prior,
          updatedJudgment: '가격 공백은 남았으나 문장을 새로 적는다.',
          judgmentReason: '지불 증거가 없어 결론을 유지한다.',
          unresolvedIssues: ['지불 의사 확인이 아직 없다'],
          resolvedIssues: [],
        },
        error: 'stage_reassessment_missing',
      },
    ];
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) return reply(stageRaw(prior, FIRST_QUESTIONS));
      const supplement = JSON.stringify(payload.stagePairs);
      const matched = cases.find((item) => supplement.includes(item.id));
      const parsed = JSON.parse(contractReply(request, '지불은 그대로 미확인이다.', [nextQuestion])) as Record<string, unknown>;
      if (matched) Object.assign(parsed, matched.patch);
      return reply(JSON.stringify(parsed));
    };
    for (const item of cases) {
      const userId = `user-${item.id}`;
      const parent = await runFirstReview({
        store,
        userId,
        projectId: `project-${item.id}`,
        text: `${IDEA} ${item.id}`,
        origin: 'typed',
        fileName: null,
        now: NOW,
        chat,
        evidence: 'injected_http',
      });
      const judged = await submitConsultingStage({
        store,
        userId,
        projectId: `project-${item.id}`,
        reviewId: parent.record.reviewId,
        now: NOW,
        answers: [
          { questionId: 'q1', comment: item.id },
          { questionId: 'q2', comment: '가격은 정하지 않았다' },
          { questionId: 'q3', comment: '온라인 게시로 알린다' },
        ],
        chat,
        evidence: 'injected_http',
      });
      expect(judged.ok).toBe(true);
      if (!judged.ok) return;
      expect(judged.record.callCount).toBe(1);
      if (item.error) {
        expect(judged.record.error).toContain(item.error);
        expect(judged.record.sections).toBeNull();
      } else {
        expect(judged.record.error ?? null).toBeNull();
        expect(judged.record.sections).not.toBeNull();
        expect(judged.record.error ?? '').not.toContain('stage_reassessment_missing');
      }
    }
    const kept = (await store.listReviews('user-case-keep', 'project-case-keep')).at(-1);
    expect(kept?.stageReading?.updatedJudgment).toBe('가격 공백은 그대로라 기존 판단을 유지한다.');
    expect(kept?.stageReading?.updatedJudgment).not.toContain('이번 답');
    const changed = (await store.listReviews('user-case-change', 'project-case-change')).at(-1);
    expect(changed?.stageReading?.updatedJudgment).toContain('이전보다 낮게 본다');
    const claim = (await store.listReviews('user-case-claim', 'project-case-claim')).at(-1);
    expect(claim?.stageReading?.verifiedFacts).toEqual([]);
    expect(claim?.stageReading?.unverifiedClaims).toContain('가격이 곧 정해질 것이라는 주장이 있다');
    expect(claim?.error ?? '').not.toContain('stage_claim_promoted');
    expect(claim?.error ?? '').not.toContain('stage_claim_as_positive');
    const resolved = (await store.listReviews('user-case-resolved', 'project-case-resolved')).at(-1);
    expect(resolved?.stageReading?.resolvedIssues).toContain('장소가 없다는 위험은 이번 답으로 닫혔다');
    const added = (await store.listReviews('user-case-new-risk', 'project-case-new-risk')).at(-1);
    expect(added?.stageReading?.unresolvedIssues).toContain('장소 대관이 거절될 수 있다');
    expect(added?.sections?.risks).toContain('장소 대관이 거절될 수 있다');
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
    if (sections?.analysis) {
      sections.analysis.product = '독서 모임';
      sections.analysis.supply = '장소 공급은 입력에 없다';
      sections.analysis.marketing = '알림 방법은 아직 확인되지 않았다';
      const first = sections.analysis.questions?.[0];
      if (first) first.verificationPurpose = '지불 의사가 있는지이며 고객이 누구인지는 다시 묻지 않는다';
    }
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
      stageReading: {
        answerInterpretation: [
          {
            questionId: 'q1',
            choiceId: 'c1',
            meaning: '직장인 답은 고객 가설이지 확인된 수요가 아니다',
            founderBasis: '입력에 직장인이라고 적혀 있다',
            observedEvidence: '확인된 접촉이나 합의는 없다',
            judgmentEffect: '고객 가설은 유지되고 지불 판단은 바뀌지 않는다',
            openRisk: '지불 의사는 아직 검증되지 않았다',
          },
        ],
        impactOnPreviousJudgment: '이번 답이 기존 판단에 준 영향이다.',
        updatedJudgment: '가격이 정해지지 않아 판단을 유지한다.',
        judgmentReason: '지불 확인이 없어 판단을 유지한다.',
        verifiedFacts: [],
        unverifiedClaims: [],
        assumptions: [],
        resolvedIssues: [],
        unresolvedIssues: ['지불 의사는 확인되지 않았다'],
        nextVerification: '지불 의사를 확인한다.',
        nextQuestions: [],
        nextQuestionChoices: [],
      },
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
    expect(html).toContain('확인하려는 불확실성');
    expect(html).toContain('지불 의사가 있는지이며 고객이 누구인지는 다시 묻지 않는다');
    expect(html).toContain('이번 답의 해석');
    expect(html).toContain('직장인 답은 고객 가설이지 확인된 수요가 아니다');
    expect(html).toContain('입력에 직장인이라고 적혀 있다');
    expect(html).toContain('고객 가설은 유지되고 지불 판단은 바뀌지 않는다');
    expect(html).toContain('지불 의사는 아직 검증되지 않았다');
    expect(html).toContain('제품');
    expect(html).toContain('독서 모임');
    expect(html).toContain('공급');
    expect(html).toContain('장소 공급은 입력에 없다');
    expect(html).toContain('마케팅');
    expect(html).toContain('알림 방법은 아직 확인되지 않았다');
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

  it('stores the model business rewrite and rejects a blank profile without a second call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const parsed = JSON.parse(
        contractReply(request, '직장인 답을 반영해 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', SECOND_QUESTIONS),
      ) as Record<string, unknown>;
      const supplement = JSON.stringify(payload.stagePairs);
      if (supplement.includes('고객 칸을 비운 답')) {
        delete parsed.customer;
        return reply(JSON.stringify(parsed));
      }
      parsed.customer = '답을 반영한 고객은 직장인이다';
      return reply(JSON.stringify(parsed));
    };
    const base = {
      store,
      userId: 'user-profile',
      projectId: 'project-profile',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 사업 구조.`, origin: 'typed', fileName: null });
    expect(first.record.sections?.customer).toBe('직장인');
    const parentFinishedAt = first.record.finishedAt;
    const answers = [
      { questionId: 'q1', comment: '직장인을 고객으로 본다' },
      { questionId: 'q2', comment: '가격은 정하지 않았다' },
      { questionId: 'q3', comment: '온라인 게시로 알린다' },
    ];
    const integrated = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers });
    expect(integrated.ok && integrated.called).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.record.callCount).toBe(1);
    expect(integrated.record.sections?.customer).toBe('답을 반영한 고객은 직장인이다');
    expect(integrated.record.sections?.problem).toBe('모임 수요가 확인되지 않았다');
    expect(integrated.record.sections?.market).toBe('수요는 입력에 없다');
    expect(integrated.record.sections?.revenueModel).toBe('가격은 가설이며 원문에 없다');
    expect(integrated.record.sections?.analysis?.value).toBe('함께 읽는 자리');
    expect(integrated.record.sections?.analysis?.product).toBe('독서 모임');
    expect(integrated.record.sections?.analysis?.operatingModel).toBe('운영은 아직 구상이다');
    expect(integrated.record.sections?.analysis?.supply).toBe('장소 공급은 입력에 없다');
    expect(integrated.record.sections?.analysis?.marketing).toBe('알림 방법은 아직 확인되지 않았다');
    expect(integrated.record.sections?.analysis?.competition).toBe('경쟁은 확인되지 않았다');
    expect(integrated.record.sections?.analysis?.operations).toBe('실행은 아직 확인되지 않았다');
    expect(integrated.record.sections?.risks).toEqual(['수요가 확인되지 않았다']);
    expect(integrated.record.stageReading?.businessProfile?.customer).toBe('답을 반영한 고객은 직장인이다');
    expect(integrated.record.stageReading?.answerInterpretation[0]?.founderBasis).toContain('입력에 적힌 계획');
    expect(integrated.record.stageReading?.answerInterpretation[0]?.observedEvidence).toContain('확인된 접촉이나 합의는 없다');
    expect(integrated.record.stageReading?.answerInterpretation[0]?.judgmentEffect).toContain('이전 판단은 유지');
    expect(integrated.record.stageReading?.answerInterpretation[0]?.openRisk).toContain('아직 검증되지 않았다');
    expect(integrated.view.stageReading?.answerInterpretation[0]?.meaning).toContain('확인된 사실은 늘리지 않는다');
    expect((await store.readReview('user-profile', first.record.reviewId))?.sections?.customer).toBe('직장인');
    expect((await store.readReview('user-profile', first.record.reviewId))?.finishedAt).toBe(parentFinishedAt);
    const stageRequest = calls[1]!;
    expect(JSON.stringify(userPayload(stageRequest).stagePairs)).toContain('직장인을 고객으로 본다');
    if (stageRequest.responseFormat?.type === 'json_schema') {
      const required = stageRequest.responseFormat.schema.required as string[];
      expect(required).toEqual(expect.arrayContaining(['customer', 'product', 'supply', 'marketing', 'executionNote']));
    }
    const blankFirst = await runFirstReview({
      ...base,
      userId: 'user-blank',
      projectId: 'project-blank',
      text: `${IDEA} 빈 고객.`,
    });
    const before = calls.length;
    const blankAnswers = [
      { questionId: 'q1', comment: '고객 칸을 비운 답' },
      { questionId: 'q2', comment: '가격은 정하지 않았다' },
      { questionId: 'q3', comment: '온라인 게시로 알린다' },
    ];
    const failed = await submitConsultingStage({
      ...base,
      userId: 'user-blank',
      projectId: 'project-blank',
      reviewId: blankFirst.record.reviewId,
      answers: blankAnswers,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.called).toBe(true);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.sections).toBeNull();
    expect(failed.record.rawContent).not.toContain('"customer"');
    expect(calls).toHaveLength(before + 1);
    const again = await submitConsultingStage({
      ...base,
      userId: 'user-blank',
      projectId: 'project-blank',
      reviewId: blankFirst.record.reviewId,
      answers: blankAnswers,
    });
    expect(again.ok && !again.called).toBe(true);
    expect(calls).toHaveLength(before + 1);
  });

  it('rejects a copied answer and a question that repeats that answer after one call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const parsed = JSON.parse(
        contractReply(request, '복사한 답은 판단이 아니다. 이유는 문장이 같기 때문이다.', SECOND_QUESTIONS),
      ) as Record<string, unknown>;
      const pairs = payload.stagePairs as Array<{ supplement?: string }>;
      const supplement = pairs.map((pair) => pair.supplement ?? '').join('\n');
      if (supplement.includes('라벨만 복사한 답')) {
        const items = parsed.answerInterpretation as Array<Record<string, string>>;
        for (const item of items) {
          item.meaning = '라벨만 복사한 답';
          item.founderBasis = '라벨만 복사한 답';
          item.observedEvidence = '라벨만 복사한 답';
          item.judgmentEffect = '라벨만 복사한 답';
          item.openRisk = '라벨만 복사한 답';
        }
      }
      if (supplement.includes('질문을 답으로 다시 낸다')) {
        const next = parsed.nextQuestions as Array<{ text: string }>;
        if (next[0]) next[0].text = '질문을 답으로 다시 낸다';
      }
      return reply(JSON.stringify(parsed));
    };
    const base = {
      store,
      userId: 'user-echo',
      projectId: 'project-echo',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 복사.`, origin: 'typed', fileName: null });
    const echoAnswers = [
      { questionId: 'q1', comment: '라벨만 복사한 답' },
      { questionId: 'q2', comment: '가격은 정하지 않았다' },
      { questionId: 'q3', comment: '온라인 게시로 알린다' },
    ];
    const echoed = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers: echoAnswers });
    expect(echoed.ok).toBe(true);
    if (!echoed.ok) return;
    expect(echoed.called).toBe(true);
    expect(echoed.record.callCount).toBe(1);
    expect(echoed.record.status).toBe('failed');
    expect(echoed.record.sections).toBeNull();
    expect(echoed.record.error).toContain('stage_answer_echo');
    expect(echoed.record.rawContent).toContain('라벨만 복사한 답');
    const echoCalls = calls.length;
    const echoAgain = await submitConsultingStage({ ...base, reviewId: first.record.reviewId, answers: echoAnswers });
    expect(echoAgain.ok && !echoAgain.called).toBe(true);
    expect(calls).toHaveLength(echoCalls);

    const repeatFirst = await runFirstReview({
      ...base,
      userId: 'user-repeat-answer',
      projectId: 'project-repeat-answer',
      text: `${IDEA} 질문 반복.`,
    });
    const before = calls.length;
    const repeated = await submitConsultingStage({
      ...base,
      userId: 'user-repeat-answer',
      projectId: 'project-repeat-answer',
      reviewId: repeatFirst.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '질문을 답으로 다시 낸다' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(repeated.ok).toBe(true);
    if (!repeated.ok) return;
    expect(repeated.record.status).toBe('failed');
    expect(repeated.record.callCount).toBe(1);
    expect(repeated.record.error).toContain('stage_questions_repeated');
    expect(repeated.record.rawContent).toContain('질문을 답으로 다시 낸다');
    expect(calls).toHaveLength(before + 1);
    const parent = await store.readReview('user-repeat-answer', repeatFirst.record.reviewId);
    expect(parent?.finishedAt).toBe(repeatFirst.record.finishedAt);
    expect(parent?.sections?.customer).toBe('직장인');
  });

  it('rejects a new question whose purpose copies an earlier question', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      const payload = requestPayload(request);
      if (!payload || !Array.isArray(payload.stagePairs)) {
        return reply(stageRaw('가격이 정해지지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.', FIRST_QUESTIONS));
      }
      const parsed = JSON.parse(
        contractReply(request, '목적은 이전 질문과 같다. 이유는 검증이 달라지지 않기 때문이다.', SECOND_QUESTIONS),
      ) as { nextQuestions: Array<{ verificationPurpose: string }> };
      const firstPurpose = parsed.nextQuestions[0];
      if (firstPurpose) firstPurpose.verificationPurpose = FIRST_QUESTIONS[0]!;
      return reply(JSON.stringify(parsed));
    };
    const base = {
      store,
      userId: 'user-purpose',
      projectId: 'project-purpose',
      now: NOW,
      chat,
      evidence: 'injected_http' as const,
    };
    const first = await runFirstReview({ ...base, text: `${IDEA} 목적.`, origin: 'typed', fileName: null });
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
    expect(failed.called).toBe(true);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.sections).toBeNull();
    expect(failed.record.error).toContain('stage_questions_repeated');
    expect(failed.record.rawContent).toContain(FIRST_QUESTIONS[0]);
    expect(calls).toHaveLength(2);
    const again = await submitConsultingStage({
      ...base,
      reviewId: first.record.reviewId,
      answers: [
        { questionId: 'q1', comment: '직장인을 고객으로 본다' },
        { questionId: 'q2', comment: '가격은 정하지 않았다' },
        { questionId: 'q3', comment: '온라인 게시로 알린다' },
      ],
    });
    expect(again.ok && !again.called).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('rebuilds the stored round 3 request so delivered context selects the next question', () => {
    const evidence = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json', import.meta.url), 'utf8'),
    ) as {
      callCount: number;
      calls: Array<{ index: number; request: { messages: Array<{ role: string; content: string }> }; response: { content: string } }>;
    };
    expect(evidence.callCount).toBe(3);
    const call = evidence.calls.find((item) => item.index === 3);
    expect(call).toBeTruthy();
    if (!call) return;
    const before = JSON.parse(call.request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      originalInput: string;
      businessState: { areaStatus: Array<{ areaId: string; status: string }>; statedRecord: { answers: Array<{ statement: string }> } };
      currentAnswerStatements: Array<{ statement: string }>;
      closedQuestions: Array<{ questionId: string; text: string }>;
      stagePairs: StagePair[];
      priorStagePairs: StagePair[];
      answerLinks: Array<{ sourceReviewId: string; questionId: string; question: string; choiceId: string | null; choiceLabel: string | null; supplement: string; submittedAt: string | null; status: 'answered' | 'open' }>;
      unlinkedStatements: Array<{ feedbackId: string; questionId: string | null; choiceId: string | null; text: string; submittedAt: string; provenance: 'FOUNDER_INPUT' | 'SIMULATION' | 'EXTERNAL_EVIDENCE' | 'AI_INFERENCE'; epistemicStatus: 'VERIFIED_FACT' | 'FOUNDER_CLAIM' | 'ASSUMPTION' | 'UNKNOWN'; evidenceId: string | null }>;
      latestAnalysis: {
        customer: string;
        problem: string;
        market: string;
        revenueModel: string;
        execution: string;
        priorRisks: string[];
        uncertain: string[];
        hypotheses: string[];
        priorJudgmentText: string;
        priorQuestionText: string;
        priorReasonText: string;
        answerHint: string;
        claimConfirmation: null;
        analysis: { product: string; supply: { text: string }; marketing: { text: string }; operations: string; value: string };
      };
      doNotCopy: { priorJudgmentText: string; priorUnresolvedIssues: string[] };
      consultingPath: Array<{ answeredQuestion: string }>;
    };
    expect(before.businessState.areaStatus.every((item) => item.status === 'not_analyzed')).toBe(true);
    expect(before.currentAnswerStatements.map((item) => item.statement)).toEqual(['설문조사 실시', '설문조사 실시', '비용 분석', '비용 분석']);
    expect(before.closedQuestions.filter((item) => item.questionId === 'q1')).toHaveLength(2);
    const latest = before.latestAnalysis;
    const stored: ReviewSections = {
      customer: latest.customer,
      problem: latest.problem,
      market: latest.market,
      revenueModel: latest.revenueModel,
      execution: latest.execution,
      risks: latest.priorRisks,
      uncertain: latest.uncertain,
      hypotheses: latest.hypotheses,
      judgment: latest.priorJudgmentText,
      nextQuestion: latest.priorQuestionText,
      nextQuestionReason: latest.priorReasonText,
      answerHint: latest.answerHint,
      claimConfirmation: null,
      analysis: {
        summary: '요약',
        value: latest.analysis.value,
        operatingModel: latest.analysis.operations,
        payer: '미확인',
        competition: '미확인',
        operations: latest.analysis.operations,
        profitability: '미확인',
        strengths: [],
        assumptions: [],
        evidenceToChange: [],
        founderFacts: [],
        inferences: [],
        judgmentDetail: latest.priorJudgmentText,
        choices: [],
        product: latest.analysis.product,
        supply: latest.analysis.supply.text,
        marketing: latest.analysis.marketing.text,
      },
    };
    const request = buildProductReanalysisRequest({
      originalInput: before.originalInput,
      firstAnalysis: stored,
      priorTurns: [],
      latestAnalysis: stored,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: before.stagePairs,
      priorStagePairs: before.priorStagePairs,
      answerLinks: before.answerLinks,
      unlinkedStatements: before.unlinkedStatements,
      consultingPath: before.consultingPath as never,
    });
    const payload = userPayload(request);
    expect(payload.originalInput).toBe(before.originalInput);
    expect(JSON.stringify(payload.unlinkedStatements)).toContain('양조장 한 곳에 문의했지만');
    expect(JSON.stringify(payload.consultingPath)).toContain('양조장과의 협업을 위한 초기 미팅');
    const areaStatus = (payload.businessState as { areaStatus: Array<{ areaId: string; status: string; epistemicStatus: string; text: string | null }> }).areaStatus;
    expect(areaStatus.find((item) => item.areaId === 'customer')).toMatchObject({
      status: 'founder_claim',
      epistemicStatus: 'FOUNDER_CLAIM',
      provenance: 'FOUNDER_INPUT',
      informationPresent: true,
      verified: false,
      analysisComplete: false,
      text: '전통주를 좋아하는 내국인 및 외국인 관광객',
    });
    expect(areaStatus.find((item) => item.areaId === 'problem')).toMatchObject({
      status: 'founder_claim',
      provenance: 'FOUNDER_INPUT',
      verified: false,
      analysisComplete: false,
    });
    expect(areaStatus.find((item) => item.areaId === 'market')).toMatchObject({
      status: 'founder_claim',
      provenance: 'FOUNDER_INPUT',
      verified: false,
      analysisComplete: false,
    });
    expect(areaStatus.find((item) => item.areaId === 'revenue')).toMatchObject({
      status: 'assumption',
      epistemicStatus: 'ASSUMPTION',
      provenance: 'AI_INFERENCE',
      verified: false,
      analysisComplete: false,
    });
    expect(areaStatus.find((item) => item.areaId === 'operations')).toMatchObject({
      status: 'founder_claim',
      provenance: 'AI_INFERENCE',
      informationPresent: true,
      verified: false,
      analysisComplete: false,
    });
    expect(areaStatus.find((item) => item.areaId === 'product')?.status).toBe('not_analyzed');
    expect(areaStatus.some((item) => item.status !== 'not_analyzed')).toBe(true);
    const statements = payload.currentAnswerStatements as Array<{ questionKey: string; statement: string }>;
    expect(statements.map((item) => item.statement)).toEqual(['설문조사 실시', '비용 분석']);
    const closed = payload.closedQuestions as Array<{ questionId: string; sourceReviewId: string; questionKey: string; text: string }>;
    expect(new Set(closed.map((item) => item.questionKey)).size).toBe(closed.length);
    expect(closed.filter((item) => item.questionId === 'q1').map((item) => item.questionKey)).toEqual([
      '48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1',
      '5f6d705d-fe2a-468f-97be-da16482abd32:q1',
    ]);
    const priorKey = (payload.priorStagePairs as Array<{ questionKey: string }>)[0]?.questionKey;
    const currentKey = (payload.stagePairs as Array<{ questionKey: string }>)[0]?.questionKey;
    expect(priorKey).toBe('48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1');
    expect(currentKey).toBe('5f6d705d-fe2a-468f-97be-da16482abd32:q1');
    expect(priorKey).not.toBe(currentKey);
    const states = payload.answeredQuestionState as Array<{
      questionKey: string;
      answerLevel: string;
      resolution: string;
      verified: boolean;
      analysisComplete: boolean;
      answer: { epistemicStatus: string; provenance: string; supplement: string | null; choiceLabel: string | null };
      confirmedByAnswer: string;
      unconfirmedAfterAnswer: string;
    }>;
    expect(states.map((item) => item.questionKey)).toEqual([
      '48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1',
      '5f6d705d-fe2a-468f-97be-da16482abd32:q1',
      '5f6d705d-fe2a-468f-97be-da16482abd32:q2',
    ]);
    expect(states[0]).toMatchObject({
      answerLevel: 'unresolved_gap',
      resolution: 'still_open',
      verified: false,
      analysisComplete: false,
    });
    expect(states[1]).toMatchObject({
      answerLevel: 'menu_choice',
      resolution: 'method_selected',
      verified: false,
      analysisComplete: false,
      confirmedByAnswer: '방법으로 선택함: 설문조사 실시',
      unconfirmedAfterAnswer: '실행 대상, 실행 여부, 응답 결과는 이 답에 없다.',
      answer: { choiceLabel: '설문조사 실시', supplement: null, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' },
    });
    expect(states[2]).toMatchObject({
      answerLevel: 'menu_choice',
      resolution: 'method_selected',
      verified: false,
      analysisComplete: false,
      confirmedByAnswer: '방법으로 선택함: 비용 분석',
      answer: { choiceLabel: '비용 분석', supplement: null, epistemicStatus: 'FOUNDER_CLAIM' },
    });
    expect(payload.originalInput).toBe(before.originalInput);
    const system = call.request.messages.find((message) => message.role === 'system')?.content ?? '';
    const nextSystem = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).toContain('updatedJudgment가 priorJudgmentText와 같거나');
    expect(nextSystem).not.toContain('updatedJudgment가 priorJudgmentText와 같거나');
    expect(nextSystem).toContain('이전 사업성 판단을 초기화하지 말고');
    expect(nextSystem).toContain('현재 시점의 사업성을 다시 판단하라');
    expect(nextSystem).toContain('reaskReason');
    expect(nextSystem).toContain('questionKey');
    const task = payload.revisionTask as { updatedJudgment: string; nextQuestion: string };
    expect(task.updatedJudgment).not.toContain('재평가가 아니다');
    expect(task.updatedJudgment).toContain('문장이 같다는 이유만으로 실패가 아니다');
    expect(task.nextQuestion).toContain('not_analyzed');
    expect(task.nextQuestion).toContain('reaskReason');
    const contract = {
      askedQuestions: [...before.priorStagePairs, ...before.stagePairs].map((pair) => pair.question),
      pairs: before.stagePairs,
      closedSentences: [...before.priorStagePairs, ...before.stagePairs].flatMap((pair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
      priorJudgmentText: before.doNotCopy.priorJudgmentText,
      priorUnresolved: before.doNotCopy.priorUnresolvedIssues,
    };
    const repeated = judgeStageContract(call.response.content, contract);
    expect(repeated.issues).toContain('stage_questions_repeated');
    expect(repeated.issues).toContain('stage_objective_overlap');
    expect(repeated.issues).not.toContain('stage_judgment_copied');
    expect(repeated.sections).toBeNull();
    const parsed = JSON.parse(call.response.content) as { nextQuestions: Array<{ reaskReason?: string; text: string }>; updatedJudgment: string };
    parsed.nextQuestions[0]!.reaskReason = '기존 답변인 설문조사 실시로는 고객이 누구인지 확인되지 않았다';
    parsed.nextQuestions[1]!.reaskReason = '기존 답변인 비용 분석으로는 가격이 확인되지 않았다';
    const reasoned = judgeStageContract(JSON.stringify(parsed), contract);
    expect(reasoned.issues).toContain('stage_questions_repeated');
    expect(reasoned.issues).toContain('stage_objective_overlap');
    expect(reasoned.sections).toBeNull();
    const fresh = JSON.parse(call.response.content) as {
      nextQuestions: Array<{ text: string }>;
      updatedJudgment: string;
      objectiveCandidates: Array<{ candidateId: string; objective: string; overlapsReviewedObjective: boolean }>;
      selectedCandidateId: string;
    };
    fresh.nextQuestions[0]!.text = '체험 운영 인력은 누가 맡는가?';
    fresh.nextQuestions[1]!.text = '예약 취소 때의 책임은 어디에 있는가?';
    const overlapLeft = judgeStageContract(JSON.stringify(fresh), contract);
    expect(overlapLeft.issues).toContain('stage_objective_overlap');
    expect(overlapLeft.issues).not.toContain('stage_questions_repeated');
    expect(overlapLeft.sections).toBeNull();
    const selected = fresh.objectiveCandidates.find((item) => item.candidateId === fresh.selectedCandidateId);
    if (selected) {
      selected.objective = '운영 인력과 예약 책임의 빈칸을 확인한다';
      selected.overlapsReviewedObjective = false;
    }
    const kept = judgeStageContract(JSON.stringify(fresh), contract);
    expect(kept.issues).not.toContain('stage_judgment_copied');
    expect(kept.issues).not.toContain('stage_questions_repeated');
    expect(kept.issues).not.toContain('stage_objective_overlap');
    expect(kept.sections?.judgment).toBe(before.doNotCopy.priorJudgmentText);
  });

  it('keeps the failed round 3 row and stores a separate reprocess that cannot parent round 4', async () => {
    const evidencePath = new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json', import.meta.url);
    const originalFile = readFileSync(evidencePath, 'utf8');
    const evidence = JSON.parse(originalFile) as {
      userId: string;
      projectId: string;
      rounds: Array<{ round: number; reviewId: string | null; parentReviewId: string | null; status: string; error: string | null }>;
      calls: Array<{ index: number; response: { id: string; content: string }; request: { messages: Array<{ role: string; content: string }> } }>;
    };
    const call = evidence.calls.find((item) => item.index === 3);
    const round = evidence.rounds.find((item) => item.round === 3);
    expect(call?.response.id).toBe('chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74');
    expect(round?.reviewId).toBe('0e75ff46-88fd-4ce2-b567-bdc3f3048531');
    expect(round?.error).toBe('stage_judgment_copied,stage_questions_repeated');
    if (!call || !round?.reviewId) return;
    const user = JSON.parse(call.request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      stagePairs: StagePair[];
      priorStagePairs: StagePair[];
      doNotCopy: { priorJudgmentText: string; priorUnresolvedIssues: string[] };
      unlinkedStatements: unknown[];
    };
    const judged = judgeStageContract(call.response.content, {
      askedQuestions: [...user.priorStagePairs, ...user.stagePairs].map((pair) => pair.question),
      pairs: user.stagePairs,
      closedSentences: [...user.priorStagePairs, ...user.stagePairs].flatMap((pair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
      priorJudgmentText: user.doNotCopy.priorJudgmentText,
      priorUnresolved: user.doNotCopy.priorUnresolvedIssues,
    });
    expect(judged.issues).toEqual(['stage_questions_repeated', 'stage_objective_overlap']);
    expect(judged.sections).toBeNull();
    const store = openAiPmReviewStore(storePath());
    expect(store.productionDatabase).toBe(false);
    expect(store.durable).toBe(false);
    const base = (reviewId: string, status: StoredReview['status'], error: string | null, sections: StoredReview['sections']): StoredReview => ({
      reviewId,
      userId: evidence.userId,
      version: 3,
      parentReviewId: round.parentReviewId,
      sourceFeedbackId: null,
      supplementSha: 'round3-original',
      projectId: evidence.projectId,
      inputSha: 'round3-reprocess',
      inputText: 'preserved-round3',
      inputOrigin: 'typed',
      fileName: null,
      status,
      evidence: 'injected_http',
      provider: 'openai',
      model: 'gpt-4o-mini-2024-07-18',
      sections,
      rawContent: call.response.content,
      stageAnswers: user.stagePairs,
      stageReading: judged.reading,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      usageKnown: false,
      callCount: 0,
      latencyMs: null,
      error,
      requestedAt: NOW,
      finishedAt: NOW,
    });
    expect((await store.insertReview(base(round.reviewId, 'failed', round.error, null))).wrote).toBe(true);
    expect((await store.insertReview(base(round.reviewId, 'succeeded', null, judged.sections))).wrote).toBe(false);
    const preserved = await store.readReview(evidence.userId, round.reviewId);
    expect(preserved?.status).toBe('failed');
    expect(preserved?.error).toBe('stage_judgment_copied,stage_questions_repeated');
    expect(preserved?.sections).toBeNull();
    expect(preserved?.rawContent).toBe(call.response.content);
    expect(preserved?.parentReviewId).toBe('5f6d705d-fe2a-468f-97be-da16482abd32');
    expect(preserved?.stageAnswers?.map((pair) => pair.questionId)).toEqual(['q1', 'q2']);
    const reprocessId = 'reprocess-round3-local';
    expect((await store.insertReview(base(reprocessId, 'failed', judged.issues.join(','), judged.sections))).wrote).toBe(true);
    const loaded = await store.readReview(evidence.userId, reprocessId);
    expect(loaded?.reviewId).not.toBe(round.reviewId);
    expect(loaded?.status).toBe('failed');
    expect(loaded?.error).toBe('stage_questions_repeated,stage_objective_overlap');
    expect(loaded?.sections).toBeNull();
    expect(loaded?.rawContent).toBe(call.response.content);
    expect(loaded?.parentReviewId).toBe(preserved?.parentReviewId);
    expect(JSON.stringify(loaded?.stageAnswers)).toContain('설문조사 실시');
    let called = false;
    const follow = await runStageReanalysis({
      store,
      userId: evidence.userId,
      projectId: evidence.projectId,
      reviewId: reprocessId,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => {
        called = true;
        throw new Error('gpt');
      },
    });
    expect(called).toBe(false);
    expect(follow).toEqual({ ok: false, error: 'review_missing' });
    const stillThere = await store.readReview(evidence.userId, round.reviewId);
    expect(stillThere?.error).toBe(round.error);
    expect(readFileSync(evidencePath, 'utf8')).toBe(originalFile);
    expect(originalFile).toContain(call.response.id);
    expect((await store.listReviews(evidence.userId, evidence.projectId)).map((item) => item.reviewId).sort()).toEqual([reprocessId, round.reviewId].sort());
    store.close();
  });

  function levelPair(questionId: string, question: string, choiceLabel: string | null, supplement: string): StagePair {
    return {
      questionId,
      question,
      offeredChoices: choiceLabel ? [{ choiceId: 'c1', label: choiceLabel }] : [],
      choiceId: choiceLabel ? 'c1' : null,
      choiceLabel,
      supplement,
      status: 'answered',
    };
  }

  it('reads a method-only answer as menu_choice and leaves the result open', () => {
    const [state] = buildAnsweredQuestionState([levelPair('q1', '어떤 조사를 할 것인가?', '설문조사 실시', '설문조사 실시')]);
    expect(state).toMatchObject({
      questionKey: 'q1',
      answerLevel: 'menu_choice',
      resolution: 'method_selected',
      verified: false,
      analysisComplete: false,
      confirmedByAnswer: '방법으로 선택함: 설문조사 실시',
      unconfirmedAfterAnswer: '실행 대상, 실행 여부, 응답 결과는 이 답에 없다.',
      answer: { choiceLabel: '설문조사 실시', supplement: null, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' },
    });
    expect(state?.confirmedByAnswer).not.toContain('?');
  });

  it('reads a reported execution as a founder claim and keeps it unverified', () => {
    const report = '관광객 30명을 대상으로 설문을 실시하고 22명이 긍정적으로 응답함.';
    const [state] = buildAnsweredQuestionState([levelPair('q1', '조사를 했는가?', '설문조사 실시', report)]);
    expect(state).toMatchObject({
      answerLevel: 'reported_result',
      resolution: 'result_reported',
      verified: false,
      analysisComplete: false,
      answer: { provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM', supplement: report },
    });
    expect(state?.confirmedByAnswer).toContain(report);
    expect(state?.unconfirmedAfterAnswer).toContain('외부 검증 기록은 없다');
  });

  it('reads a numbered plan as a plan and not as an execution result', () => {
    const plan = '설문조사를 100명 대상으로 할 예정이다';
    const [state] = buildAnsweredQuestionState([levelPair('q1', '조사를 할 것인가?', '설문조사 실시', plan)]);
    expect(state).toMatchObject({
      answerLevel: 'planned_action',
      resolution: 'plan_stated',
      verified: false,
      analysisComplete: false,
      answer: { epistemicStatus: 'FOUNDER_CLAIM', supplement: plan },
    });
    expect(state?.confirmedByAnswer).toContain('계획으로 적음');
    expect(state?.confirmedByAnswer).toContain('100');
    expect(state?.unconfirmedAfterAnswer).toContain('실행 결과가 아니다');
    const [figure] = buildAnsweredQuestionState([levelPair('q2', '예산은?', null, '예산 메모는 100이다')]);
    expect(figure?.answerLevel).not.toBe('reported_result');
    expect(figure?.answerLevel).toBe('stated_without_result');
    expect(figure?.verified).toBe(false);
  });

  it('reads an explanation without a result as still missing the execution', () => {
    const explanation = '고객은 현장 반응을 보고 가격을 조정할 수 있다고 본다';
    const [state] = buildAnsweredQuestionState([levelPair('q1', '가격은 어떻게 정했는가?', null, explanation)]);
    expect(state).toMatchObject({
      answerLevel: 'stated_without_result',
      resolution: 'gap_named',
      verified: false,
      analysisComplete: false,
      confirmedByAnswer: `추가 설명: ${explanation}`,
      unconfirmedAfterAnswer: '실행 결과와 수치는 이 답에 없다.',
      answer: { choiceLabel: null, supplement: explanation, epistemicStatus: 'FOUNDER_CLAIM' },
    });
  });

  it('reads an unresolved answer as still open and does not invent a result', () => {
    const [state] = buildAnsweredQuestionState([levelPair('q1', '핵심을 정했는가?', null, '아직 핵심을 정하지 못했다')]);
    expect(state).toMatchObject({
      answerLevel: 'unresolved_gap',
      resolution: 'still_open',
      verified: false,
      analysisComplete: false,
      confirmedByAnswer: '확인된 결과 없음',
      answer: { provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM', supplement: '아직 핵심을 정하지 못했다' },
    });
    const [practice] = buildAnsweredQuestionState([
      levelPair('q2', '대상이 있는가?', null, 'SIMULATION. 대상은 아직 없다'),
    ]);
    expect(practice).toMatchObject({
      answerLevel: 'unresolved_gap',
      verified: false,
      answer: { provenance: 'SIMULATION', epistemicStatus: 'FOUNDER_CLAIM', supplement: 'SIMULATION. 대상은 아직 없다' },
    });
  });

  it('sends one copy of an answer that repeats its menu label', () => {
    const pairs = [
      levelPair('q1', '어떤 조사를 할 것인가?', '설문조사 실시', '설문조사 실시'),
      levelPair('q2', '무엇을 볼 것인가?', '비용 분석', '비용 분석'),
    ];
    const request = buildProductReanalysisRequest({
      originalInput: '체험',
      firstAnalysis: {
        customer: '방문객',
        problem: '자리가 없다',
        market: '수요는 입력에 없다',
        revenueModel: '가격은 가설이다',
        execution: '',
        risks: [],
        uncertain: [],
        hypotheses: [],
        judgment: '판단',
        nextQuestion: '어떤 조사를 할 것인가?',
        nextQuestionReason: '이유',
        answerHint: '적습니다',
        claimConfirmation: null,
      },
      priorTurns: [],
      latestAnalysis: {
        customer: '방문객',
        problem: '자리가 없다',
        market: '수요는 입력에 없다',
        revenueModel: '가격은 가설이다',
        execution: '',
        risks: [],
        uncertain: [],
        hypotheses: [],
        judgment: '판단',
        nextQuestion: '어떤 조사를 할 것인가?',
        nextQuestionReason: '이유',
        answerHint: '적습니다',
        claimConfirmation: null,
      },
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: pairs,
    });
    const payload = userPayload(request);
    expect((payload.currentAnswerStatements as Array<{ statement: string }>).map((item) => item.statement)).toEqual(['설문조사 실시', '비용 분석']);
    const states = payload.answeredQuestionState as Array<{ answer: { supplement: string | null } }>;
    expect(states.every((item) => item.answer.supplement === null)).toBe(true);
  });

  it('keeps two q1 questions apart with questionKey', () => {
    const prior = levelPair('q1', '어디서 만날 것인가?', '아직 핵심을 정하지 못했다', '아직 핵심을 정하지 못했다');
    const current = levelPair('q1', '어떤 조사를 할 것인가?', '설문조사 실시', '설문조사 실시');
    const links = [
      {
        sourceReviewId: 'round-1',
        questionId: 'q1',
        question: prior.question,
        choiceId: prior.choiceId,
        choiceLabel: prior.choiceLabel,
        supplement: prior.supplement,
        submittedAt: NOW,
        status: 'answered' as const,
      },
      {
        sourceReviewId: 'round-2',
        questionId: 'q1',
        question: current.question,
        choiceId: current.choiceId,
        choiceLabel: current.choiceLabel,
        supplement: current.supplement,
        submittedAt: NOW,
        status: 'answered' as const,
      },
    ];
    const states = buildAnsweredQuestionState([prior, current], links);
    expect(states.map((item) => item.questionKey)).toEqual(['round-1:q1', 'round-2:q1']);
    expect(states[0]?.answerLevel).toBe('unresolved_gap');
    expect(states[1]?.answerLevel).toBe('menu_choice');
    expect(states[0]?.question).not.toBe(states[1]?.question);
  });
});
