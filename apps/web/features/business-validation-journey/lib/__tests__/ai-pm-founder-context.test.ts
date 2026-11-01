import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import {
  buildProductReanalysisRequest,
  runFirstReview,
  runStageReanalysis,
  saveReviewFeedback,
  submitConsultingStage,
  type StagePriorReading,
} from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections, type StagePair } from '../ai-pm-review-store';

const IDEA = COMPARE_BUSINESS_BODY;
const OTHER = '도시 농장 키트 사업. 양조장 체험과 무관하다.';
const QUESTIONS = [
  '양조장 협력에 대해 지금 무엇을 가정하나요?',
  '체험 후보를 고를 때 아직 비어 있는 사실은 무엇인가요?',
  '다음에 직접 확인할 행동은 무엇인가요?',
  '협력 조건 중 아직 확인하지 않은 항목은 무엇인가요?',
];
const JUDGMENTS = [
  '최초 판단: 체험 상품과 공급 양조장이 아직 연결되지 않았다',
  '1차 갱신: 협력 가능성은 주장이며 확인된 협력이 아니다',
  '2차 갱신: 후보 미선정이 미해결로 남았다',
  '3차 갱신: 조사 계획은 협의 사실이 아니다',
];
const RESOLVED = [
  ['체험 선호는 계획으로 접수했다'],
  ['후보가 없다는 현재 상태를 확인했다'],
  ['조사 계획을 다음 행동으로 접수했다'],
];
const UNRESOLVED = [
  ['공급 계약은 확인되지 않았다'],
  ['실제 협의는 아직 없다'],
  ['지역 조사는 아직 실행되지 않았다'],
];
const ANSWERS = [
  {
    now: '2026-11-01T01:00:00.000Z',
    choiceId: 'c1',
    choiceLabel: '협력 가능성 주장',
    comment: '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.',
  },
  {
    now: '2026-11-01T01:10:00.000Z',
    comment: '구체적인 양조장 후보는 아직 선정하지 않았다. 실제 협의도 아직 진행하지 않았다.',
  },
  {
    now: '2026-11-01T01:20:00.000Z',
    comment: '특정 지역에서 체험형 양조장 후보를 조사하겠다. 후보를 선정한 후 실제 협의 여부를 확인하겠다.',
  },
];

function storePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'ai-pm-context-')), 'reviews.sqlite');
}

function userPayload(request: ChatRequest): Record<string, unknown> {
  return JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<string, unknown>;
}

function firstRaw(judgment: string, question: string): string {
  return JSON.stringify({
    summary: judgment,
    customer: '전통주를 좋아하는 내국인과 외국인 관광객',
    problem: '개인별 체험을 안내할 양조장 연결이 확인되지 않았다',
    value: '양조장 체험과 주변 경험을 안내한다',
    operatingModel: '양조장 마케팅 지원을 구상 중이다',
    alternatives: '입력에 없다',
    differentiation: '입력에 없다',
    payer: '지불자는 확인되지 않았다',
    revenueModel: '수익 구조는 가설이며 원문에 없다',
    market: '관광 수요의 크기는 입력에 없다',
    competition: '경쟁은 확인되지 않았다',
    operations: '운영은 아직 구상이다',
    profitability: '수익성은 확인되지 않았다',
    judgment,
    nextVerification: '공급 양조장과 체험 상품의 연결을 확인한다',
    nextQuestion: question,
    nextQuestionReason: '연결이 없으면 체험 상품을 실행할 수 없다',
    strengths: ['체험과 마케팅 지원을 함께 구상한다'],
    risks: ['공급 양조장이 없다'],
    assumptions: ['공급 양조장과 체험 상품의 연결은 확인되지 않았다'],
    evidenceToChange: ['양조장 접촉'],
    founderFacts: [],
    inferences: ['체험 수요는 아직 가설이다'],
    choices: ['협력을 가정으로 남긴다', '아직 가정하지 않는다'],
    questions: [question],
  });
}

function stageRaw(input: {
  request: ChatRequest;
  judgment: string;
  question: string;
  resolved: string[];
  unresolved: string[];
}): string {
  const payload = userPayload(input.request);
  const pairs = (Array.isArray(payload.stagePairs) ? payload.stagePairs : []) as Array<{ questionId: string; choiceId: string | null; status: string }>;
  const answered = pairs.filter((pair) => pair.status === 'answered');
  const nextQuestions = [
    {
      text: input.question,
      choices: ['그 확인을 다음 행동으로 둔다', '아직 그 확인을 시작하지 않는다'],
      verificationPurpose: `${input.question}와 다른 불확실성. 아직 실행으로 확인하지 않은 항목이다`,
    },
  ];
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 계획이나 주장이고 확인된 협력은 늘리지 않는다`,
      founderBasis: `${pair.questionId}에서 이렇게 말한 이유는 입력에 적힌 기대다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의는 없다`,
      judgmentEffect: `${pair.questionId} 답으로 이전 판단의 미확인 상태는 유지된다`,
      openRisk: `${pair.questionId}의 공급 계약은 아직 없다`,
    })),
    impactOnPreviousJudgment: `${input.judgment}에 이르는 변화다`,
    updatedJudgment: input.judgment,
    judgmentReason: `${input.judgment}의 이유다. 확인된 협력은 없다`,
    verifiedFacts: [],
    unverifiedClaims: ['협력 가능성은 주장이다'],
    assumptions: ['공급 계약은 아직 없다'],
    resolvedIssues: input.resolved,
    unresolvedIssues: input.unresolved,
    nextVerification: input.unresolved[0] ?? '다음 확인',
    customer: '전통주를 좋아하는 관광객',
    problem: '체험을 제공할 양조장 연결이 확인되지 않았다',
    value: '만들고 마시는 체험을 안내한다',
    product: '양조장 체험 안내',
    market: '시장 크기는 입력에 없다',
    revenueModel: '수익 구조는 아직 가설이다',
    operations: '운영 절차는 아직 없다',
    supply: '공급 양조장은 아직 없다',
    supplyState: 'confirmed',
    marketing: '양조장 온라인 마케팅 지원은 구상이다',
    marketingState: 'confirmed',
    competition: '경쟁은 확인되지 않았다',
    executionNote: '실행은 아직 확인되지 않았다',
    risks: ['공급 계약이 없다'],
    nextQuestions,
    nextQuestionChoices: nextQuestions.map((item) => item.choices),
  });
}

function sections(judgment: string): ReviewSections {
  return {
    customer: '전통주를 좋아하는 관광객',
    problem: '체험을 제공할 양조장 연결이 확인되지 않았다',
    market: '시장 크기는 입력에 없다',
    revenueModel: '수익 구조는 가설이며 원문에 없다',
    execution: '운영은 아직 구상이다',
    risks: ['공급 계약이 없다'],
    uncertain: ['공급 양조장과 체험 상품의 연결은 확인되지 않았다'],
    hypotheses: ['공급 양조장과 체험 상품의 연결은 확인되지 않았다'],
    judgment,
    nextQuestion: '양조장 협력에 대해 지금 무엇을 가정하나요?',
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
      choices: [
        { id: 'c1', label: '협력을 가정으로 남긴다' },
        { id: 'c2', label: '아직 가정하지 않는다' },
      ],
      product: '양조장 체험 안내',
      supply: '공급 양조장은 아직 없다',
      marketing: '온라인 마케팅 지원은 구상이다',
    },
  };
}

it('keeps the business core when older analysis briefs exceed the token budget', () => {
  const keptJudgment = '확정 판단: 협력 가능성은 주장이고 공급 계약은 없다';
  const keptResolved = '해결 근거: 체험 선호는 계획으로 접수했다';
  const keptUnresolved = '미해결 위험: 실제 협의와 공급 계약은 아직 없다';
  const keptAnswer = '구체적인 양조장 후보는 아직 선정하지 않았다';
  const pair: StagePair = {
    questionId: 'q1',
    question: '체험 후보를 고를 때 아직 비어 있는 사실은 무엇인가요?',
    offeredChoices: [],
    choiceId: null,
    choiceLabel: null,
    supplement: keptAnswer,
    status: 'answered',
  };
  const reading: StagePriorReading = {
    reviewId: 'core-review',
    judgment: keptJudgment,
    judgmentReason: '확인된 협력이 없어 그 판단을 유지한다',
    impactOnPreviousJudgment: '최초 방향은 유지되고 공급은 아직 비어 있다',
    resolvedIssues: [keptResolved],
    unresolvedIssues: [keptUnresolved],
    customer: '전통주를 좋아하는 관광객',
    problem: '양조장 연결이 확인되지 않았다',
    revenueModel: '수익 구조는 가설이며 원문에 없다',
    product: '양조장 체험 안내',
    supply: '공급 양조장은 아직 없다',
    marketing: '온라인 마케팅 지원은 구상이다',
    nextQuestion: '다음에 직접 확인할 행동은 무엇인가요?',
  };
  const filler = Array.from({ length: 8 }, (_, index) => ({
    reviewId: `drop-${index}`,
    judgment: `DROP_OLD_${index} ${'과거 세부 문장 '.repeat(4000)}`,
    nextQuestion: `DROP_OLD_Q_${index}`,
    assumptions: [`DROP_OLD_ASSUMPTION_${index}`],
    risks: [`DROP_OLD_RISK_${index}`],
  }));
  const request = buildProductReanalysisRequest({
    originalInput: IDEA,
    firstAnalysis: sections(keptJudgment),
    priorTurns: [],
    priorAnalyses: filler,
    previousQuestions: [pair.question],
    latestAnalysis: sections(keptJudgment),
    founderChoice: null,
    founderSupplement: '',
    founderFeedback: null,
    stagePairs: [pair],
    priorStagePairs: [pair],
    answerLinks: [
      {
        sourceReviewId: 'core-review',
        questionId: 'q1',
        question: pair.question,
        choiceId: null,
        choiceLabel: null,
        supplement: keptAnswer,
        submittedAt: '2026-11-01T01:10:00.000Z',
        status: 'answered',
      },
    ],
    priorReadings: [reading],
  });
  const payload = userPayload(request);
  const serialized = JSON.stringify(payload);
  expect(payload.originalInput).toBe(IDEA);
  expect(serialized).toContain(keptJudgment);
  expect(serialized).toContain(keptResolved);
  expect(serialized).toContain(keptUnresolved);
  expect(serialized).toContain(keptAnswer);
  expect(serialized).toContain('수익 구조는 가설이며 원문에 없다');
  expect(serialized).not.toContain('DROP_OLD_0');
  expect(serialized).not.toContain('DROP_OLD_RISK_7');
  expect(payload.priorAnalyses).toEqual([]);
  expect(payload.priorReadings).toHaveLength(1);
  expect(payload.answerLinks).toHaveLength(1);
  expect(payload.priorStagePairs).toHaveLength(1);
});

it('keeps one brewery business in every follow-up payload', async () => {
  const store = openAiPmReviewStore(storePath());
  const calls: ChatRequest[] = [];
  const executionIds: string[] = [];
  const chat = async (request: ChatRequest): Promise<ChatResponse> => {
    calls.push(request);
    const executionId = `sim-context-${calls.length}`;
    executionIds.push(executionId);
    const stageIndex = calls.length - 2;
    const content =
      calls.length === 1
        ? firstRaw(JUDGMENTS[0]!, QUESTIONS[0]!)
        : stageRaw({
            request,
            judgment: JUDGMENTS[stageIndex + 1]!,
            question: QUESTIONS[stageIndex + 1]!,
            resolved: RESOLVED[stageIndex]!,
            unresolved: UNRESOLVED[stageIndex]!,
          });
    return {
      id: executionId,
      model: 'SIMULATION',
      provider: 'openai',
      content,
      finishReason: 'stop',
      usage: { inputTokens: 120, outputTokens: 90, totalTokens: 210 },
      usageKnown: true,
      latencyMs: 5,
    };
  };

  const other = await runFirstReview({
    store,
    userId: 'context-sim-user',
    projectId: 'other-project',
    text: OTHER,
    origin: 'typed',
    fileName: null,
    now: '2026-11-01T00:50:00.000Z',
    chat: async (request) => {
      calls.push(request);
      return {
        id: 'sim-other',
        model: 'SIMULATION',
        provider: 'openai',
        content: firstRaw('다른 사업 판단', '키트 구매자는 누구인가?'),
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        usageKnown: true,
        latencyMs: 1,
      };
    },
    evidence: 'injected_http',
  });
  expect(other.record.inputText).toBe(OTHER);
  calls.length = 0;

  const first = await runFirstReview({
    store,
    userId: 'context-sim-user',
    projectId: 'brewery-sim-project',
    text: IDEA,
    origin: 'typed',
    fileName: null,
    now: '2026-11-01T00:55:00.000Z',
    chat,
    evidence: 'injected_http',
  });
  expect(first.called).toBe(true);
  expect(first.record.callCount).toBe(1);
  expect(first.record.inputText).toBe(IDEA);
  expect(first.record.parentReviewId).toBeNull();
  expect(calls[0]?.messages.find((message) => message.role === 'user')?.content).toContain('전통주(양조장)');
  expect(calls[0]?.messages.find((message) => message.role === 'user')?.content).not.toContain(ANSWERS[0]!.comment);

  const parents = [first.record.reviewId];
  for (const [index, answer] of ANSWERS.entries()) {
    const before = calls.length;
    const saved = await saveReviewFeedback({
      store,
      userId: 'context-sim-user',
      projectId: 'brewery-sim-project',
      now: answer.now,
      body: {
        reviewId: parents[index]!,
        questionId: 'q1',
        comment: answer.comment,
        ...(answer.choiceId ? { choiceId: answer.choiceId, choiceLabel: answer.choiceLabel, otherText: answer.comment } : {}),
      },
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.feedback.modelCalls).toBe(0);
    expect(calls.length).toBe(before);
    const analyzed = await submitConsultingStage({
      store,
      userId: 'context-sim-user',
      projectId: 'brewery-sim-project',
      reviewId: parents[index]!,
      now: answer.now,
      chat,
      evidence: 'injected_http',
    });
    expect(analyzed.ok && analyzed.called && analyzed.record.callCount === 1).toBe(true);
    if (!analyzed.ok) return;
    expect(analyzed.record.inputText).toBe(IDEA);
    expect(analyzed.record.model).toBe('SIMULATION');
    expect(analyzed.record.parentReviewId).toBe(parents[index]);
    const repeated = await submitConsultingStage({
      store,
      userId: 'context-sim-user',
      projectId: 'brewery-sim-project',
      reviewId: parents[index]!,
      now: answer.now,
      chat,
      evidence: 'injected_http',
    });
    expect(repeated.ok && repeated.called).toBe(false);
    expect(calls.length).toBe(before + 1);
    parents.push(analyzed.record.reviewId);
  }

  expect(calls).toHaveLength(4);
  const third = userPayload(calls[3]!);
  const serialized = JSON.stringify(third);
  expect(third.originalInput).toBe(IDEA);
  expect(serialized).toContain(ANSWERS[0]!.comment);
  expect(serialized).toContain(ANSWERS[1]!.comment);
  expect(serialized).toContain(ANSWERS[2]!.comment);
  expect(serialized).toContain(JUDGMENTS[0]);
  expect(serialized).toContain(JUDGMENTS[1]);
  expect(serialized).toContain(JUDGMENTS[2]);
  expect(serialized).toContain(RESOLVED[0]![0]);
  expect(serialized).toContain(RESOLVED[1]![0]);
  expect(serialized).toContain(UNRESOLVED[0]![0]);
  expect(serialized).toContain(UNRESOLVED[1]![0]);
  expect(serialized).toContain('수익 구조는 가설이며 원문에 없다');
  expect(serialized).not.toContain(OTHER);
  const links = third.answerLinks as Array<{ sourceReviewId: string; questionId: string; supplement: string; submittedAt: string; status: string; choiceId: string | null }>;
  expect(links.map((link) => link.supplement)).toEqual([ANSWERS[0]!.comment, ANSWERS[1]!.comment, ANSWERS[2]!.comment]);
  expect(links.map((link) => link.sourceReviewId)).toEqual(parents.slice(0, 3));
  expect(links.every((link) => link.questionId === 'q1' && link.status === 'answered')).toBe(true);
  expect(links.map((link) => link.submittedAt)).toEqual(ANSWERS.map((answer) => answer.now));
  expect(links[0]?.choiceId).toBe('c1');
  const readings = third.priorReadings as Array<{ reviewId: string; resolvedIssues: string[]; unresolvedIssues: string[] }>;
  expect(readings.map((item) => item.reviewId)).toEqual(parents.slice(0, 3));
  expect(readings[1]?.resolvedIssues).toEqual(RESOLVED[0]);
  expect(readings[2]?.unresolvedIssues).toEqual(UNRESOLVED[1]);
  const kinds = third.answerReading as Array<{ questionId: string; kinds: string[] }>;
  expect(kinds.some((item) => item.kinds.includes('claim'))).toBe(true);
  expect(JSON.stringify((third.evidenceLedger as { verifiedFacts: string[] }).verifiedFacts)).toBe('[]');
  const priorPairs = third.priorStagePairs as Array<{ supplement: string }>;
  const currentPairs = third.stagePairs as Array<{ supplement: string }>;
  expect(priorPairs.map((pair) => pair.supplement)).toEqual([ANSWERS[0]!.comment, ANSWERS[1]!.comment]);
  expect(currentPairs.map((pair) => pair.supplement)).toEqual([ANSWERS[2]!.comment]);

  const blocked = await runStageReanalysis({
    store,
    userId: 'context-sim-user',
    projectId: 'brewery-sim-project',
    reviewId: parents[3]!,
    now: '2026-11-01T01:30:00.000Z',
    chat,
    evidence: 'injected_http',
  });
  expect(blocked).toEqual({ ok: false, error: 'feedback_required' });
  expect(calls).toHaveLength(4);

  if (process.env.WRITE_CONTEXT_CONTINUITY === '1') {
    const rounds = calls.map((request, index) => ({
      executionId: executionIds[index],
      reviewId: parents[index] ?? null,
      provenance: 'SIMULATION',
      requestedModel: request.model,
      responseModel: 'SIMULATION',
      callCount: 1,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      request: {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        responseFormat: request.responseFormat,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
      },
    }));
    const record = {
      kind: 'simulation_context_continuity',
      provenance: 'SIMULATION',
      liveCall: { status: 'NOT RUN', reason: 'GPT_API_KEY missing' },
      note: '주입 응답이다. 실제 GPT 응답이 아니다. 토큰은 측정값이 아니므로 null이다.',
      businessInput: IDEA,
      rounds,
    };
    writeFileSync(
      new URL('../../../../../../docs/evidence/ALABOM/AI-PM/founder-context-continuity-payloads.json', import.meta.url),
      `${JSON.stringify(record, null, 2)}\n`,
    );
  }
});
