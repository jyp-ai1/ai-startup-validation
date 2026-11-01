import { createHash, randomUUID } from 'node:crypto';

import type { ChatRequest, ChatResponse } from '@repo/ai';

import type { ReviewChat } from './ai-pm-review';
import { AI_PM_REVIEW_MODEL } from './ai-pm-review';
import type { ReviewSections, StoredReview } from './ai-pm-review-store';

/**
 * Experiment B only. The product follow-up stays one call.
 * This module is not used by the product follow-up.
 */
export const EXPERIMENT_B_MODEL = 'gpt-4o';
export const EXPERIMENT_B_PRODUCT_MODEL = AI_PM_REVIEW_MODEL;

const ANSWER_TOKENS = ['예약', '지불', '비용', '공급 계약', '가격', '구상', '채널', '운영 책임', '체험'] as const;
const PRIOR_RISK_TOKENS = ['공급', '협력', '관광', '마케팅', '가격', '고객', '상품', '계약', '유치'] as const;
const AREA_IDS = ['customer', 'problem', 'product', 'supply', 'price', 'revenue', 'market', 'marketing', 'operations', 'risk'];

const STATE_SYSTEM = [
  '당신은 이번 답으로 사업 상태가 어떻게 달라졌는지만 적는다.',
  '후보와 질문은 만들지 않는다.',
  'answerDelta와 claims에는 이번 답에 있는 단어를 빠뜨리지 않고 적는다.',
  'SIMULATION과 연습 입력은 주장이다. confirmedFacts는 파운더가 사실로 준 기록만 담는다. 확인된 기록이 없으면 빈 배열이다.',
  '최초 아이디어와 답에 없는 점포나 접촉을 변화, 주장, 새 불확실성으로 만들지 않는다.',
  'priorRisksRemaining은 아직 유효한 이전 위험이다. newUncertainties는 이번 답이 새로 연 것이다. 두 목록을 한 문장으로 합치지 않는다.',
  'judgmentText는 이전 결론을 유지할 수 있다. 유지하면 judgmentKept는 true다.',
  'answerImpact는 이번 답이 그 결론에 미친 영향이다. 이번 답의 단어를 포함한다. 이전 판단 문장만 다시 적는 것은 영향이 아니다.',
  'unanalyzedAreaIds의 순서는 우선순위가 아니다.',
].join('\n');

const SELECTION_SYSTEM = [
  '당신은 지금 가장 중요한 사업 판단을 하나 고른다.',
  '코드는 후보를 고르지 않는다.',
  'newUncertainties와 priorRisksRemaining을 비교한다.',
  '후보를 2개 이상 만든다. 하나 이상은 fromNewAnswer가 true이고 whyNow에 이번 답의 단어가 있다.',
  'selectedCandidateId는 그 후보 중 당신이 고른 값이다.',
  'selectionReason에는 이번 답의 단어와 비교한 이전 위험의 단어를 함께 적는다.',
  '이전 위험을 다시 골라도 된다. 그 경우 이번 답 때문에 왜 아직 앞서는지를 적는다. 이전 순위 문장만 반복하는 것은 비교가 아니다.',
  '질문은 고른 판단의 갈림길을 검증한다. 질문 수와 문장은 당신이 정한다.',
  '닫힌 질문의 표현만 바꾸어 다시 묻지 않는다. 이전 선택지를 그대로 두지 않는다.',
  '1회차 장부를 선택 이유 없이 다시 적는 것은 선택이 아니다.',
].join('\n');

export type Call1Fields = {
  answerDelta: string;
  confirmedFacts: string[];
  claims: string[];
  priorRisksRemaining: string[];
  newUncertainties: string[];
  unanalyzedAreaIds: string[];
  judgmentKept: boolean;
  judgmentText: string;
  answerImpact: string;
};

export type Call2Candidate = {
  candidateId: string;
  areaId: string;
  judgmentTarget: string;
  fromNewAnswer: boolean;
  priorRiskItChallenges: string;
  whyNow: string;
  overlapsReviewedObjective: boolean;
};

export type Call2Question = {
  text: string;
  choices: string[];
  verificationPurpose: string;
};

export type Call2Fields = {
  candidates: Call2Candidate[];
  selectedCandidateId: string;
  selectionReason: string;
  nextQuestions: Call2Question[];
};

export type QualityReport = {
  call1Pass: boolean;
  call2Pass: boolean | null;
  call2Ran: boolean;
  failures: string[];
  qualityPass: boolean;
  chainContinues: boolean;
};

export type ExperimentCallLog = {
  role: 'state' | 'selection';
  executionId: string;
  responseModel: string;
  finishReason: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  usageKnown: boolean;
  latencyMs: number | null;
  request: ChatRequest;
  raw: string;
};

export type ExperimentBResult = {
  called: boolean;
  record: StoredReview;
  quality: QualityReport;
  calls: ExperimentCallLog[];
};

type StoreLike = {
  listReviews: (userId: string, projectId: string) => Promise<StoredReview[]>;
  insertReview: (record: StoredReview) => Promise<{ wrote: boolean }>;
};

export function experimentBStateSchema(): Record<string, unknown> {
  const text = { type: 'string' };
  const list = { type: 'array', items: text };
  return {
    title: 'experiment_b_state',
    type: 'object',
    additionalProperties: false,
    required: [
      'answerDelta',
      'confirmedFacts',
      'claims',
      'priorRisksRemaining',
      'newUncertainties',
      'unanalyzedAreaIds',
      'judgmentKept',
      'judgmentText',
      'answerImpact',
    ],
    properties: {
      answerDelta: { ...text, description: '이번 답이 더한 변화. 이번 답의 단어를 포함한다.' },
      confirmedFacts: { ...list, description: '확인된 기록이 없으면 빈 배열이다.' },
      claims: { ...list, description: '이번 답의 주장. 사실로 올리지 않는다.' },
      priorRisksRemaining: { ...list, description: '아직 유효한 이전 위험. 새 불확실성과 다른 목록이다.' },
      newUncertainties: { ...list, description: '이번 답이 새로 연 불확실성.' },
      unanalyzedAreaIds: { ...list, description: '아직 분석하지 않은 영역. 순서는 우선순위가 아니다.' },
      judgmentKept: { type: 'boolean', description: '이전 결론을 유지하면 true다.' },
      judgmentText: { ...text, description: '이번 상태의 판단. 이전 결론을 유지할 수 있다.' },
      answerImpact: { ...text, description: '이번 답이 판단에 미친 영향. 이번 답의 단어를 포함한다.' },
    },
  };
}

export function experimentBSelectionSchema(): Record<string, unknown> {
  const text = { type: 'string' };
  return {
    title: 'experiment_b_selection',
    type: 'object',
    additionalProperties: false,
    required: ['candidates', 'selectedCandidateId', 'selectionReason', 'nextQuestions'],
    properties: {
      candidates: {
        type: 'array',
        minItems: 2,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'candidateId',
            'areaId',
            'judgmentTarget',
            'fromNewAnswer',
            'priorRiskItChallenges',
            'whyNow',
            'overlapsReviewedObjective',
          ],
          properties: {
            candidateId: text,
            areaId: text,
            judgmentTarget: { ...text, description: '질문 문장이 아닌 사업 판단.' },
            fromNewAnswer: { type: 'boolean' },
            priorRiskItChallenges: text,
            whyNow: { ...text, description: '이번 답이 이 후보에서 바꾼 내용.' },
            overlapsReviewedObjective: { type: 'boolean' },
          },
        },
      },
      selectedCandidateId: { ...text, description: '후보 중 당신이 고른 candidateId. 코드는 고르지 않는다.' },
      selectionReason: {
        ...text,
        description: '이번 답의 단어와 이전 위험의 단어를 함께 적은 비교. 이전 순위 문장만 반복하지 않는다.',
      },
      nextQuestions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'choices', 'verificationPurpose'],
          properties: {
            text: text,
            verificationPurpose: text,
            choices: { type: 'array', minItems: 2, items: text },
          },
        },
      },
    },
  };
}

export function stateSystemPrompt(): string {
  return STATE_SYSTEM;
}

export function selectionSystemPrompt(): string {
  return SELECTION_SYSTEM;
}

export function presentInAnswers(text: string, answers: string[]): boolean {
  if (typeof text !== 'string') return false;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return false;
  return answers.some((answer) => typeof answer === 'string' && answer.replace(/\s+/g, '').includes(compact));
}

export function buildStateRequest(input: {
  originalIdea: string;
  priorAnswers: string[];
  currentAnswer: string;
  priorJudgment: string;
  priorRisks: string[];
  openUncertainties: string[];
  closedQuestions: string[];
  unresolved: string[];
}): ChatRequest {
  const answers = [...input.priorAnswers, input.currentAnswer];
  return {
    model: EXPERIMENT_B_MODEL,
    temperature: 0.2,
    maxTokens: 1600,
    messages: [
      { role: 'system', content: STATE_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          originalIdea: input.originalIdea,
          priorAnswers: input.priorAnswers,
          currentAnswer: input.currentAnswer,
          confirmedFacts: [],
          answerSource: 'simulation',
          priorJudgment: input.priorJudgment,
          priorRisks: input.priorRisks,
          openUncertainties: input.openUncertainties,
          closedQuestions: input.closedQuestions,
          unresolvedMarks: input.unresolved.map((text) => ({ text, presentInAnswers: presentInAnswers(text, answers) })),
          areaIds: AREA_IDS,
          areaOrderIsNotPriority: true,
        }),
      },
    ],
    responseFormat: { type: 'json_schema', schema: experimentBStateSchema() },
  };
}

export function buildSelectionRequest(input: {
  ledger: Call1Fields;
  currentAnswer: string;
  priorJudgment: string;
  closedQuestions: string[];
  priorChoiceLabels: string[][];
}): ChatRequest {
  return {
    model: EXPERIMENT_B_MODEL,
    temperature: 0.2,
    maxTokens: 1600,
    messages: [
      { role: 'system', content: SELECTION_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          ledger: input.ledger,
          currentAnswer: input.currentAnswer,
          priorJudgment: input.priorJudgment,
          closedQuestions: input.closedQuestions,
          priorChoiceLabels: input.priorChoiceLabels,
          areaOrderIsNotPriority: true,
        }),
      },
    ],
    responseFormat: { type: 'json_schema', schema: experimentBSelectionSchema() },
  };
}

export function repositoryCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 2.5 + outputTokens * 10) / 1_000_000;
}

export function answerContentTokens(answer: string): string[] {
  return ANSWER_TOKENS.filter((token) => answer.includes(token));
}

export function experimentPurposeKey(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\s+/g, '')
    .replace(/[?？!！。.,]/g, '')
    .replace(/구축|구체화/g, '실행')
    .replace(/구체적인|구체적으로|구체적|정확히|실제로|어떻게|어떤방법을|어떤방법|확인하기|확인하여|확인할|확인한|위하여|위해|사용할|할계획인가|할것인가|계획인가|것인가/g, '');
}

export function questionReword(question: string, closedQuestions: string[]): boolean {
  const next = experimentPurposeKey(question);
  if (!next) return false;
  return closedQuestions.some((closed) => {
    const prior = experimentPurposeKey(closed);
    if (!prior) return false;
    if (prior === next) return true;
    const shorter = prior.length < next.length ? prior : next;
    const longer = prior.length < next.length ? next : prior;
    return shorter.length >= 8 && longer.includes(shorter);
  });
}

export function choicesReused(priorChoiceLabels: string[][], nextChoices: string[]): boolean {
  const nextSet = substantive(nextChoices);
  const priorSet = new Set(priorChoiceLabels.flatMap((labels) => substantive(labels)));
  if (nextSet.length === 0 || priorSet.size === 0) return false;
  return nextSet.every((label) => priorSet.has(label));
}

export function parseCall1(raw: string): Call1Fields | null {
  const parsed = parseObject(raw);
  if (!parsed) return null;
  const answerDelta = stringField(parsed.answerDelta);
  const judgmentText = stringField(parsed.judgmentText);
  const answerImpact = stringField(parsed.answerImpact);
  const confirmedFacts = stringList(parsed.confirmedFacts);
  const claims = stringList(parsed.claims);
  const priorRisksRemaining = stringList(parsed.priorRisksRemaining);
  const newUncertainties = stringList(parsed.newUncertainties);
  const unanalyzedAreaIds = stringList(parsed.unanalyzedAreaIds);
  if (
    !answerDelta ||
    !judgmentText ||
    !answerImpact ||
    !confirmedFacts ||
    !claims ||
    !priorRisksRemaining ||
    !newUncertainties ||
    !unanalyzedAreaIds ||
    typeof parsed.judgmentKept !== 'boolean'
  ) {
    return null;
  }
  return {
    answerDelta,
    confirmedFacts,
    claims,
    priorRisksRemaining,
    newUncertainties,
    unanalyzedAreaIds,
    judgmentKept: parsed.judgmentKept,
    judgmentText,
    answerImpact,
  };
}

export function parseCall2(raw: string): Call2Fields | null {
  const parsed = parseObject(raw);
  if (!parsed) return null;
  const selectedCandidateId = stringField(parsed.selectedCandidateId);
  const selectionReason = stringField(parsed.selectionReason);
  if (!selectedCandidateId || !selectionReason || !Array.isArray(parsed.candidates) || !Array.isArray(parsed.nextQuestions)) {
    return null;
  }
  const candidates: Call2Candidate[] = [];
  for (const item of parsed.candidates) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const candidateId = stringField(row.candidateId);
    const areaId = stringField(row.areaId);
    const judgmentTarget = stringField(row.judgmentTarget);
    const priorRiskItChallenges = stringField(row.priorRiskItChallenges);
    const whyNow = stringField(row.whyNow);
    if (
      !candidateId ||
      !areaId ||
      !judgmentTarget ||
      !priorRiskItChallenges ||
      !whyNow ||
      typeof row.fromNewAnswer !== 'boolean' ||
      typeof row.overlapsReviewedObjective !== 'boolean'
    ) {
      return null;
    }
    candidates.push({
      candidateId,
      areaId,
      judgmentTarget,
      fromNewAnswer: row.fromNewAnswer,
      priorRiskItChallenges,
      whyNow,
      overlapsReviewedObjective: row.overlapsReviewedObjective,
    });
  }
  const nextQuestions: Call2Question[] = [];
  for (const item of parsed.nextQuestions) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const text = stringField(row.text);
    const verificationPurpose = stringField(row.verificationPurpose);
    const choices = stringList(row.choices);
    if (!text || !verificationPurpose || !choices || choices.length < 2) return null;
    nextQuestions.push({ text, choices, verificationPurpose });
  }
  if (candidates.length < 2 || nextQuestions.length < 1) return null;
  return { candidates, selectedCandidateId, selectionReason, nextQuestions };
}

export function scoreExperimentB(input: {
  call1: Call1Fields | null;
  call2: Call2Fields | null;
  call2Ran: boolean;
  answer: string;
  originalIdea: string;
  priorAnswers: string[];
  priorRisks: string[];
  closedQuestions: string[];
  priorChoiceLabels: string[][];
}): QualityReport {
  const failures: string[] = [];
  if (!input.call1) failures.push('call1_format');
  else failures.push(...scoreCall1(input.call1, input));
  const call1Pass = failures.length === 0;
  if (!call1Pass) {
    if (input.call2Ran) failures.push('call2_after_call1_failure');
    return report(failures, false, null, input.call2Ran);
  }
  if (!input.call2Ran || !input.call2) {
    failures.push('call2_format');
    return report(failures, true, false, input.call2Ran);
  }
  failures.push(...scoreCall2(input.call2, input));
  return report(failures, true, failures.length === 0, true);
}

export async function runExperimentBFollowUp(input: {
  store: StoreLike;
  userId: string;
  projectId: string;
  parent: StoredReview;
  answer: string;
  now: string;
  chat: ReviewChat;
  sourceFeedbackId: string | null;
  originalIdea: string;
  priorAnswers: string[];
  priorJudgment: string;
  priorRisks: string[];
  openUncertainties: string[];
  closedQuestions: string[];
  priorChoiceLabels: string[][];
  unresolved: string[];
}): Promise<ExperimentBResult> {
  const supplementSha = sha256(input.answer);
  const existing = (await input.store.listReviews(input.userId, input.projectId))
    .filter((record) => record.parentReviewId === input.parent.reviewId && record.supplementSha === supplementSha)
    .at(-1);
  if (existing) {
    return { called: false, record: existing, quality: qualityFromRecord(existing), calls: [] };
  }
  const stateRequest = buildStateRequest(input);
  const stateResponse = await input.chat(stateRequest);
  const stateLog = callLog('state', stateRequest, stateResponse);
  const call1 = usableModel(stateResponse) ? parseCall1(stateResponse.content) : null;
  const call1Failures = scoreExperimentB({
    call1,
    call2: null,
    call2Ran: false,
    answer: input.answer,
    originalIdea: input.originalIdea,
    priorAnswers: input.priorAnswers,
    priorRisks: input.priorRisks,
    closedQuestions: input.closedQuestions,
    priorChoiceLabels: input.priorChoiceLabels,
  }).failures.filter((item) => item !== 'call2_format');
  if (call1Failures.length > 0 || !call1) {
    const quality = scoreExperimentB({
      call1,
      call2: null,
      call2Ran: false,
      answer: input.answer,
      originalIdea: input.originalIdea,
      priorAnswers: input.priorAnswers,
      priorRisks: input.priorRisks,
      closedQuestions: input.closedQuestions,
      priorChoiceLabels: input.priorChoiceLabels,
    });
    const qualityStopped: QualityReport = { ...quality, failures: quality.failures.filter((item) => item !== 'call2_format') };
    qualityStopped.call2Pass = null;
    qualityStopped.qualityPass = false;
    qualityStopped.chainContinues = false;
    const record = await persist(input, supplementSha, [stateLog], call1, null, qualityStopped);
    return { called: true, record, quality: qualityStopped, calls: [stateLog] };
  }
  const selectionRequest = buildSelectionRequest({
    ledger: call1,
    currentAnswer: input.answer,
    priorJudgment: input.priorJudgment,
    closedQuestions: input.closedQuestions,
    priorChoiceLabels: input.priorChoiceLabels,
  });
  const selectionResponse = await input.chat(selectionRequest);
  const selectionLog = callLog('selection', selectionRequest, selectionResponse);
  const call2 = usableModel(selectionResponse) ? parseCall2(selectionResponse.content) : null;
  const quality = scoreExperimentB({
    call1,
    call2,
    call2Ran: true,
    answer: input.answer,
    originalIdea: input.originalIdea,
    priorAnswers: input.priorAnswers,
    priorRisks: input.priorRisks,
    closedQuestions: input.closedQuestions,
    priorChoiceLabels: input.priorChoiceLabels,
  });
  const record = await persist(input, supplementSha, [stateLog, selectionLog], call1, call2, quality);
  return { called: true, record, quality, calls: [stateLog, selectionLog] };
}

function scoreCall1(
  call1: Call1Fields,
  input: { answer: string; originalIdea: string; priorAnswers: string[] },
): string[] {
  const failures: string[] = [];
  if (call1.confirmedFacts.length > 0) failures.push('simulation_promoted');
  const recorded = `${call1.answerDelta}\n${call1.claims.join('\n')}`;
  const missing = answerContentTokens(input.answer).filter((token) => !recorded.includes(token));
  if (missing.length > 0) failures.push('answer_change_missing');
  if (!answerContentTokens(input.answer).some((token) => call1.answerImpact.includes(token))) failures.push('answer_impact_missing');
  const inventedSource = [input.originalIdea, ...input.priorAnswers, input.answer].join('\n');
  const inventedFields = [call1.answerDelta, call1.claims.join('\n'), call1.confirmedFacts.join('\n'), call1.newUncertainties.join('\n')].join('\n');
  if (['점포', '접촉'].some((token) => inventedFields.includes(token) && !inventedSource.includes(token))) {
    failures.push('invented_shop_or_contact');
  }
  return failures;
}

function scoreCall2(
  call2: Call2Fields,
  input: { answer: string; priorRisks: string[]; closedQuestions: string[]; priorChoiceLabels: string[][] },
): string[] {
  const failures: string[] = [];
  const cited = call2.candidates.some(
    (candidate) =>
      candidate.fromNewAnswer &&
      answerContentTokens(input.answer).some((token) => `${candidate.whyNow}\n${candidate.judgmentTarget}`.includes(token)),
  );
  if (!cited) failures.push('new_uncertainty_not_in_candidates');
  if (!call2.candidates.some((candidate) => candidate.candidateId === call2.selectedCandidateId)) {
    failures.push('selection_not_in_candidates');
  }
  const priorTokens = PRIOR_RISK_TOKENS.filter((token) => input.priorRisks.some((risk) => risk.includes(token)));
  const compared =
    answerContentTokens(input.answer).some((token) => call2.selectionReason.includes(token)) &&
    priorTokens.some((token) => call2.selectionReason.includes(token));
  if (!compared) failures.push('selection_comparison_missing');
  if (call2.nextQuestions.some((question) => questionReword(question.text, input.closedQuestions))) failures.push('question_reword');
  if (call2.nextQuestions.some((question) => choicesReused(input.priorChoiceLabels, question.choices))) failures.push('choices_reused');
  return failures;
}

function report(failures: string[], call1Pass: boolean, call2Pass: boolean | null, call2Ran: boolean): QualityReport {
  const qualityPass = failures.length === 0 && call1Pass && call2Pass === true;
  return {
    call1Pass,
    call2Pass,
    call2Ran,
    failures,
    qualityPass,
    chainContinues: qualityPass,
  };
}

async function persist(
  input: {
    store: StoreLike;
    userId: string;
    projectId: string;
    parent: StoredReview;
    now: string;
    sourceFeedbackId: string | null;
  },
  supplementSha: string,
  calls: ExperimentCallLog[],
  call1: Call1Fields | null,
  call2: Call2Fields | null,
  quality: QualityReport,
): Promise<StoredReview> {
  const promptTokens = sum(calls, (call) => call.promptTokens);
  const completionTokens = sum(calls, (call) => call.completionTokens);
  const totalTokens = sum(calls, (call) => call.totalTokens);
  const envelope = {
    kind: 'experiment_b_stage',
    quality,
    calls: calls.map((call) => ({
      role: call.role,
      executionId: call.executionId,
      responseModel: call.responseModel,
      finishReason: call.finishReason,
      promptTokens: call.promptTokens,
      completionTokens: call.completionTokens,
      totalTokens: call.totalTokens,
      usageKnown: call.usageKnown,
      raw: call.raw,
    })),
  };
  const sections = quality.qualityPass && call1 && call2 ? sectionsFrom(call1, call2) : null;
  const record: StoredReview = {
    reviewId: randomUUID(),
    userId: input.userId,
    version: input.parent.version + 1,
    parentReviewId: input.parent.reviewId,
    sourceFeedbackId: input.sourceFeedbackId,
    supplementSha,
    projectId: input.projectId,
    inputSha: input.parent.inputSha,
    inputText: input.parent.inputText,
    inputOrigin: input.parent.inputOrigin,
    fileName: input.parent.fileName,
    status: quality.qualityPass ? 'succeeded' : 'failed',
    evidence: 'live_network',
    provider: 'openai',
    model: calls.at(-1)?.responseModel ?? null,
    sections,
    rawContent: JSON.stringify(envelope),
    firstRawContent: calls[0]?.raw ?? null,
    callLedger: calls.map((call, index) => ({
      index: index + 1,
      promptTokens: call.promptTokens,
      completionTokens: call.completionTokens,
      totalTokens: call.totalTokens,
      readingIssues: [],
    })),
    stageReading:
      call1 && call2
        ? {
            answerInterpretation: [],
            impactOnPreviousJudgment: call1.answerImpact,
            updatedJudgment: call1.judgmentText,
            judgmentReason: call1.answerImpact,
            verifiedFacts: call1.confirmedFacts,
            unverifiedClaims: call1.claims,
            assumptions: [],
            resolvedIssues: [],
            unresolvedIssues: call1.newUncertainties,
            nextVerification: call2.selectionReason,
            nextQuestions: call2.nextQuestions,
            nextQuestionChoices: call2.nextQuestions.map((question) => question.choices),
          }
        : null,
    promptTokens,
    completionTokens,
    totalTokens,
    usageKnown: calls.length > 0 && calls.every((call) => call.usageKnown),
    callCount: calls.length,
    latencyMs: calls.reduce<number>((total, call) => total + (call.latencyMs ?? 0), 0),
    error: quality.qualityPass ? null : 'experiment_quality',
    requestedAt: input.now,
    finishedAt: input.now,
  };
  await input.store.insertReview(record);
  return record;
}

function sectionsFrom(call1: Call1Fields, call2: Call2Fields): ReviewSections {
  const questions = call2.nextQuestions.map((question, index) => ({
    questionId: `q${index + 1}`,
    text: question.text,
    choices: question.choices.map((label, choiceIndex) => ({ id: `c${choiceIndex + 1}`, label })),
    verificationPurpose: question.verificationPurpose,
  }));
  return {
    customer: call1.answerDelta,
    problem: call1.answerImpact,
    market: call1.judgmentText,
    revenueModel: call2.selectionReason,
    execution: call1.answerDelta,
    risks: call1.priorRisksRemaining,
    uncertain: call1.newUncertainties,
    hypotheses: call1.claims,
    judgment: call1.judgmentText,
    nextQuestion: questions[0]?.text ?? '',
    nextQuestionReason: call2.selectionReason,
    answerHint: call1.answerImpact,
    claimConfirmation: null,
    analysis: {
      summary: call1.answerDelta,
      value: call1.answerImpact,
      operatingModel: call1.judgmentText,
      payer: call1.claims[0] ?? call1.answerDelta,
      competition: call1.answerDelta,
      operations: call1.answerImpact,
      profitability: call1.judgmentText,
      strengths: [],
      assumptions: call1.claims,
      evidenceToChange: call1.newUncertainties,
      founderFacts: call1.confirmedFacts,
      inferences: call1.newUncertainties,
      judgmentDetail: call1.judgmentText,
      choices: questions[0]?.choices ?? [],
      nextVerification: call2.selectionReason,
      questions,
    },
  };
}

function qualityFromRecord(record: StoredReview): QualityReport {
  try {
    const parsed = JSON.parse(record.rawContent ?? '') as { quality?: QualityReport };
    if (parsed.quality && Array.isArray(parsed.quality.failures)) return parsed.quality;
  } catch {
    /* The stored row stays in place. A second call is not used to repair it. */
  }
  return {
    call1Pass: false,
    call2Pass: null,
    call2Ran: false,
    failures: ['stored_quality_unreadable'],
    qualityPass: false,
    chainContinues: false,
  };
}

function callLog(role: 'state' | 'selection', request: ChatRequest, response: ChatResponse): ExperimentCallLog {
  return {
    role,
    executionId: response.id,
    responseModel: response.model,
    finishReason: response.finishReason,
    promptTokens: response.usageKnown ? response.usage.inputTokens : null,
    completionTokens: response.usageKnown ? response.usage.outputTokens : null,
    totalTokens: response.usageKnown ? response.usage.totalTokens : null,
    usageKnown: response.usageKnown === true,
    latencyMs: response.latencyMs ?? null,
    request,
    raw: response.content,
  };
}

function usableModel(response: ChatResponse): boolean {
  return response.finishReason === 'stop' && modelIsGpt4o(response.model);
}

function modelIsGpt4o(model: string): boolean {
  return model === 'gpt-4o' || (model.startsWith('gpt-4o-') && !model.includes('mini'));
}

function substantive(labels: string[]): string[] {
  return labels
    .filter((label): label is string => typeof label === 'string')
    .map((label) => label.replace(/\s+/g, ''))
    .filter((label) => label.length > 0 && !/기타|직접입력|아직핵심을정하지못했다/.test(label));
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return null;
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function sum(calls: ExperimentCallLog[], read: (call: ExperimentCallLog) => number | null): number | null {
  if (calls.some((call) => read(call) === null)) return null;
  return calls.reduce((total, call) => total + (read(call) ?? 0), 0);
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
