import { createHash, randomUUID } from 'node:crypto';

import { googleChat, OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import { feedbackFromMarks, normalizeMarks, UNCONFIRMED_CLAIM } from './ai-pm-review-marks';
import type {
  Accuracy,
  Agreement,
  AiPmReviewStore,
  BusinessAnalysis,
  ChoiceAnswer,
  ConsultingTurn,
  NextAction,
  ReviewMark,
  ReviewSections,
  RevisionArea,
  ReviewCallNote,
  RevisionGate,
  StoredFeedback,
  StoredReview,
} from './ai-pm-review-store';

export const AI_PM_REVIEW_MODEL = 'gpt-4o-mini';
/** First-review prompt generation. Logged by the quality harness. Not a runtime SHA. */
export const AI_PM_FIRST_PROMPT_VERSION = 'quality-2';
export const AI_PM_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
export const AI_PM_REVIEW_MAX_TOKENS = 800;
/** Follow-up output includes four change records with quoted grounds. 1600 truncated that array. */
export const AI_PM_FOLLOW_UP_MAX_TOKENS = 2400;
export const AI_PM_REVIEW_FIRST_MAX_TOKENS = 2400;
export const AI_PM_REVIEW_INPUT_TOKEN_BUDGET = 3_000;
/** Follow-up JSON includes the stored analysis. The first-review budget would cut that object. */
export const AI_PM_FOLLOW_UP_INPUT_TOKEN_BUDGET = 8_000;
/** Full consulting text. History is not cut to chase a smaller bill. */
export const AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS = 2_400;
/** The Hangul estimator over-counts. This room keeps the newest analyses and the founder answers. */
export const AI_PM_PRODUCT_REANALYSIS_INPUT_TOKEN_BUDGET = 24_000;

/**
 * Follow-up sends the parser's stored sections, not a byte copy of the first model JSON.
 * originalInput is the founder's business text. The model raw stays on the stored review row.
 */
export const FOLLOW_UP_ANALYSIS_CONTRACT = 'parsed-sections-1';

export const FOLLOW_UP_ANALYSIS_CONTRACT_NOTE =
  'previousAnalysis는 파서가 저장한 분석 섹션 전체다. 1차 모델 JSON 원문의 바이트 복사가 아니다. originalInput은 창업자 사업 원문 전체다.';

export const FOLLOW_UP_ANSWER_ORIGINS = ['synthetic-test-data', 'founder-input'] as const;
export type FollowUpAnswerOrigin = (typeof FOLLOW_UP_ANSWER_ORIGINS)[number];

export const FOLLOW_UP_OUTPUT_CONTRACT = 'reflection-output-11';

export const FOLLOW_UP_FOUNDER_ANSWER_STATUS = 'unverified-input';

export const FOLLOW_UP_BREWERY_VERIFICATION_PLAN =
  '체험 프로그램을 먼저 검증할 것. 먼저 체험 프로그램을 제공할 수 있는 양조장 후보를 찾고, 실제 협력 가능 여부와 체험 운영 조건을 확인한다. 협력 가능 여부가 확인되기 전까지는 확정된 공급처로 간주하지 않는다. 이후 잠재 고객 인터뷰와 체험 참여 의향을 확인하고, 가격 수용도와 예약 전환은 별도로 검증한다.';

/** Synthetic claim. It is not a verified brewery and it is not the absence sentence. */
export const FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM =
  '테스트용 합성 설명. 실제 창업자가 제공한 문장이 아니다. 양조장 한 곳과 체험 진행이 확정되었다고 말한다. 계약서와 입금 증빙은 없다.';

export const FOLLOW_UP_OUTPUT_CONTRACT_NOTE =
  '반환 필수 필드는 judgment, hypotheses, nextVerification, nextQuestion, revenueModel, changes이다. changes 원소는 field, previous, current, decision, reason, evidenceStatus, inputConsidered, impactAssessment, sufficiencyAssessment, retentionDecision, holdReason, evidenceNeeded이다. decision과 retentionDecision은 changed, retained, unresolved 중 하나이고 서로 같다. retained와 unresolved는 답변을 검토한 결과다. 여섯 검토 필드는 모델이 채운다. 코드가 그 문장을 만들지 않는다. 창업자 답변은 입력에 있으므로 원소마다 반복하지 않는다. 저장된 가설이 미확인이면 미확인으로 둔다. 수요가 있을 것이라는 문장을 넣으면 실패다. nextQuestion은 물음표로 끝나는 질문이다. 지시 문장을 질문으로 쓰면 실패다. revenueModel은 저장된 가설 문장 그대로다.';

export const FOLLOW_UP_REVIEW_FIELDS = [
  'inputConsidered',
  'impactAssessment',
  'sufficiencyAssessment',
  'retentionDecision',
  'holdReason',
  'evidenceNeeded',
] as const;

export const FOLLOW_UP_DECISIONS = ['retained', 'changed', 'unresolved'] as const;
export const FOLLOW_UP_SUFFICIENCY = ['sufficient', 'insufficient', 'partial'] as const;

/** Strict object the follow-up model must fill. Omitting a review field is not a successful response. */
export function followUpReflectionSchema(): Record<string, unknown> {
  return {
    title: 'reflection_output_11',
    type: 'object',
    additionalProperties: false,
    required: ['judgment', 'hypotheses', 'nextVerification', 'nextQuestion', 'revenueModel', 'changes'],
    properties: {
      judgment: { type: 'string' },
      hypotheses: { type: 'array', items: { type: 'string' } },
      nextVerification: { type: 'string' },
      nextQuestion: { type: 'string' },
      revenueModel: { type: 'string' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'field',
            'previous',
            'current',
            'decision',
            'reason',
            'evidenceStatus',
            ...FOLLOW_UP_REVIEW_FIELDS,
          ],
          properties: {
            field: { type: 'string', enum: [...FOLLOW_UP_OUTPUT_FIELDS] },
            previous: { type: 'string' },
            current: { type: 'string' },
            decision: { type: 'string', enum: [...FOLLOW_UP_DECISIONS] },
            reason: { type: 'string' },
            evidenceStatus: { type: 'string', enum: [...EVIDENCE_STATUSES] },
            inputConsidered: {
              type: 'string',
              description: '창업자 답변이 새로 말한 정보. 확정 주장은 확인된 사실이 아니다.',
            },
            impactAssessment: { type: 'string', description: '그 정보가 기존 판단이나 가설에 미치는 영향.' },
            sufficiencyAssessment: {
              type: 'string',
              enum: [...FOLLOW_UP_SUFFICIENCY],
              description: 'retained 또는 unresolved이면 sufficient가 아니다.',
            },
            retentionDecision: { type: 'string', enum: [...FOLLOW_UP_DECISIONS], description: 'decision과 같은 값.' },
            holdReason: {
              type: 'string',
              description: '유지하거나 유보하거나 바꾼 구체적 이유. 방향성만 적거나 추가 정보가 필요하다만 쓰면 실패다.',
            },
            evidenceNeeded: {
              type: 'string',
              description: '판단을 바꾸려면 필요한 계약서, 증빙, 예약, 입금, 확인, 인터뷰, 기록.',
            },
          },
        },
      },
    },
  };
}

export const FOLLOW_UP_OUTPUT_FIELDS = ['judgment', 'hypotheses', 'nextVerification', 'nextQuestion'] as const;

export const FOLLOW_UP_SEPARATION_RULES = [
  '이전 1차 분석은 과거 출력이다. 새 분석과 구분하고 통째로 다시 출력하지 않는다.',
  '선택한 답변과 추가 설명은 현재의 판단·정보이며 검증된 사실이 아니다.',
  'answerOrigin이 synthetic-test-data이면 테스트용 합성 데이터다. 실제 창업자 답변으로 취급하지 않는다.',
  'answerOrigin이 founder-input이어도 근거가 없으면 사실로 승격하지 않는다. 가설로 남긴다.',
  '판단, 가설, 검증 우선순위는 답변 때문에 달라지는 부분만 갱신한다. 근거 없이 가설이 강화되었다고 쓰지 않는다.',
] as const;

export type FollowUpInputLedgerEntry = {
  id: 'founderChoice' | 'founderSupplement' | 'previousJudgment' | 'previousHypotheses' | 'previousVerification';
  kind: 'plan-choice' | 'absent' | 'unverified-claim' | 'absence-statement' | 'supplement' | 'stored';
  affects: string;
  text: string;
};

/**
 * Labels each input the model must relate to an analysis item.
 * The text is the input itself. It is not a review sentence.
 */
export function followUpInputLedger(input: {
  choiceLabel: string | null;
  supplement: string;
  judgment: string;
  hypotheses: readonly string[];
  nextVerification: string;
}): FollowUpInputLedgerEntry[] {
  const choice = (input.choiceLabel ?? '').trim();
  const supplementKind = inputSupplementKind(input.supplement);
  return [
    {
      id: 'founderChoice',
      kind: choice ? 'plan-choice' : 'absent',
      affects: 'judgment,nextVerification',
      text: choice,
    },
    {
      id: 'founderSupplement',
      kind: supplementKind,
      affects: supplementKind === 'absent' ? 'none' : 'judgment,hypotheses,nextVerification',
      text: input.supplement,
    },
    { id: 'previousJudgment', kind: 'stored', affects: 'judgment', text: input.judgment },
    { id: 'previousHypotheses', kind: 'stored', affects: 'hypotheses', text: input.hypotheses.join(' / ') },
    { id: 'previousVerification', kind: 'stored', affects: 'nextVerification', text: input.nextVerification },
  ];
}
export const AI_PM_REVIEW_INPUT_LIMIT = 24_000;

const AGREEMENTS = ['agree', 'partial', 'disagree', 'need_info'] as const;
const ACCURACY = ['very_accurate', 'mostly_accurate', 'misstated', 'hard_to_compare'] as const;
const AREAS = [
  'payer',
  'problem',
  'market',
  'revenue',
  'execution',
  'competition',
  'risk',
  'evidence',
  'other',
] as const;
const NEXT = ['verify_hypotheses', 'revise_plan', 'design_interviews', 'proceed', 'hold'] as const;

export type ReviewChat = (request: ChatRequest) => Promise<ChatResponse>;

export type AiPmFeedbackView = {
  feedbackId: string;
  reviewId: string;
  agreement: Agreement;
  accuracy: Accuracy;
  revisionAreas: RevisionArea[];
  comment: string;
  nextAction: NextAction;
  marks: ReviewMark[];
  choiceAnswer: ChoiceAnswer | null;
  submittedAt: string;
};

export type AiPmReviewView = {
  reviewId: string;
  projectId: string | null;
  version: number;
  parentReviewId: string | null;
  status: 'ready' | 'unavailable' | 'failed';
  inputOrigin: StoredReview['inputOrigin'];
  fileName: string | null;
  inputText: string;
  sections: ReviewSections | null;
  /** Set only when nextQuestion was parsed from the review model payload. */
  questionSource: 'model-review' | null;
    finishedAt: string;
    feedback: AiPmFeedbackView[];
    revision: { pass: boolean; summary: string; changes: string[] } | null;
    consultingTurn: ConsultingTurn | null;
    /** Stored error. A type mismatch is not shown as an analysis. */
    failure: string | null;
  };

export function normalizeReviewText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

/** AI PM calls read this name only. OPENAI_API_KEY does not start a review. */
export function readGptApiKey(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.GPT_API_KEY?.trim();
  return value ? value : null;
}

/** Gemini fallback reads this name only. The value is never returned to the client. */
export function readGoogleReviewKey(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.GOOGLE_AI_API_KEY?.trim();
  return value ? value : null;
}

/** Over-counts Hangul so the request stays inside the input budget. */
export function estimateReviewTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    tokens += code > 127 ? 2 : 0.25;
  }
  return Math.ceil(tokens);
}

export function clampReviewText(text: string, budget: number): string {
  if (budget <= 0) return '';
  if (estimateReviewTokens(text) <= budget) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (estimateReviewTokens(text.slice(0, mid)) <= budget) low = mid;
    else high = mid - 1;
  }
  return text.slice(0, low);
}

function fitReviewMessages(messages: ChatRequest['messages']): ChatRequest['messages'] {
  return fitMessages(messages, AI_PM_REVIEW_INPUT_TOKEN_BUDGET);
}

function fitFollowUpMessages(messages: ChatRequest['messages']): ChatRequest['messages'] {
  return fitMessages(messages, AI_PM_FOLLOW_UP_INPUT_TOKEN_BUDGET);
}

function fitMessages(messages: ChatRequest['messages'], budget: number): ChatRequest['messages'] {
  const systemTokens = estimateReviewTokens(
    messages
      .filter((message) => message.role !== 'user')
      .map((message) => message.content)
      .join('\n'),
  );
  const room = budget - systemTokens;
  let remaining = room;
  return messages.map((message) => {
    if (message.role !== 'user') return message;
    const content = clampReviewText(message.content, remaining);
    remaining -= estimateReviewTokens(content);
    return { ...message, content };
  });
}

export function isProviderQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /(?:^|\s)code=(?:credit_balance_exhausted|insufficient_quota)(?:\s|$)/.test(error.message)
    || /(?:^|\s)type=insufficient_quota(?:\s|$)/.test(error.message);
}

/** Quota, rate limit, or the in-request retry cap. The raw provider string stays on the server row. */
export function isProviderLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!message) return false;
  return isProviderQuotaError(new Error(message))
    || /rate limit exceeded/i.test(message)
    || /(?:^|\s)code=rate_limit_exceeded(?:\s|$)/.test(message)
    || /(?:^|\s)review_retry_blocked(?:\s|$)/.test(message);
}

/** One OpenAI call. A quota error may switch once. No retry loop. */
export async function callReviewWithQuotaSwitch(input: {
  request: ChatRequest;
  openAI: ReviewChat;
  gemini?: ReviewChat;
}): Promise<ChatResponse> {
  try {
    return await input.openAI(input.request);
  } catch (error) {
    if (!isProviderQuotaError(error)) throw error;
    if (!input.gemini) {
      const message = error instanceof Error ? error.message : 'quota';
      throw new Error(`${message} fallback=google_key_missing`);
    }
    try {
      return await input.gemini({
        ...input.request,
        model: AI_PM_GEMINI_FALLBACK_MODEL,
        maxTokens: input.request.maxTokens,
      });
    } catch (fallbackError) {
      const first = error instanceof Error ? error.message : 'quota';
      const second = fallbackError instanceof Error ? fallbackError.message : 'fallback_failed';
      throw new Error(`${first} fallback=${second}`.slice(0, 700));
    }
  }
}

export function openReviewChat(env: Record<string, string | undefined> = process.env): ReviewChat | undefined {
  const openAIKey = readGptApiKey(env);
  if (!openAIKey) return undefined;
  const googleKey = readGoogleReviewKey(env);
  let openAICalls = 0;
  let geminiCalls = 0;
  return (request) =>
    callReviewWithQuotaSwitch({
      request,
      openAI: async (chatRequest) => {
        if (openAICalls >= 4) throw new Error('review_retry_blocked');
        openAICalls += 1;
        return new OpenAIProviderAdapter({ apiKey: openAIKey }).chat(chatRequest);
      },
      gemini: googleKey
        ? async (chatRequest) => {
            if (geminiCalls >= 1) throw new Error('review_retry_blocked');
            geminiCalls += 1;
            return googleChat({
              apiKey: googleKey,
              request: chatRequest,
              maxOutputTokensCeiling: chatRequest.maxTokens,
            });
          }
        : undefined,
    });
}

export function reviewInputFromParts(input: {
  typed?: string;
  extracted?: string;
  fileName?: string | null;
}): { ok: true; text: string; origin: StoredReview['inputOrigin']; fileName: string | null; sha256: string } | { ok: false; error: 'empty' | 'too_long' } {
  const typed = normalizeReviewText(input.typed ?? '');
  const extracted = normalizeReviewText(input.extracted ?? '');
  const fileName = input.fileName?.trim() || null;
  let text = '';
  let origin: StoredReview['inputOrigin'] = 'typed';
  if (extracted && typed && extracted !== typed) {
    text = `${extracted}\n\n추가 입력\n${typed}`;
    origin = 'file_and_typed';
  } else if (extracted) {
    text = extracted;
    origin = 'file';
  } else if (typed) {
    text = typed;
    origin = 'typed';
  } else {
    return { ok: false, error: 'empty' };
  }
  if (text.length > AI_PM_REVIEW_INPUT_LIMIT) return { ok: false, error: 'too_long' };
  return { ok: true, text, origin, fileName: extracted ? fileName : null, sha256: sha256(text) };
}

export function toAiPmReviewView(record: StoredReview, feedback: StoredFeedback[]): AiPmReviewView {
  const blocked = record.revisionGate?.pass === false;
  const ready = record.status === 'succeeded' && !blocked;
  return {
    reviewId: record.reviewId,
    projectId: record.projectId,
    version: record.version,
    parentReviewId: record.parentReviewId,
    status: ready ? 'ready' : record.status === 'not_run' ? 'unavailable' : 'failed',
    inputOrigin: record.inputOrigin,
    fileName: record.fileName,
    inputText: record.inputText,
    sections: blocked ? null : record.sections,
    questionSource: ready && record.sections?.nextQuestion ? 'model-review' : null,
    finishedAt: record.finishedAt,
    feedback: feedback
      .filter((item) => item.reviewId === record.reviewId)
      .map((item) => ({
        feedbackId: item.feedbackId,
        reviewId: item.reviewId,
        agreement: item.agreement,
        accuracy: item.accuracy,
        revisionAreas: item.revisionAreas,
        comment: item.comment,
        nextAction: item.nextAction,
        marks: normalizeMarks(item.marks),
        choiceAnswer: item.choiceAnswer ?? null,
        submittedAt: item.submittedAt,
      })),
    revision: record.revisionGate
      ? { pass: record.revisionGate.pass, summary: record.revisionGate.summary, changes: record.revisionGate.changes }
      : null,
    consultingTurn: record.consultingTurn ?? null,
    failure: clientFailure(record.error),
  };
}

const CLIENT_FAILURES = ['revenue_model_type', 'invalid_json', 'unstructured_response', 'call_limited'] as const;

function clientFailure(error: string | null): (typeof CLIENT_FAILURES)[number] | null {
  if (!error) return null;
  if (isProviderLimitError(error)) return 'call_limited';
  return CLIENT_FAILURES.find((code) => code === error) ?? null;
}

/** Why a model string cannot be stored as an analysis. Null means the product parser accepts it. */
export function reviewContractError(raw: string): 'invalid_json' | 'revenue_model_type' | 'unstructured_response' | null {
  const stripped = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return 'invalid_json';
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'invalid_json';
  const record = parsed as Record<string, unknown>;
  if ('revenueModel' in record && typeof record.revenueModel !== 'string') return 'revenue_model_type';
  return parseSections(raw) ? null : 'unstructured_response';
}

/** Older succeeded follow-ups have no stored gate. Compare them on read and keep the row unchanged. */
export function presentReview(record: StoredReview, feedback: StoredFeedback[], records: StoredReview[]): AiPmReviewView {
  record = repairUnstructured(record);
  const source = feedback.find((item) => item.feedbackId === record.sourceFeedbackId) ?? null;
  const marks = normalizeMarks(source?.marks);
  const parent = records.find((item) => item.reviewId === record.parentReviewId) ?? null;
  if (
    !record.revisionGate &&
    record.status === 'succeeded' &&
    needsRevisionGate(marks) &&
    parent?.sections &&
    record.sections
  ) {
    const revisionGate = assessFollowUpRevision({ previous: parent.sections, next: record.sections, marks });
    return toAiPmReviewView(
      { ...record, revisionGate, status: revisionGate.pass ? record.status : 'failed' },
      feedback,
    );
  }
  return toAiPmReviewView(record, feedback);
}

export function buildFirstReviewRequest(text: string): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: fitReviewMessages([
      { role: 'system', content: firstReviewSystemPrompt() },
      {
        role: 'user',
        content: `사업 입력:\n${text}\n\n키: summary, customer, problem, value, operatingModel, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.\n검토 목적, 현재 단계, 가장 알고 싶은 것이 있으면 질문과 판단을 그 목적에 맞춘다. 원문에 없는 수익 항목은 가설로 적는다.`,
      },
    ]),
  };
}

export function followUpAnswerNotice(origin: FollowUpAnswerOrigin): string {
  if (origin === 'synthetic-test-data') {
    return '테스트용 합성 데이터. 실제 창업자 답변이 아니며 실제 사업 검증 결과가 아니다.';
  }
  return '저장된 입력이다. 현재의 판단·정보이며 검증된 사실이 아니다.';
}

function followUpPreviousAnalysis(sections: ReviewSections): Record<string, unknown> {
  const analysis = sections.analysis;
  return {
    customer: sections.customer,
    problem: sections.problem,
    market: sections.market,
    revenueModel: sections.revenueModel,
    execution: sections.execution,
    risks: [...sections.risks],
    uncertain: [...sections.uncertain],
    hypotheses: [...sections.hypotheses],
    judgment: sections.judgment,
    nextQuestion: sections.nextQuestion,
    nextQuestionReason: sections.nextQuestionReason,
    answerHint: sections.answerHint,
    claimConfirmation: sections.claimConfirmation,
    analysis: analysis
      ? {
          ...analysis,
          strengths: [...analysis.strengths],
          assumptions: [...analysis.assumptions],
          evidenceToChange: [...analysis.evidenceToChange],
          founderFacts: [...analysis.founderFacts],
          inferences: [...analysis.inferences],
          choices: analysis.choices.map((choice) => ({ ...choice })),
        }
      : null,
  };
}

export function buildFollowUpRequest(input: {
  originalInput: string;
  sections: ReviewSections;
  feedback: StoredFeedback | null;
  supplement: string;
  /** Required. Omitting it must not become founder-input. Does not call a model. */
  answerOrigin: FollowUpAnswerOrigin;
}): ChatRequest {
  if (!input.answerOrigin) throw new Error('follow_up_answer_origin_required');
  if (!FOLLOW_UP_ANSWER_ORIGINS.includes(input.answerOrigin)) throw new Error('follow_up_answer_origin_invalid');
  const answerOrigin = input.answerOrigin;
  const marks = normalizeMarks(input.feedback?.marks);
  const revision = revisionPayload(input.sections, marks);
  const choice = input.feedback?.choiceAnswer ?? null;
  const payload = {
    ...(revision ? { revision } : {}),
    analysisContract: FOLLOW_UP_ANALYSIS_CONTRACT,
    analysisContractNote: FOLLOW_UP_ANALYSIS_CONTRACT_NOTE,
    outputContract: FOLLOW_UP_OUTPUT_CONTRACT,
    outputContractNote: FOLLOW_UP_OUTPUT_CONTRACT_NOTE,
    answerOrigin,
    answerOriginNotice: followUpAnswerNotice(answerOrigin),
    originalInput: input.originalInput,
    previousAnalysis: followUpPreviousAnalysis(input.sections),
    previousQuestion: input.sections.nextQuestion,
    founderChoice: choice
      ? {
          answerOrigin,
          choiceId: choice.choiceId,
          label: choice.label,
          otherText: choice.otherText,
        }
      : null,
    founderSupplement: input.supplement,
    ...(revision
      ? {}
      : {
          inputLedger: followUpInputLedger({
            choiceLabel: choice?.label ?? null,
            supplement: input.supplement,
            judgment: input.sections.judgment,
            hypotheses: input.sections.hypotheses,
            nextVerification: input.sections.analysis?.nextVerification ?? '',
          }),
        }),
    separationRules: [...FOLLOW_UP_SEPARATION_RULES],
    feedback: input.feedback
      ? {
          agreement: input.feedback.agreement,
          accuracy: input.feedback.accuracy,
          revisionAreas: input.feedback.revisionAreas,
          comment: input.feedback.comment,
          nextAction: input.feedback.nextAction,
          marks,
          choiceAnswer: choice,
        }
      : null,
    previousReview: {
      problem: input.sections.problem,
      target_customer: input.sections.customer,
      solution: input.sections.execution,
      business_model: input.sections.revenueModel,
      validation_metric: input.sections.market,
      judgment: input.sections.judgment,
      nextQuestion: input.sections.nextQuestion,
    },
    supplement: input.supplement,
  };
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_FOLLOW_UP_MAX_TOKENS,
    responseFormat: revision ? { type: 'json_object' } : { type: 'json_schema', schema: followUpReflectionSchema() },
    messages: fitFollowUpMessages([
      { role: 'system', content: revision ? gatedFollowUpPrompt() : reviewSystemPrompt(input.supplement) },
      { role: 'user', content: JSON.stringify(payload) },
    ]),
  };
}

/** Root first, then each succeeded child. A failed row is not a parent, so it stays off this chain. */
export function reviewChain(records: StoredReview[], parent: StoredReview): StoredReview[] {
  const byId = new Map(records.map((item) => [item.reviewId, item]));
  const reversed: StoredReview[] = [];
  const seen = new Set<string>();
  let cursor: StoredReview | undefined = parent;
  while (cursor && !seen.has(cursor.reviewId)) {
    seen.add(cursor.reviewId);
    reversed.push(cursor);
    cursor = cursor.parentReviewId ? byId.get(cursor.parentReviewId) : undefined;
  }
  return reversed.reverse();
}

export type PriorAnalysisBrief = {
  reviewId: string;
  judgment: string;
  nextQuestion: string;
  assumptions: string[];
  risks: string[];
};

export type ConsultingPathStep = {
  order: number;
  reviewId: string;
  choice: string | null;
  supplement: string;
  answeredQuestion: string;
  judgment: string;
  nextQuestion: string;
  assumptions: string[];
  risks: string[];
  judgmentStatus: 'adopted' | 'unresolved';
};

export type ExperimentRecord = {
  reviewId: string;
  supplement: string;
  role: 'repeat_experiment';
};

export type FailedCallRecord = {
  reviewId: string;
  role: 'failed_call';
};

type NormalizableReview = {
  reviewId: string;
  parentReviewId: string | null;
  status: StoredReview['status'];
  inputSha: string;
  finishedAt: string;
  version: number;
  consultingTurn?: ConsultingTurn | null;
  judgment: string;
  nextQuestion: string;
  assumptions: string[];
  risks: string[];
};

function consultingAnswerKey(choice: string | null, supplement: string): string {
  return `${(choice ?? '').trim()}\n${supplement.trim()}`;
}

/**
 * One real founder answer is one consulting step.
 * Later calls that reuse that answer are experiments, not the next turn.
 */
export function normalizeConsultingRecords(input: {
  records: NormalizableReview[];
  rootId: string;
  parentId: string;
  parentInputSha: string;
  chainIds: string[];
  currentChoice: string | null;
  currentSupplement: string;
}): {
  consultingPath: ConsultingPathStep[];
  experimentRecords: ExperimentRecord[];
  failedCalls: FailedCallRecord[];
  priorTurns: ConsultingTurn[];
  priorAnalyses: PriorAnalysisBrief[];
  newFounderInformation: boolean;
} {
  const sameInput = input.records.filter((record) => record.inputSha === input.parentInputSha);
  const byTime = (left: NormalizableReview, right: NormalizableReview) =>
    left.finishedAt.localeCompare(right.finishedAt) || left.version - right.version;
  const answered = sameInput
    .filter((record) => record.status === 'succeeded' && record.consultingTurn && record.reviewId !== input.rootId)
    .sort(byTime);
  const groups = new Map<string, NormalizableReview[]>();
  for (const record of answered) {
    const turn = record.consultingTurn;
    if (!turn) continue;
    const key = consultingAnswerKey(turn.choiceLabel, turn.supplement);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  const continuedFrom = (record: NormalizableReview) => {
    const own = record.consultingTurn;
    if (!own) return false;
    const ownKey = consultingAnswerKey(own.choiceLabel, own.supplement);
    return sameInput.some((child) => {
      if (child.parentReviewId !== record.reviewId || !child.consultingTurn) return false;
      return consultingAnswerKey(child.consultingTurn.choiceLabel, child.consultingTurn.supplement) !== ownKey;
    });
  };
  const canonical: NormalizableReview[] = [];
  const experiments: ExperimentRecord[] = [];
  for (const group of groups.values()) {
    const kept = group.filter(continuedFrom).sort(byTime).at(-1) ?? group[0];
    if (!kept?.consultingTurn) continue;
    canonical.push(kept);
    for (const record of group) {
      if (record.reviewId === kept.reviewId) continue;
      experiments.push({
        reviewId: record.reviewId,
        supplement: record.consultingTurn?.supplement ?? '',
        role: 'repeat_experiment',
      });
    }
  }
  canonical.sort(byTime);
  const currentKey = consultingAnswerKey(input.currentChoice, input.currentSupplement);
  const chainIds = new Set(input.chainIds);
  const currentCanonical = canonical.find((record) => {
    const turn = record.consultingTurn;
    return Boolean(turn) && consultingAnswerKey(turn?.choiceLabel ?? null, turn?.supplement ?? '') === currentKey;
  });
  const pathRecords = canonical.filter((record) => chainIds.has(record.reviewId));
  if (currentCanonical && !pathRecords.some((record) => record.reviewId === currentCanonical.reviewId)) pathRecords.push(currentCanonical);
  const parentRecord = input.records.find((record) => record.reviewId === input.parentId);
  const parentTurn = parentRecord?.consultingTurn;
  if (parentRecord && parentTurn) {
    const parentKey = consultingAnswerKey(parentTurn.choiceLabel, parentTurn.supplement);
    const present = pathRecords.some((record) => {
      const turn = record.consultingTurn;
      return Boolean(turn) && consultingAnswerKey(turn.choiceLabel, turn.supplement) === parentKey;
    });
    if (!present) pathRecords.push(parentRecord);
  }
  pathRecords.sort(byTime);
  const adopted = (record: NormalizableReview) => continuedFrom(record) || chainIds.has(record.reviewId);
  const consultingPath = pathRecords.map((record, index) => {
    const keepJudgment = adopted(record);
    return {
      order: index + 1,
      reviewId: record.reviewId,
      choice: record.consultingTurn?.choiceLabel ?? null,
      supplement: record.consultingTurn?.supplement ?? '',
      answeredQuestion: record.consultingTurn?.question ?? '',
      judgment: keepJudgment ? record.judgment : '',
      nextQuestion: keepJudgment ? record.nextQuestion : '',
      assumptions: keepJudgment ? record.assumptions : [],
      risks: keepJudgment ? record.risks : [],
      judgmentStatus: keepJudgment ? ('adopted' as const) : ('unresolved' as const),
    };
  });
  const priorTurns = consultingPath
    .filter((step) => consultingAnswerKey(step.choice, step.supplement) !== currentKey)
    .map((step) => ({
      question: step.answeredQuestion,
      choiceLabel: step.choice,
      supplement: step.supplement,
      judgment: step.judgment,
      nextVerification: '',
      nextQuestion: step.nextQuestion,
    }));
  const priorAnalyses = canonical
    .filter((record) => {
      const turn = record.consultingTurn;
      const key = turn ? consultingAnswerKey(turn.choiceLabel, turn.supplement) : '';
      const unresolvedCurrent = key === currentKey && !adopted(record);
      return record.reviewId !== input.rootId && record.reviewId !== input.parentId && !unresolvedCurrent;
    })
    .map((record) => ({
      reviewId: record.reviewId,
      judgment: record.judgment,
      nextQuestion: record.nextQuestion,
      assumptions: record.assumptions,
      risks: record.risks,
    }));
  return {
    consultingPath,
    experimentRecords: experiments,
    failedCalls: sameInput
      .filter((record) => record.status === 'failed')
      .sort(byTime)
      .map((record) => ({ reviewId: record.reviewId, role: 'failed_call' as const })),
    priorTurns,
    priorAnalyses,
    newFounderInformation: !consultingPath.some((step) => consultingAnswerKey(step.choice, step.supplement) === currentKey),
  };
}

/** Where the founder sentence already lives. Citing it does not move the row. */
export type FounderAnswerCitation = {
  feedbackId: string;
  reviewId: string;
  onThisReview: boolean;
};

export function unverifiedClaimStoredAsFact(claim: string, facts: string[]): boolean {
  const needle = claim.replace(/\s+/g, '');
  if (!needle) return false;
  return facts.some((fact) => fact.replace(/\s+/g, '').includes(needle));
}

/** Same sentence, or another wording of the partnership-plan question. */
export function questionRepeatsPrior(previous: string[], next: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, '').replace(/[.?？!]/g, '');
  const nextCompact = compact(next);
  if (!nextCompact) return false;
  if (previous.some((item) => compact(item) === nextCompact)) return true;
  const partnershipPlan = (value: string) =>
    /파트너십|협력/.test(value) && /계획|방식|구축|어떻게|구체적|구체화|방안|다음 단계|방법/.test(value);
  return partnershipPlan(next) && previous.some(partnershipPlan);
}

/** A plan question asks for a method. A fact question asks what already exists. */
export function questionAsksForPlan(question: string): boolean {
  return /계획|어떻게|어떤 방식|구축|다음 단계|방안|구체화|방법/.test(question);
}

export type QuestionVerificationStage =
  | 'plan'
  | 'past_contact'
  | 'named_target_and_path'
  | 'candidate_name'
  | 'candidate_criteria'
  | 'willingness'
  | 'terms'
  | 'other';

/** What a question is trying to verify. A search criterion stays ahead of a generic plan. */
export function questionVerificationStage(question: string): QuestionVerificationStage {
  if (/기준|선별|후보군/.test(question) && /양조장|체험|접근|후보/.test(question)) return 'candidate_criteria';
  if (questionAsksForPlan(question)) return 'plan';
  if (/떠오르는/.test(question) && /이름/.test(question) && !/담당|경로/.test(question)) return 'candidate_name';
  if (/정했|골랐|한 곳/.test(question) && /이름/.test(question) && /담당|경로|연락/.test(question)) return 'named_target_and_path';
  if (/역할|비용|수익 배분|운영 책임/.test(question)) return 'terms';
  if (
    /연락|미팅|만나|접촉/.test(question) &&
    /한 적|했나|있나요|받았|답변/.test(question) &&
    !/정했|골랐|이름|담당|경로/.test(question)
  ) {
    return 'past_contact';
  }
  if (/반응|협력 의사|의향/.test(question)) return 'willingness';
  return 'other';
}

const NAMED_TARGET_QUESTION =
  '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
const NAMED_TARGET_VERIFICATION =
  '우선 접촉 대상 양조장 선정 여부와 실제 연락 가능한 담당자 또는 연락 경로 확인';
const NAMED_TARGET_REASON =
  '실제 접촉 전 단계에서 협력 가능성을 검증할 구체적인 대상 양조장이 선정되었는지, 해당 대상에 접근할 현실적인 연락 경로가 있는지 확인하기 위한 것이다.';
const CANDIDATE_NAME_QUESTION =
  '후보 선정을 시작하면서 가장 먼저 떠오르는 양조장 이름이 있나요? 있으면 그 이름만 알려 주세요. 없으면 아직 떠오른 곳이 없다고 적어 주세요.';
const CANDIDATE_NAME_VERIFICATION = '가장 먼저 떠오르는 양조장 후보의 이름 유무 확인';
const CANDIDATE_NAME_REASON =
  '협력 방안을 우선하기로 한 다음, 떠오르는 양조장 후보의 이름이 있는지를 확인하기 위한 것이다.';
const CANDIDATE_CRITERIA_RULE = '이 문장을 질문으로 출력하지 않는다.';
const CANDIDATE_CRITERIA_VERIFICATION = '체험이 가능한 양조장을 가려낼 기준 또는 접근 가능한 후보군 확인';
const CANDIDATE_CRITERIA_REASON =
  '이름이 아직 없다는 선택은 협력이 불가능하다는 뜻이 아니므로, 후보를 찾을 기준이나 접근 가능한 후보군을 다음으로 확인하기 위한 것이다.';
const CANDIDATE_CRITERIA_CHOICES = ['체험 양조장을 가릴 기준이 있다', '아직 접근 가능한 후보군이 없다'];

/**
 * The next fact to ask from the answer and the stages already used.
 * A likelihood with no named brewery stays on the target-and-path step.
 */
export function nextFactToAsk(input: { supplement: string; previousQuestions: string[]; choiceLabel?: string | null }): {
  priorStages: QuestionVerificationStage[];
  answerHasNamedTarget: boolean;
  answerHasContactResult: boolean;
  nextPurpose: 'named_target_and_path' | 'candidate_name' | 'candidate_criteria' | 'past_contact' | 'willingness' | 'terms';
  factToAsk: string;
  verificationText: string;
  reasonText: string;
  choiceTexts: string[];
  askOneOf: string | null;
} {
  const supplement = input.supplement.trim();
  const answerHasContactResult = /연락했|미팅했|만났|회신|반응을 받/.test(supplement);
  const answerHasNamedTarget = /담당자|연락처|양조장 이름/.test(supplement);
  const priorStages = [...new Set(input.previousQuestions.map(questionVerificationStage))];
  if (answerHasContactResult && /긍정|하겠다|가능하다고 했|협력하겠/.test(supplement)) {
    return {
      priorStages,
      answerHasNamedTarget,
      answerHasContactResult,
      nextPurpose: 'terms',
      factToAsk: '상대와 역할, 비용, 수익 배분, 운영 책임 중 정해진 항목을 알려주세요.',
      verificationText: '역할, 비용, 수익 배분, 운영 책임 중 정해진 항목 확인',
      reasonText: '상대의 긍정 반응 다음으로 역할, 비용, 수익 배분, 운영 책임 중 정해진 항목을 확인하기 위한 것이다.',
      choiceTexts: ['역할과 비용이 정해졌다', '아직 역할과 비용이 없다'],
      askOneOf: null,
    };
  }
  if (answerHasContactResult) {
    return {
      priorStages,
      answerHasNamedTarget,
      answerHasContactResult,
      nextPurpose: 'willingness',
      factToAsk: '접촉한 양조장의 반응과 후속 협의 일정을 알려주세요.',
      verificationText: '접촉한 양조장의 반응과 후속 협의 일정 확인',
      reasonText: '이미 접촉한 양조장의 반응과 후속 협의 일정을 확인하기 위한 것이다.',
      choiceTexts: ['상대의 반응을 들었다', '아직 반응이 없다'],
      askOneOf: null,
    };
  }
  if (answerHasNamedTarget) {
    return {
      priorStages,
      answerHasNamedTarget,
      answerHasContactResult,
      nextPurpose: 'past_contact',
      factToAsk: '그 양조장에 실제로 연락하거나 미팅했나요? 했다면 상대의 반응을 알려주세요.',
      verificationText: '선정한 양조장에 실제 연락하거나 미팅했는지와 상대 반응 확인',
      reasonText: '이미 정한 양조장에 연락하거나 미팅했는지와 상대의 반응을 확인하기 위한 것이다.',
      choiceTexts: ['그 양조장에 연락했다', '아직 연락하지 않았다'],
      askOneOf: null,
    };
  }
  const choiceLabel = input.choiceLabel ?? '';
  const askedCandidateName = input.previousQuestions.some((question) => questionVerificationStage(question) === 'candidate_name');
  const noCandidateYet = /아직 떠오르는 양조장|떠오르는 양조장이 없다/.test(choiceLabel);
  if (askedCandidateName && noCandidateYet) {
    return {
      priorStages,
      answerHasNamedTarget,
      answerHasContactResult,
      nextPurpose: 'candidate_criteria',
      factToAsk: CANDIDATE_CRITERIA_RULE,
      verificationText: CANDIDATE_CRITERIA_VERIFICATION,
      reasonText: CANDIDATE_CRITERIA_REASON,
      choiceTexts: [...CANDIDATE_CRITERIA_CHOICES],
      askOneOf: '체험이 가능한 양조장을 찾는 기준, 또는 지금 접근 가능한 후보군',
    };
  }
  const askedNamedTarget = input.previousQuestions.some((question) => questionVerificationStage(question) === 'named_target_and_path');
  const intendsSelection = /선정|확보|우선/.test(supplement);
  const cooperationChoice = /협력 방안|구체화/.test(input.choiceLabel ?? '');
  if (askedNamedTarget && intendsSelection && cooperationChoice) {
    return {
      priorStages,
      answerHasNamedTarget,
      answerHasContactResult,
      nextPurpose: 'candidate_name',
      factToAsk: CANDIDATE_NAME_QUESTION,
      verificationText: CANDIDATE_NAME_VERIFICATION,
      reasonText: CANDIDATE_NAME_REASON,
      choiceTexts: ['떠오르는 양조장 이름이 있다', '아직 떠오르는 양조장이 없다'],
      askOneOf: null,
    };
  }
  return {
    priorStages,
    answerHasNamedTarget,
    answerHasContactResult,
    nextPurpose: 'named_target_and_path',
    factToAsk: NAMED_TARGET_QUESTION,
    verificationText: NAMED_TARGET_VERIFICATION,
    reasonText: NAMED_TARGET_REASON,
    choiceTexts: ['이름과 연락 경로를 적을 수 있다', '아직 정한 양조장이 없다'],
    askOneOf: null,
  };
}

/** Purpose text for a verification field. A plan label or a past-contact label stays on that stage. */
export function purposeStage(text: string): QuestionVerificationStage {
  if (/기준|선별|후보군/.test(text) && /양조장|체험|접근|후보/.test(text)) return 'candidate_criteria';
  if (/파트너십 구축|구축 계획|실행 계획/.test(text)) return 'plan';
  if (/떠오르는 양조장/.test(text) && /이름/.test(text)) return 'candidate_name';
  if (/접촉 여부|만났는지|미팅했는지|연락했는지/.test(text) && !/접촉 전|선정|연락 경로|담당/.test(text)) {
    return 'past_contact';
  }
  if (/선정|정했|한 곳/.test(text) && /경로|담당/.test(text)) return 'named_target_and_path';
  return questionVerificationStage(text);
}

/** The question, the verification line, and the reason name the same stage. */
export function verificationPurposeAligns(input: {
  nextQuestion: string;
  nextVerification: string;
  nextQuestionReason: string;
}): boolean {
  const question = questionVerificationStage(input.nextQuestion);
  const verification = purposeStage(input.nextVerification);
  const reason = purposeStage(input.nextQuestionReason);
  return question !== 'other' && question !== 'plan' && question === verification && question === reason;
}

/**
 * The judgment names a limit or a reason and does not treat an unverified claim as a current gain.
 * Keeping, raising, or lowering the judgment is left to the model.
 */
export function judgmentIsConsistent(input: {
  judgment: string;
  assumptions?: string[];
  evidenceToChange?: string[];
}): boolean {
  const around = [input.judgment, ...(input.assumptions ?? []), ...(input.evidenceToChange ?? [])].join('\n');
  const explained = /부족|확인되지|미확인|없다|이유|때문|근거/.test(around);
  const currentEffect = /긍정적 영향을 미|사업성이 높아졌|긍정적으로 바뀌/.test(input.judgment);
  return input.judgment.trim().length > 0 && explained && !currentEffect;
}

/**
 * The high-likelihood wording is used as the current state.
 * Naming it as the founder's claim or an unverified hypothesis is not that use.
 * A later "확인되지" about contact does not relabel the claim.
 */
export function founderClaimTreatedAsFact(text: string): boolean {
  if (!/협력 가능성이 높/.test(text)) return false;
  const labeled =
    /협력 가능성이 높다는\s*(주장|가설|기대)/.test(text) ||
    /협력 가능성이 높다고/.test(text) ||
    /검증되지 않은 가설/.test(text);
  return !labeled;
}

/** A stored likelihood claim is missing from the judgment, or is not marked as a hypothesis. */
export function claimLeftUnlabeled(judgment: string, founderClaims: string[]): boolean {
  if (!founderClaims.some((item) => /협력 가능성이 높/.test(item))) return false;
  return !(
    /협력 가능성이 높다는\s*(주장|가설|기대)/.test(judgment) ||
    /협력 가능성이 높다고/.test(judgment) ||
    /검증되지 않은 가설/.test(judgment)
  );
}

/** Inferences call the claim unverified, while the judgment still uses it as a premise. */
export function judgmentContradictsUnverifiedClaim(judgment: string, inferences: string[]): boolean {
  const inferenceText = inferences.join('\n');
  const inferenceUnverified = /주장/.test(inferenceText) && /검증되지|확인되지|미확인/.test(inferenceText);
  return inferenceUnverified && founderClaimTreatedAsFact(judgment);
}

/** The assumption states that an unverified hypothesis will have a positive effect. */
export function assumptionRestatesUnverifiedHope(assumptions: string[]): boolean {
  return assumptions.some((item) => {
    const assertsEffect = /긍정적 영향을 미칠|사업성이 높아질|긍정적인 영향을 미칠/.test(item);
    if (!assertsEffect) return false;
    const effectUnverified =
      /(영향|효과).{0,24}(확인되지|미확인|검증되지|단정하지)|(확인되지|미확인|검증되지).{0,24}(영향|효과)/.test(item);
    return !effectUnverified;
  });
}

/** The stored answer says no brewery candidate is selected yet. */
export function answerSaysNoCandidate(text: string): boolean {
  return /아직 떠오르는 양조장|떠오르는 양조장이 없다|선정하지 못|후보가 없|구체적인 후보가 없/.test(text);
}

export type EvidenceLedger = {
  newFounderInformation: boolean;
  unresolvedStillApplies: boolean;
  verifiedFacts: string[];
  founderClaims: string[];
  unresolved: string[];
  priorGoals: string[];
  stillUnknown: string[];
};

function uniqueTexts(values: string[]): string[] {
  return values.filter((value, index, all) => value.trim().length > 0 && all.indexOf(value) === index);
}

/** Classifies stored answers. It does not decide the business judgment. */
export function buildEvidenceLedger(input: {
  consultingPath?: ConsultingPathStep[];
  newFounderInformation?: boolean;
  founderChoice?: string | null;
  founderSupplement?: string;
}): EvidenceLedger {
  const path = input.consultingPath ?? [];
  const current = `${input.founderChoice ?? ''} ${input.founderSupplement ?? ''}`;
  const unresolved = uniqueTexts([
    ...path
      .filter((step) => step.judgmentStatus === 'unresolved' || answerSaysNoCandidate(`${step.choice ?? ''} ${step.supplement}`))
      .map((step) => step.supplement),
    ...(answerSaysNoCandidate(current) ? [input.founderSupplement ?? ''] : []),
  ]);
  const joined = path.map((step) => `${step.supplement} ${step.judgment}`).join('\n');
  return {
    newFounderInformation: input.newFounderInformation ?? true,
    unresolvedStillApplies: unresolved.length > 0,
    verifiedFacts: [],
    founderClaims: uniqueTexts(path.filter((step) => /가능성이 높/.test(step.supplement)).map((step) => step.supplement)),
    unresolved,
    priorGoals: uniqueTexts(
      path
        .filter((step) => step.judgmentStatus === 'adopted' && /우선 검증|구체화/.test(`${step.choice ?? ''} ${step.supplement}`))
        .flatMap((step) => [step.choice ?? '', step.supplement]),
    ),
    stillUnknown: [
      /만나|미팅|연락했|계약|입금/.test(joined) ? '' : '실제 접촉',
      /협력 의사가 있|의향이 있/.test(joined) ? '' : '상대의 협력 의사',
      /조건에 합의|배분에 합의/.test(joined) ? '' : '협력 조건',
    ].filter((item) => item.length > 0),
  };
}

/**
 * An unresolved candidate gap is still present in the judgment.
 * Naming a selection criterion is not the same as saying no candidate is selected.
 */
export function judgmentAccountsForUnresolved(judgment: string, unresolved: string[]): boolean {
  if (!unresolved.some(answerSaysNoCandidate)) return judgment.trim().length > 0;
  return /후보/.test(judgment) && /없|못|비어|선정되지|선정하지/.test(judgment);
}

/** The next verification treats an unverified step as a gain. */
export function verificationAssertsUngroundedGain(text: string): boolean {
  if (!/가능성을 높|긍정적 영향을 미칠|사업성이 높아|긍정적인 영향/.test(text)) return false;
  return !/확인되지|미확인|검증되지|단정하지/.test(text);
}

/** The verification is still the criterion step the founder already answered. */
export function verificationStaysOnAnsweredCriterion(nextVerification: string): boolean {
  const targets = questionVerificationTargets(nextVerification).filter((target) => target !== 'selection');
  const forward = targets.filter((target) => target !== 'criteria');
  return /기준/.test(nextVerification) && forward.length === 0;
}

/** The next verification repeats a goal the founder already chose. */
export function verificationRepeatsPriorGoal(nextVerification: string, priorGoals: string[]): boolean {
  const compact = (value: string) => value.replace(/\s+/g, '');
  const next = compact(nextVerification);
  return priorGoals.some((goal) => {
    const prior = compact(goal);
    return prior.length > 8 && (next === prior || next.includes(prior) || prior.includes(next));
  });
}

/** Inferences still state the claim as the current likelihood, or skip a known candidate gap. */
export function inferenceMissesClaimBoundary(inferences: string[], unresolved: string[]): boolean {
  if (inferences.some((item) => founderClaimTreatedAsFact(item))) return true;
  if (!unresolved.some(answerSaysNoCandidate)) return false;
  const text = inferences.join('\n');
  return !(/후보/.test(text) && /없|못|선정|증거|확인되지|미확인/.test(text));
}

/**
 * The question and the verification name the same next step.
 * Selection is the step the founder already answered.
 */
export function nextStepMatchesQuestion(nextVerification: string, nextQuestion: string): boolean {
  const question = questionVerificationTargets(nextQuestion).filter((target) => target !== 'selection');
  if (question.length !== 1) return false;
  return questionVerificationTargets(nextVerification).includes(question[0]);
}

/** Structural reading failures. These do not choose the business judgment. */
export function productReadingIssues(input: {
  judgment: string;
  summary: string;
  assumptions: string[];
  inferences: string[];
  nextVerification: string;
  nextQuestion: string;
  unresolved: string[];
  priorGoals: string[];
  founderClaims?: string[];
  founderFacts?: string[];
  founderSupplement?: string;
  answeredQuestion?: string;
  answeredVerification?: string;
}): string[] {
  const issues: string[] = [];
  if (founderClaimTreatedAsFact(input.judgment)) issues.push('claim_used_as_premise');
  if (founderClaimTreatedAsFact(input.summary)) issues.push('claim_in_summary');
  if (claimLeftUnlabeled(input.judgment, input.founderClaims ?? [])) issues.push('claim_not_labeled');
  if (inferenceMissesClaimBoundary(input.inferences, input.unresolved)) issues.push('inference_misses_boundary');
  if (assumptionRestatesUnverifiedHope(input.assumptions)) issues.push('assumption_asserts_positive_effect');
  if (!judgmentAccountsForUnresolved(input.judgment, input.unresolved)) issues.push('unresolved_gap_missing');
  if (verificationRepeatsPriorGoal(input.nextVerification, input.priorGoals)) issues.push('prior_goal_repeated');
  if (input.priorGoals.length > 0 && !nextStepMatchesQuestion(input.nextVerification, input.nextQuestion)) {
    issues.push('verification_question_mismatch');
  }
  if (verificationAssertsUngroundedGain(input.nextVerification)) issues.push('verification_asserts_positive_effect');
  if (criterionAnswer(input.founderSupplement ?? '') && verificationStaysOnAnsweredCriterion(input.nextVerification)) {
    issues.push('answered_criterion_still_open');
  }
  if (
    input.unresolved.some(answerSaysNoCandidate) &&
    (questionRepeatsAnsweredSelection(input.nextQuestion) || questionRepeatsAnsweredSelection(input.nextVerification))
  ) {
    issues.push('selection_question_repeated');
  }
  if (criterionAnswer(input.founderSupplement ?? '')) {
    const reviewed = `${input.judgment}\n${input.inferences.join('\n')}`;
    if (!/체험/.test(reviewed)) issues.push('new_answer_missing');
    if (!/계획|선택|고르겠|정하겠/.test(input.judgment)) issues.push('answer_not_classified');
    if (/구체화되었|구체화했/.test(`${input.judgment}\n${input.summary}`) && !/체험/.test(reviewed)) {
      issues.push('answer_collapsed_to_choice');
    }
    const answered = input.answeredQuestion ?? '';
    const repeatsAnswered =
      (answered.length > 0 && questionRepeatsPrior([answered], input.nextQuestion)) ||
      questionVerificationStage(input.nextQuestion) === 'candidate_criteria' ||
      questionVerificationTargets(input.nextQuestion).includes('criteria');
    if (repeatsAnswered) issues.push('answered_question_repeated');
    if (unverifiedClaimStoredAsFact(input.founderSupplement ?? '', input.founderFacts ?? [])) issues.push('answer_promoted_to_fact');
    if (!/유지|바꾸|낮|높이|유보|이유|때문|영향|근거/.test(`${input.judgment}\n${input.summary}`)) {
      issues.push('judgment_reason_missing');
    }
    if (
      input.answeredVerification &&
      verificationRepeatsPriorGoal(input.nextVerification, [input.answeredVerification])
    ) {
      issues.push('answered_verification_repeated');
    }
  }
  return issues;
}

/** A founder answer that names a selection criterion and still has no brewery. */
export function criterionAnswer(supplement: string): boolean {
  return /기준/.test(supplement) && /체험/.test(supplement) && /정하지 못|아직/.test(supplement);
}

/** Names the failed reading checks. It does not supply a replacement judgment. */
export function productReadingRepairMessage(issues: string[], context?: { supplement?: string }): string {
  const lines = [
    '이전 JSON은 구조 검증에 걸렸다.',
    `실패 코드: ${issues.join(',')}.`,
    'judgment에 이미 있는 검증되지 않은 가설, 체험, 후보가 선정되지 않았다는 미해결은 지우지 않는다.',
    '협력 가능성이 높다는 주장은 검증되지 않은 가설로 judgment 안에 남긴다.',
  ];
  if (issues.includes('new_answer_missing') || issues.includes('answer_collapsed_to_choice') || issues.includes('answer_not_classified')) {
    const supplement = context?.supplement?.trim();
    lines.push(
      supplement
        ? `judgment에 체험이 없다. 기준이 구체화되었다로 이번 답을 바꾸지 마라. 선택 라벨이 아니라 다음 문장을 계획 또는 선택으로 적어라. ${supplement}`
        : 'judgment에 체험이 없다. 기준이 구체화되었다로 이번 답을 바꾸지 마라. supplement의 체험을 계획 또는 선택으로 적어라.',
    );
  }
  if (issues.includes('selection_question_repeated')) {
    lines.push('이미 후보가 없다. 이름, 선정했는지, 정했는지를 nextQuestion과 nextVerification에 다시 넣지 마라. 접근 경로, 협력 의사, 협력 조건 중 하나만 물어라.');
  }
  const verificationOnly = issues.every((code) =>
    [
      'verification_question_mismatch',
      'answered_criterion_still_open',
      'verification_asserts_positive_effect',
      'prior_goal_repeated',
      'answered_verification_repeated',
    ].includes(code),
  );
  if (verificationOnly && issues.length > 0) {
    lines.push('judgment, summary, assumptions, inferences는 그대로 둔다. nextVerification만 nextQuestion과 같은 대상 하나로 다시 쓴다.');
  }
  lines.push('사업성을 유지할지 바꿀지, 긍정인지 부정인지는 네가 근거로 다시 정한다. 대체 문장을 받지 않는다.');
  lines.push('같은 문장을 다시 내면 실패다.');
  if (issues.includes('product_reading_unparsed')) lines.push('JSON 스키마의 키를 모두 채워라.');
  if (issues.includes('claim_used_as_premise') || issues.includes('claim_in_summary') || issues.includes('claim_not_labeled') || issues.includes('inference_misses_boundary')) {
    lines.push(
      'summary에 협력 가능성이 높지만을 넣지 않는다. summary는 judgment와 같은 결론이다. judgment에는 Founder의 협력 가능성 문장을 검증되지 않은 가설로 적는다. 현재 전제로 쓰지 않는다. inferences는 후보 부재와 확인되지 않은 근거에서 도출한다.',
    );
  }
  if (issues.includes('assumption_asserts_positive_effect')) {
    lines.push('assumptions에서 긍정적 영향을 미칠 것이다라고 단정하지 않는다. 가설이 성립하는지도, 성립할 때의 영향도 확인되지 않았다고 적는다.');
  }
  if (issues.includes('unresolved_gap_missing') || criterionAnswer(context?.supplement ?? '')) {
    lines.push('judgment에 후보가 아직 선정되지 않았다는 미해결을 계획과 따로 적는다. 고르겠다는 문장만으로는 미해결이 아니다.');
  }
  if (issues.includes('prior_goal_repeated')) {
    lines.push('nextVerification에 이미 선택한 상위 목표 문장을 다시 넣지 않는다. 그 목표 아래의 다음 한 단계만 적는다.');
  }
  if (
    issues.includes('verification_question_mismatch') ||
    issues.includes('answered_criterion_still_open') ||
    issues.includes('verification_asserts_positive_effect') ||
    issues.includes('answered_question_repeated') ||
    criterionAnswer(context?.supplement ?? '')
  ) {
    lines.push('nextVerification은 nextQuestion과 같은 대상 하나만 적는다. 이번 답이 이미 기준이면 기준 확인을 다시 적지 않는다. 접근 경로, 협력 의사, 협력 조건 중 하나만 고른다.');
    lines.push('기준을 확인하면 협력 가능성이 높아진다고 적지 않는다. 그 효과는 확인되지 않았다.');
  }
  if (issues.includes('new_answer_missing') || issues.includes('answer_promoted_to_fact') || issues.includes('judgment_reason_missing')) {
    const supplement = context?.supplement?.trim();
    lines.push(
      supplement
        ? `이번 Founder 답은 다음 문장이다. ${supplement} 이 문장을 확인된 사실로 올리지 말고 judgment에 계획 또는 선택으로 반영한다. 후보 부재는 남긴다. 유지하거나 바꾸거나 유보한 이유를 적는다.`
        : '이번 답의 체험 기준을 judgment에 계획 또는 선택으로 적는다. 확인된 사실로 올리지 않는다. 후보 부재는 남긴다. 유지하거나 바꾸거나 유보한 이유를 적는다.',
    );
  }
  if (issues.includes('answered_question_repeated') || issues.includes('answered_verification_repeated')) {
    lines.push('방금 답한 기준 질문을 다시 묻지 않는다. 다음 질문에는 기준을 넣지 않는다. 접근 경로, 협력 의사, 협력 조건 중 하나만 묻는다.');
  }
  lines.push('JSON만 반환한다.');
  return lines.join(' ');
}

export type FollowThroughQuality = {
  understandsAnswer: boolean;
  separatesClaim: boolean;
  classifiesChoice: boolean;
  keepsUnresolved: boolean;
  reReviews: boolean;
  explainsDirection: boolean;
  doesNotRepeatQuestion: boolean;
  newStep: boolean;
};

/** Scores one reply. It does not choose whether the judgment stays or changes. */
export function followThroughQuality(input: {
  judgment: string;
  summary: string;
  inferences: string[];
  assumptions: string[];
  founderFacts: string[];
  nextVerification: string;
  nextQuestion: string;
  supplement: string;
  answeredQuestion: string;
  answeredVerification: string;
  unresolved: string[];
  priorGoals: string[];
  founderClaims: string[];
  priorJudgment: string;
}): FollowThroughQuality {
  const reviewed = `${input.judgment}\n${input.inferences.join('\n')}`;
  const targets = questionVerificationTargets(input.nextQuestion).filter((target) => target !== 'selection');
  return {
    understandsAnswer: /체험/.test(reviewed) && /기준/.test(reviewed),
    separatesClaim:
      !founderClaimTreatedAsFact(input.judgment) &&
      !founderClaimTreatedAsFact(input.summary) &&
      !claimLeftUnlabeled(input.judgment, input.founderClaims),
    classifiesChoice:
      (criterionAnswer(input.supplement) ? /계획|선택|고르겠|정하겠/.test(input.judgment) : /계획|선택|기준/.test(reviewed)) &&
      !unverifiedClaimStoredAsFact(input.supplement, input.founderFacts) &&
      !assumptionRestatesUnverifiedHope(input.assumptions),
    keepsUnresolved: judgmentAccountsForUnresolved(input.judgment, input.unresolved),
    reReviews: input.judgment.replace(/\s+/g, '') !== input.priorJudgment.replace(/\s+/g, ''),
    explainsDirection: /유지|바꾸|낮|높이|유보|이유|때문|영향|근거/.test(`${input.judgment}\n${input.summary}`),
    doesNotRepeatQuestion:
      !questionRepeatsPrior([input.answeredQuestion], input.nextQuestion) &&
      questionVerificationStage(input.nextQuestion) !== 'candidate_criteria' &&
      !questionVerificationTargets(input.nextQuestion).includes('criteria') &&
      !questionRepeatsAnsweredSelection(input.nextQuestion),
    newStep:
      targets.length === 1 &&
      nextStepMatchesQuestion(input.nextVerification, input.nextQuestion) &&
      !verificationRepeatsPriorGoal(input.nextVerification, input.priorGoals) &&
      !verificationRepeatsPriorGoal(input.nextVerification, [input.answeredVerification]) &&
      !verificationAssertsUngroundedGain(input.nextVerification) &&
      !(criterionAnswer(input.supplement) && verificationStaysOnAnsweredCriterion(input.nextVerification)),
  };
}

export type FollowThroughCoverage = {
  originalInput: boolean;
  firstJudgment: boolean;
  adoptedJudgments: boolean;
  priorFounderAnswers: boolean;
  currentGoal: boolean;
  askedQuestion: boolean;
  thisAnswer: boolean;
  unresolved: boolean;
};

/** Whether the product request carries the stored consulting history and this answer. */
export function followThroughRequestCoverage(payload: Record<string, unknown>): FollowThroughCoverage {
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const first = payload.firstAnalysis;
  const firstRecord = first && typeof first === 'object' && !Array.isArray(first) ? (first as Record<string, unknown>) : null;
  const path = Array.isArray(payload.consultingPath) ? payload.consultingPath : [];
  const answers = Array.isArray(payload.founderAnswers) ? payload.founderAnswers : [];
  const ledger = payload.evidenceLedger;
  const ledgerRecord = ledger && typeof ledger === 'object' && !Array.isArray(ledger) ? (ledger as Record<string, unknown>) : null;
  const goals = Array.isArray(ledgerRecord?.priorGoals) ? ledgerRecord.priorGoals.map(String) : [];
  const questions = Array.isArray(payload.priorQuestionTexts) ? payload.priorQuestionTexts.map(String) : [];
  const doNotCopy = payload.doNotCopy;
  const copyRecord = doNotCopy && typeof doNotCopy === 'object' && !Array.isArray(doNotCopy) ? (doNotCopy as Record<string, unknown>) : null;
  const choice = payload.founderChoice;
  const choiceRecord = choice && typeof choice === 'object' && !Array.isArray(choice) ? (choice as Record<string, unknown>) : null;
  const unresolved = Array.isArray(ledgerRecord?.unresolved) ? ledgerRecord.unresolved.map(String) : [];
  return {
    originalInput: text(payload.originalInput) && String(payload.originalInput).includes('양조장'),
    firstJudgment: text(firstRecord?.priorJudgmentText),
    adoptedJudgments: path.some((step) => {
      const row = step as Record<string, unknown>;
      return row.judgmentStatus === 'adopted' && text(row.priorJudgmentText);
    }),
    priorFounderAnswers: answers.some((item) => String((item as { supplement?: string }).supplement ?? '').includes('선정하지 못했다')),
    currentGoal: goals.some((goal) => /우선 검증|구체화/.test(goal)),
    askedQuestion: questions.some((question) => question.includes('기준')) || String(copyRecord?.priorQuestionText ?? '').includes('기준'),
    thisAnswer: text(choiceRecord?.label) && text(payload.founderSupplement),
    unresolved: unresolved.some((item) => answerSaysNoCandidate(item)),
  };
}

/** The question asks again whether a brewery candidate has already been chosen. */
export function questionRepeatsAnsweredSelection(question: string): boolean {
  return /정했|골랐|선정했|한 곳|떠오르는|이름이 있/.test(question) && /양조장|후보|이름/.test(question);
}

/** One open gap. Selection is the gap the founder already closed. */
export function questionVerificationTargets(question: string): Array<'criteria' | 'access' | 'willingness' | 'terms' | 'selection'> {
  const targets: Array<'criteria' | 'access' | 'willingness' | 'terms' | 'selection'> = [];
  if (/기준/.test(question)) targets.push('criteria');
  if (/경로|접근|닿/.test(question)) targets.push('access');
  if (/의사|의향/.test(question)) targets.push('willingness');
  if (/조건|비용|배분/.test(question)) targets.push('terms');
  if (questionRepeatsAnsweredSelection(question)) targets.push('selection');
  return targets;
}

/** A kept judgment may call the answer a hypothesis. It may not call it a current positive effect. */
export function judgmentSeparatesPotential(judgment: string): boolean {
  const keeps = /유지/.test(judgment);
  const hypothesis = /가설/.test(judgment);
  const unconfirmed = /확인되지|증거가 없|미확인/.test(judgment);
  const currentEffect = /긍정적 영향을 미|사업성이 높아졌|긍정적으로 바뀌/.test(judgment);
  return keeps && hypothesis && unconfirmed && !currentEffect;
}

/**
 * A past-contact question and a reword of that stage are the same verification step.
 * Choosing whom to contact, or whether they can be reached, is the next step.
 */
export function questionSameContactStage(previous: string[], next: string): boolean {
  const pastContact = (value: string) =>
    /연락|미팅|만나|접촉/.test(value) &&
    /한 적|했나|있나요|받았|반응|답변/.test(value) &&
    !/골랐|선정|경로|닿|접근/.test(value);
  return pastContact(next) && previous.some(pastContact);
}

/**
 * Prior succeeded analyses of the same input, excluding the root and the current parent.
 * Same-answer retries are experiments. They are not extra consulting turns.
 * The citation points at the stored feedback row and does not copy it onto this parent.
 */
export function assembleConsultingHistory(input: {
  records: StoredReview[];
  parent: StoredReview;
  supplement: string;
  feedback: StoredFeedback[];
}): {
  root: StoredReview;
  priorTurns: ConsultingTurn[];
  priorAnalyses: PriorAnalysisBrief[];
  consultingPath: ConsultingPathStep[];
  experimentRecords: ExperimentRecord[];
  failedCalls: FailedCallRecord[];
  newFounderInformation: boolean;
  previousQuestions: string[];
  founderAnswerSource: FounderAnswerCitation | null;
} {
  const chain = reviewChain(input.records, input.parent);
  const root = chain[0] ?? input.parent;
  const supplement = input.supplement.trim();
  const choice = input.feedback.filter((item) => item.reviewId === input.parent.reviewId).at(-1)?.choiceAnswer?.label ?? null;
  const normalized = normalizeConsultingRecords({
    records: input.records.map((record) => ({
      reviewId: record.reviewId,
      parentReviewId: record.parentReviewId,
      status: record.status,
      inputSha: record.inputSha,
      finishedAt: record.finishedAt,
      version: record.version,
      consultingTurn: record.consultingTurn,
      judgment: record.sections?.analysis?.judgmentDetail || record.sections?.judgment || '',
      nextQuestion: record.sections?.nextQuestion ?? record.consultingTurn?.nextQuestion ?? '',
      assumptions: record.sections?.analysis?.assumptions ?? record.sections?.hypotheses ?? [],
      risks: record.sections?.risks ?? [],
    })),
    rootId: root.reviewId,
    parentId: input.parent.reviewId,
    parentInputSha: input.parent.inputSha,
    chainIds: chain.map((record) => record.reviewId),
    currentChoice: choice,
    currentSupplement: supplement,
  });
  const previousQuestions = [
    root.sections?.nextQuestion ?? '',
    ...normalized.consultingPath.map((step) => step.nextQuestion),
    input.parent.sections?.nextQuestion ?? '',
  ].filter((question, index, all) => question.trim().length > 0 && all.indexOf(question) === index);
  const reviewIds = new Set(input.records.map((record) => record.reviewId));
  const cited = input.feedback.find((item) => {
    if (!reviewIds.has(item.reviewId)) return false;
    const label = item.choiceAnswer?.label.trim() ?? '';
    const comment = item.comment.trim();
    return (label.length > 0 && label === supplement) || (comment.length > 0 && comment === supplement);
  });
  return {
    root,
    priorTurns: normalized.priorTurns,
    priorAnalyses: normalized.priorAnalyses,
    consultingPath: normalized.consultingPath,
    experimentRecords: normalized.experimentRecords,
    failedCalls: normalized.failedCalls,
    newFounderInformation: normalized.newFounderInformation,
    previousQuestions,
    founderAnswerSource: cited
      ? { feedbackId: cited.feedbackId, reviewId: cited.reviewId, onThisReview: cited.reviewId === input.parent.reviewId }
      : null,
  };
}

function compactConsultingAnalysis(sections: ReviewSections): {
  summary: string;
  judgment: string;
  assumptions: string[];
  nextVerification: string;
  nextQuestion: string;
} {
  return {
    summary: sections.analysis?.summary ?? sections.judgment,
    judgment: sections.analysis?.judgmentDetail ?? sections.judgment,
    assumptions: sections.analysis?.assumptions ?? sections.hypotheses,
    nextVerification: sections.analysis?.nextVerification ?? '',
    nextQuestion: sections.nextQuestion,
  };
}

function productReanalysisSchema(): Record<string, unknown> {
  const text = { type: 'string' };
  const list = { type: 'array', items: { type: 'string' } };
  return {
    title: 'product_reanalysis',
    type: 'object',
    additionalProperties: false,
    required: [
      'summary',
      'customer',
      'problem',
      'value',
      'operatingModel',
      'alternatives',
      'differentiation',
      'payer',
      'revenueModel',
      'market',
      'competition',
      'operations',
      'profitability',
      'strengths',
      'risks',
      'assumptions',
      'evidenceToChange',
      'founderFacts',
      'inferences',
      'judgment',
      'nextVerification',
      'nextQuestion',
      'nextQuestionReason',
      'choices',
    ],
    properties: {
      summary: {
        type: 'string',
        description:
          'judgment와 같은 결론. 협력 가능성이 높지만을 넣지 않는다. 협력 가능성이 높다를 쓰려면 검증되지 않은 가설이라고 같은 문장에 적는다.',
      },
      customer: text,
      problem: text,
      value: text,
      operatingModel: text,
      alternatives: text,
      differentiation: text,
      payer: text,
      revenueModel: text,
      market: text,
      competition: text,
      operations: text,
      profitability: text,
      strengths: list,
      risks: { ...list, description: '이번 답의 빈칸을 새 문장으로 적는다. 접촉 여부 문장만 반복하면 실패다. 사업이 불가능하다고 단정하지 않는다.' },
      assumptions: {
        ...list,
        description:
          '가설이 성립하는지도, 그 영향도 확인되지 않았다고 적는다. 긍정적 영향을 미칠 것이다라고 쓰지 않는다. 만약이라는 말로 긍정 효과를 단정하지 않는다.',
      },
      evidenceToChange: {
        ...list,
        description: '이 판단을 바꾸게 될 확인 항목. judgment와 같은 문장이면 실패다.',
      },
      founderFacts: { ...list, description: '확인된 접촉, 계약, 입금, 예약만. 없으면 빈 배열.' },
      inferences: {
        ...list,
        description:
          '협력 가능성이 높다를 현재 상태로 반복하지 않는다. 후보 부재와 접촉, 협력 의사, 협력 조건이 확인되지 않은 데서 추론한다. 주장을 적으면 검증되지 않은 가설이라고 적는다.',
      },
      judgment: {
        type: 'string',
        description:
          'founderClaims의 협력 가능성 문장은 검증되지 않은 가설로 judgment 안에 적는다. founderSupplement에 체험 기준이 있으면 그 기준을 계획 또는 선택으로 judgment 안에 적는다. 고르겠다는 계획과 별도로, 후보가 아직 선정되지 않았다는 미해결을 같은 judgment에 적는다. 협력 가능성이 높지만을 현재 상태로 쓰지 않는다. unresolved의 후보 부재를 포함한다. 이전 문장을 복사하지 않는다. 유지, 상향, 하향, 유보 중 하나와 이유를 적는다.',
      },
      nextVerification: {
        type: 'string',
        description:
          'priorGoals 문장을 복사하지 않는다. 이번 답이 이미 기준이면 기준 확인을 다시 적지 않는다. nextQuestion과 같은 대상만 적는다. 접근 경로, 협력 의사, 협력 조건 중 하나다. 기준을 확인하면 협력 가능성이 높아진다고 쓰지 않는다. 그 효과는 확인되지 않았다.',
      },
      nextQuestion: {
        type: 'string',
        description:
          '이미 후보가 없다고 답했다. 정했나요, 한 곳, 이름, 떠오르는, 이름이 있는가, 선정했는지를 묻지 않는다. 이번 답이 기준을 골랐으면 기준을 다시 묻지 않는다. 기준이 구체화되었다만 쓰면 실패다. 접근 경로, 협력 의사, 협력 조건 중 하나만 묻는다.',
      },
      nextQuestionReason: {
        type: 'string',
        description: '그 답이 다음 사업성 판단에 왜 필요한지. priorReasonText와 같으면 실패다.',
      },
      choices: { ...list, description: '이번 질문에 답하는 서로 다른 선택 두 개 이상. priorChoices와 같은 문장을 두지 않는다.' },
    },
  };
}

function productReanalysisSystemPrompt(): string {
  return [
    '당신은 초기 창업자의 사업성 검토를 돕는 전략 파트너다.',
    '응답 전에 한 순서로만 분석한다. summary, inferences, assumptions, risks, evidenceToChange, judgment, nextQuestion은 그 하나의 결론을 나눈 것이다. 필드마다 다른 논리를 쓰지 않는다.',
    '순서는 누적 이력, 증거 구분, 사업성 재평가, 최종 판단, 다음 질문이다.',
    'consultingPath는 Founder 답변의 시간 순서다. experimentRecords는 같은 답변을 다시 호출한 기록이다. 재호출을 다음 상담 턴으로 세지 않고, 그 판단을 복사하지 않는다. failedCalls는 실패한 호출이다.',
    'evidenceLedger를 먼저 읽는다. newFounderInformation이 false여도 unresolvedStillApplies가 true면 unresolved를 판단에 넣는다. false는 이번 호출에 새 답이 없다는 뜻이지, 미해결 답을 빼도 된다는 뜻이 아니다.',
    'founderClaims는 확인된 사실이 아니다. verifiedFacts만 확인된 사실이다. stillUnknown은 아직 없는 근거다. 판단을 유지하거나 바꾸거나 유보할 수 있다. 후보 부재가 실행 가능성에 주는 영향을 이유로 적는다. 이전 판단 문장과 같으면 실패다.',
    'nextVerification은 priorGoals의 문장을 다시 쓰지 않는다. 이미 고른 상위 목표를 반복하지 않는다. 그 아래의 다음 한 단계만 적고, nextQuestion과 같은 대상을 새 문장으로 적는다.',
    '이번 답이 체험 기준을 고르는 계획이나 선택이면 그 답을 확인된 사실로 올리지 않는다. judgment에 체험을 계획 또는 선택으로 적고, 그와 별도로 후보가 아직 선정되지 않았다는 미해결을 적는다. 고르겠다는 계획만으로는 미해결이 아니다. 기준이 구체화되었다는 말로 supplement를 바꾸지 않는다. 선택 라벨을 판단으로 쓰지 않는다. 유지하거나 바꾸거나 유보한 이유를 적는다. 그 기준 질문을 다시 내지 않는다. 이름, 선정했는지, 정했는지를 다시 묻지 않는다. nextQuestion과 nextVerification은 같은 대상이다. 다음 질문에는 기준을 넣지 않고, 접근 경로, 협력 의사, 협력 조건 중 아직 없는 하나만 묻는다. 기준을 확인하면 협력 가능성이 높아진다고 쓰지 않는다.',
    '증거 구분에서 구체적인 양조장 후보가 아직 없다는 Founder의 답은 확인된 상태다. 양조장 협력 가능성이 높다는 문장은 Founder의 주장 또는 기대다. 접촉, 협력 의사, 협력 조건, 실제 협력 가능성은 미확인이다. 주장을 했다는 사실과 가능성이 실제로 높다는 결론을 섞지 않는다.',
    '사업성 재평가는 고객과 문제, 가치의 실현, 운영, 파트너십 확보, 수익 구조, 확인된 근거와 불확실성, 이번 답이 기존 판단에 주는 영향을 본다. 유지하거나 높이거나 낮추거나 유보할 수 있다. 점수를 만들지 않는다.',
    'inferences가 주장을 검증되지 않았다고 적으면 judgment와 summary는 그 주장을 현재 가능성으로 쓰지 않는다. summary에 협력 가능성이 높지만을 넣지 않는다. judgment에는 그 문장을 검증되지 않은 가설로 적는다.',
    '사용자 JSON의 priorJudgmentText, priorQuestionText, priorVerificationText, priorReasonText, priorChoices, priorInferences, priorAssumptions, priorEvidenceNotes, priorRisks는 이전 문장이다. 출력의 judgment, nextQuestion, nextVerification, nextQuestionReason, choices, inferences, assumptions, evidenceToChange, risks에 그 문장을 복사하지 않는다.',
    '이번 답을 여섯 가지로 새 문장에 적는다. 새로 알게 된 내용, 근거 수준, 기존 판단에서 영향을 받는 부분, 유지하거나 높이거나 낮춘 판단, 그 이유, 추가 검증이다.',
    '근거 수준은 검증된 사실, Founder의 경험, Founder의 주장 또는 기대, 실행 계획, 추정 및 가정, 근거가 부족한 정보 중 하나다. 확인된 사실, 경험, 추정, 계획을 섞지 않는다.',
    '가능성이 높다처럼 확인 절차가 없는 답은 Founder의 주장 또는 기대이자 자체 판단이다. 구체적 증거가 없으면 검증된 사실이 아니다. inferences는 이번 답만 해석한다. 답 유형, 증거가 있는지, 확인된 사실, 미확인 사항을 적는다. 시장 관심이나 수요를 확인된 사실로 올리지 않는다. 경험이나 실행 결과를 만들지 않는다.',
    '확인되지 않은 협력 가능성, 추정, 기대, 계획은 founderFacts에 넣지 않는다. founderFacts는 접촉, 계약, 입금, 예약처럼 확인된 사실만 담는다. 근거가 없으면 빈 배열이다.',
    'assumptions는 가설이 성립하는지도, 성립할 때의 영향도 확인되지 않았다고 적는다. 긍정적 영향을 미칠 것이다라고 쓰지 않는다. 만약이라는 말로 긍정 효과를 단정하지 않는다. 이전 가정 문장만 반복하면 실패다. 입력에 없는 수치는 만들지 않는다.',
    'evidenceToChange에는 다음에 확인되면 판단을 바꾸게 되는 항목을 적는다. 이번 답이 판단에 어떤 영향을 주는지는 judgment에 적는다. 답 문장만 다시 적으면 실패다. judgment와 같은 문장을 두지 않는다.',
    'judgment는 사업 설명문이 아니다. 문자열이다. 객체로 나누면 실패다. 매 회차 최초 사업 아이디어와 이전 판단과 누적 답변을 다시 읽고 새 문장으로 사업성을 판단한다. priorJudgmentText와 같으면 실패다. 이전 문장을 복사하지 않는다. 이번 답이 판단에 어떤 영향을 주는지 이유를 적는다. 유지하거나 높이거나 낮출 수 있다. 근거가 부족하면 유지할 수 있으나 그 이유를 새 문장으로 적는다. 확인되지 않은 주장을 현재의 긍정적 영향으로 쓰지 않는다. 긍정적 영향을 미칠 것으로 보인다고 쓰지 않는다. 가능성이 높다는 주장을 현재 결론으로 쓰지 않는다. 협력 가능성이 높지만으로 시작하지 않는다. 그 표현을 문장 중간의 현재 상태로도 쓰지 않는다. priorJudgmentText 안의 그 문장도 다시 쓰지 않는다. 그 문장이 필요하면 Founder의 주장이고 검증되지 않은 가설이라고 같은 문장에 적는다. 후보가 아직 없다는 답만으로 사업성이 없다고 쓰지 않는다. 그 답이 실행 경로의 빈칸이면 그 빈칸을 판단에 적는다.',
    'risks는 이번 답의 빈칸을 새 문장으로 적는다. 위험을 매번 늘리지 않는다. 접촉 여부 문장만 반복하면 실패다. 사업이 불가능하다고 단정하지 않는다.',
    'nextQuestion은 이번 사업성 판단을 더 정확하게 만들기 위해 아직 없는 정보 하나를 묻는다. priorQuestionTexts와 같거나 표현만 바꾼 질문이면 실패다. 질문의 검증 대상이 이전 질문과 같아도 실패다. 떠오르는을 쓰지 않는다. verificationStage.alreadyAnswered에 no_named_brewery_candidate가 있으면 후보를 정했는지, 한 곳인지, 이름인지, 떠오르는 곳인지를 다시 묻지 않는다. 기준, 접근 경로, 협력 의사, 협력 조건 가운데 지금 판단에 가장 중요한 하나만 묻는다. 둘을 한 질문에 잇지 않는다. verificationStage.nextPurpose는 이미 다룬 단계다. 그 목적의 질문을 반복하지 않는다. 이미 founderChoice와 founderSupplement와 이전 답에 있는 내용을 다시 묻지 않는다. 연락하거나 미팅한 결과가 없으면 그 결과를 만들지 않는다. 협력 가능성이 높은지를 다시 묻지 않는다.',
    'nextVerification과 nextQuestionReason은 이번 질문이 다음 판단을 어떻게 돕는지 새 문장으로 적는다. priorVerificationText, priorReasonText와 같으면 실패다.',
    'founderChoice와 founderSupplement는 이번 답이다. 양조장을 정했거나 연락한 사실이 아니면 founderFacts에 넣지 않는다. 후보가 없다는 선택은 협력 불가능이 아니다. choices는 이번 질문에 대한 서로 다른 답 두 개 이상이다. priorChoices와 같은 문장을 앞에 두지 않는다.',
    'JSON만 반환한다.',
    '키는 summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices 이다.',
    'choices는 서로 다른 다음 행동 두 개 이상의 문자열 배열이다.',
    '새 답이 없어도 evidenceLedger.unresolved는 판단, 가정, 위험, 다음 검증, 다음 질문에 남는다.',
  ].join(' ');
}

/** Output-shaped keys make the model echo the previous judgment and question. */
function renameEchoKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(renameEchoKeys);
  if (!value || typeof value !== 'object') return value;
  const renamed: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const name =
      key === 'judgment' || key === 'judgmentDetail'
        ? 'priorJudgmentText'
        : key === 'nextQuestion' || key === 'priorQuestion'
          ? 'priorQuestionText'
          : key === 'nextVerification'
            ? 'priorVerificationText'
            : key === 'nextQuestionReason'
              ? 'priorReasonText'
              : key === 'inferences'
            ? 'priorInferences'
            : key === 'assumptions'
              ? 'priorAssumptions'
              : key === 'evidenceToChange'
                ? 'priorEvidenceNotes'
                : key === 'risks'
                  ? 'priorRisks'
                  : key === 'choices'
                    ? 'priorChoices'
                    : key;
    renamed[name] = renameEchoKeys(child);
  }
  return renamed;
}

/**
 * Product reanalysis. The stored shape is the first-review business fields.
 * Reflection decision fields are not required. Oldest analyses drop before founder answers.
 */
/** The model sees which stage is already covered. It does not receive sentences to copy. */
function coveredStage(stage: ReturnType<typeof nextFactToAsk>, answeredText: string): {
  nextPurpose: ReturnType<typeof nextFactToAsk>['nextPurpose'];
  priorStages: QuestionVerificationStage[];
  answerHasNamedTarget: boolean;
  answerHasContactResult: boolean;
  alreadyAnswered: string[];
} {
  return {
    nextPurpose: stage.nextPurpose,
    priorStages: stage.priorStages,
    answerHasNamedTarget: stage.answerHasNamedTarget,
    answerHasContactResult: stage.answerHasContactResult,
    alreadyAnswered: answerSaysNoCandidate(answeredText) ? ['no_named_brewery_candidate'] : [],
  };
}

export function buildProductReanalysisRequest(input: {
  originalInput: string;
  firstAnalysis: ReviewSections;
  priorTurns: ConsultingTurn[];
  priorAnalyses?: PriorAnalysisBrief[];
  previousQuestions?: string[];
  founderAnswerSource?: FounderAnswerCitation | null;
  latestAnalysis: ReviewSections;
  founderChoice: { label: string; otherText: string } | null;
  founderSupplement: string;
  founderFeedback: { comment: string } | null;
  consultingPath?: ConsultingPathStep[];
  experimentRecords?: ExperimentRecord[];
  failedCalls?: FailedCallRecord[];
  newFounderInformation?: boolean;
}): ChatRequest {
  const previousQuestions = input.previousQuestions ?? [input.latestAnalysis.nextQuestion];
  const system = productReanalysisSystemPrompt();
  const anchors = {
    originalInput: input.originalInput,
    firstAnalysis: compactConsultingAnalysis(input.firstAnalysis),
    latestAnalysis: followUpPreviousAnalysis(input.latestAnalysis),
    founderChoice: input.founderChoice,
    founderSupplement: input.founderSupplement,
    founderFeedback: input.founderFeedback,
    founderAnswerSource: input.founderAnswerSource ?? null,
    priorQuestionTexts: previousQuestions,
    verificationStage: coveredStage(
      nextFactToAsk({
        supplement: input.founderSupplement,
        previousQuestions,
        choiceLabel: input.founderChoice?.label ?? null,
      }),
      `${input.founderChoice?.label ?? ''} ${input.founderSupplement}`,
    ),
    doNotCopy: {
      priorJudgmentText: input.latestAnalysis.analysis?.judgmentDetail || input.latestAnalysis.judgment,
      priorQuestionText: input.latestAnalysis.nextQuestion,
    },
    consultingPath: input.consultingPath ?? [],
    experimentRecords: input.experimentRecords ?? [],
    failedCalls: input.failedCalls ?? [],
    newFounderInformation: input.newFounderInformation ?? true,
  };
  let analyses = [...(input.priorAnalyses ?? [])];
  let turns = [...input.priorTurns];
  const evidenceLedger = buildEvidenceLedger({
    consultingPath: input.consultingPath,
    newFounderInformation: input.newFounderInformation,
    founderChoice: input.founderChoice?.label ?? null,
    founderSupplement: input.founderSupplement,
  });
  const payload = () =>
    renameEchoKeys({
      thisAnswer: {
        choice: input.founderChoice?.label ?? null,
        supplement: input.founderSupplement,
        answeredQuestion: input.latestAnalysis.nextQuestion,
        kind: '이번 답. 선택 또는 계획일 수 있다. 확인된 사실이 아니다. 선택 라벨보다 supplement가 구체적이면 supplement가 이번 답이다.',
      },
      evidenceLedger,
      readingContract: {
        claim: 'founderClaims는 검증되지 않은 가설이다. 현재 사업성의 긍정 근거로 쓰지 않는다.',
        effect: '가설의 성립과 그 영향은 확인되지 않았다. 긍정적 영향을 미칠 것이다라고 단정하지 않는다.',
        nextStep:
          'priorGoals는 이미 고른 상위 목표다. nextVerification은 그 문장을 반복하지 않고 한 단계 아래를 적는다. nextQuestion과 같은 대상만 적는다. 기준을 확인하면 협력 가능성이 높아진다고 쓰지 않는다.',
        thisAnswer:
          'supplement가 이번 답이다. 선택 라벨의 구체화로 바꾸지 않는다. 체험이 있으면 judgment에 체험을 계획으로 남긴다. 이름이나 선정 여부를 다시 묻지 않는다.',
      },
      ...anchors,
      founderAnswers: [
        ...(input.consultingPath ?? []).map((step) => ({
          choice: step.choice,
          supplement: step.supplement,
          answeredQuestion: step.answeredQuestion,
        })),
        ...((input.consultingPath ?? []).length === 0
          ? turns.map((turn) => ({ choice: turn.choiceLabel, supplement: turn.supplement, answeredQuestion: turn.question }))
          : []),
        ...(input.newFounderInformation === false
          ? []
          : [{ choice: input.founderChoice?.label ?? null, supplement: input.founderSupplement, answeredQuestion: input.latestAnalysis.nextQuestion }]),
      ],
      priorAnalyses: analyses,
      priorTurns: turns,
    }) as Record<string, unknown>;
  const systemTokens = estimateReviewTokens(system);
  const overBudget = () =>
    systemTokens + estimateReviewTokens(JSON.stringify(payload())) > AI_PM_PRODUCT_REANALYSIS_INPUT_TOKEN_BUDGET;
  while (overBudget()) {
    if (analyses.length > 1) analyses = analyses.slice(1);
    else if (turns.length > 1) turns = turns.slice(1);
    else if (analyses.length === 1) analyses = [];
    else if (turns.length === 1) turns = [];
    else break;
  }
  const user = JSON.stringify(payload());
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS,
    responseFormat: { type: 'json_schema', schema: productReanalysisSchema() },
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ],
  };
}

/** Synthetic fixtures must name the origin. A missing origin does not become founder-input. */
export function buildSyntheticFollowUpRequest(
  input: Omit<Parameters<typeof buildFollowUpRequest>[0], 'answerOrigin'> & { answerOrigin?: FollowUpAnswerOrigin },
): ChatRequest {
  if (input.answerOrigin !== 'synthetic-test-data') throw new Error('synthetic_answer_origin_required');
  return buildFollowUpRequest({ ...input, answerOrigin: 'synthetic-test-data' });
}

export type FollowUpRequestSource = {
  originalInput: string;
  sections: ReviewSections;
  feedback: StoredFeedback | null;
  supplement: string;
  answerOrigin: FollowUpAnswerOrigin;
};

/**
 * Value contract. Empty means the request carries this source.
 * followUpStructureCoverage does not do this comparison.
 */
export function followUpRequestMismatches(request: ChatRequest, source: FollowUpRequestSource): string[] {
  const mismatches: string[] = [];
  const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
  const userText = request.messages.find((message) => message.role === 'user')?.content ?? '';
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(userText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return ['user_json'];
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return ['user_json'];
  }
  const differ = (name: string, left: unknown, right: unknown) => {
    if (JSON.stringify(left) !== JSON.stringify(right)) mismatches.push(name);
  };
  differ('analysisContract', payload.analysisContract, FOLLOW_UP_ANALYSIS_CONTRACT);
  differ('analysisContractNote', payload.analysisContractNote, FOLLOW_UP_ANALYSIS_CONTRACT_NOTE);
  differ('outputContract', payload.outputContract, FOLLOW_UP_OUTPUT_CONTRACT);
  differ('outputContractNote', payload.outputContractNote, FOLLOW_UP_OUTPUT_CONTRACT_NOTE);
  differ('answerOrigin', payload.answerOrigin, source.answerOrigin);
  differ('answerOriginNotice', payload.answerOriginNotice, followUpAnswerNotice(source.answerOrigin));
  differ('originalInput', payload.originalInput, source.originalInput);
  differ('previousQuestion', payload.previousQuestion, source.sections.nextQuestion);
  differ('founderSupplement', payload.founderSupplement, source.supplement);
  differ('supplement', payload.supplement, source.supplement);
  const gated = Boolean(revisionPayload(source.sections, normalizeMarks(source.feedback?.marks)));
  if (gated) {
    if (payload.inputLedger !== undefined) mismatches.push('inputLedger');
  } else {
    differ(
      'inputLedger',
      payload.inputLedger,
      followUpInputLedger({
        choiceLabel: source.feedback?.choiceAnswer?.label ?? null,
        supplement: source.supplement,
        judgment: source.sections.judgment,
        hypotheses: source.sections.hypotheses,
        nextVerification: source.sections.analysis?.nextVerification ?? '',
      }),
    );
  }
  differ('separationRules', payload.separationRules, [...FOLLOW_UP_SEPARATION_RULES]);
  const expectedAnalysis = followUpPreviousAnalysis(source.sections);
  const previous = payload.previousAnalysis;
  const previousRecord = previous && typeof previous === 'object' && !Array.isArray(previous) ? (previous as Record<string, unknown>) : null;
  if (!previousRecord) mismatches.push('previousAnalysis');
  else {
    for (const key of Object.keys(expectedAnalysis)) {
      if (key === 'analysis') continue;
      differ(`previousAnalysis.${key}`, previousRecord[key], expectedAnalysis[key]);
    }
    if (!('analysis' in previousRecord)) mismatches.push('previousAnalysis.analysis');
    else if (expectedAnalysis.analysis == null) differ('previousAnalysis.analysis', previousRecord.analysis, null);
    else if (!previousRecord.analysis || typeof previousRecord.analysis !== 'object' || Array.isArray(previousRecord.analysis)) {
      mismatches.push('previousAnalysis.analysis');
    } else {
      const expectedRecord = expectedAnalysis.analysis as Record<string, unknown>;
      const actualRecord = previousRecord.analysis as Record<string, unknown>;
      for (const key of Object.keys(expectedRecord)) {
        differ(`previousAnalysis.analysis.${key}`, actualRecord[key], expectedRecord[key]);
      }
    }
  }
  for (const rule of FOLLOW_UP_SEPARATION_RULES) {
    if (!system.includes(rule)) mismatches.push(`system:${rule}`);
  }
  const choice = source.feedback?.choiceAnswer ?? null;
  const expectedChoice = choice
    ? {
        answerOrigin: source.answerOrigin,
        choiceId: choice.choiceId,
        label: choice.label,
        otherText: choice.otherText,
      }
    : null;
  differ('founderChoice', payload.founderChoice, expectedChoice);
  if (expectedChoice && payload.founderChoice && typeof payload.founderChoice === 'object' && !Array.isArray(payload.founderChoice)) {
    const actualChoice = payload.founderChoice as Record<string, unknown>;
    differ('founderChoice.label', actualChoice.label, expectedChoice.label);
    differ('founderChoice.choiceId', actualChoice.choiceId, expectedChoice.choiceId);
    differ('founderChoice.answerOrigin', actualChoice.answerOrigin, expectedChoice.answerOrigin);
    differ('founderChoice.otherText', actualChoice.otherText, expectedChoice.otherText);
  }
  const feedback = payload.feedback;
  const feedbackRecord = feedback && typeof feedback === 'object' && !Array.isArray(feedback) ? (feedback as Record<string, unknown>) : null;
  differ('feedback.choiceAnswer', feedbackRecord ? feedbackRecord.choiceAnswer ?? null : null, choice);
  const analysis = previousRecord?.analysis;
  const analysisRecord = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? (analysis as Record<string, unknown>) : null;
  const facts = Array.isArray(analysisRecord?.founderFacts) ? (analysisRecord.founderFacts as string[]) : [];
  const sourceFacts = source.sections.analysis?.founderFacts ?? [];
  differ('founderFacts', facts, sourceFacts);
  if (choice && choice.label && !sourceFacts.includes(choice.label) && facts.includes(choice.label)) {
    mismatches.push('founderFacts.choice');
  }
  if (source.supplement && !sourceFacts.some((fact) => fact.includes(source.supplement)) && facts.some((fact) => String(fact).includes(source.supplement))) {
    mismatches.push('founderFacts.supplement');
  }
  return mismatches;
}

export type FollowUpStructureCoverage = {
  originalInput: boolean;
  previousAnalysis: boolean;
  previousQuestion: boolean;
  founderChoice: boolean;
  founderSupplement: boolean;
  separationRules: boolean;
  answerOrigin: boolean;
};

/**
 * Shape check. A true flag means the key is present and internally consistent.
 * It does not compare the values with the source text, the stored analysis, or the selected label.
 * That comparison is followUpRequestMismatches. This is not a model-quality score.
 */
export function followUpStructureCoverage(request: ChatRequest): FollowUpStructureCoverage {
  const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
  const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(user) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
  } catch {
    payload = {};
  }
  const previous = payload.previousAnalysis;
  const previousRecord =
    previous && typeof previous === 'object' && !Array.isArray(previous) ? (previous as Record<string, unknown>) : null;
  const analysis = previousRecord?.analysis;
  const analysisRecord =
    analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? (analysis as Record<string, unknown>) : null;
  const choice = payload.founderChoice;
  const choiceRecord = choice && typeof choice === 'object' && !Array.isArray(choice) ? (choice as Record<string, unknown>) : null;
  const rules = Array.isArray(payload.separationRules) ? payload.separationRules.filter((item) => typeof item === 'string').join('\n') : '';
  const ruleText = `${system}\n${rules}`;
  const origin = payload.answerOrigin;
  const originOk = origin === 'synthetic-test-data' || origin === 'founder-input';
  const fullAnalysis = Boolean(
    previousRecord &&
      typeof previousRecord.customer === 'string' &&
      typeof previousRecord.problem === 'string' &&
      typeof previousRecord.revenueModel === 'string' &&
      typeof previousRecord.judgment === 'string' &&
      typeof previousRecord.nextQuestion === 'string' &&
      Array.isArray(previousRecord.hypotheses) &&
      'analysis' in previousRecord &&
      (analysis === null ||
        Boolean(
          analysisRecord &&
            typeof analysisRecord.summary === 'string' &&
            Array.isArray(analysisRecord.founderFacts) &&
            Array.isArray(analysisRecord.choices),
        )),
  );
  return {
    originalInput: typeof payload.originalInput === 'string' && payload.originalInput.length > 0,
    previousAnalysis: fullAnalysis,
    previousQuestion:
      typeof payload.previousQuestion === 'string' &&
      payload.previousQuestion.length > 0 &&
      payload.previousQuestion === previousRecord?.nextQuestion,
    founderChoice: Boolean(
      choiceRecord &&
        typeof choiceRecord.label === 'string' &&
        choiceRecord.label.length > 0 &&
        typeof choiceRecord.choiceId === 'string' &&
        choiceRecord.answerOrigin === origin,
    ),
    founderSupplement: typeof payload.founderSupplement === 'string',
    separationRules:
      ruleText.includes('다시 출력하지 않는다') &&
      ruleText.includes('검증된 사실이 아니다') &&
      ruleText.includes('사실로 승격하지 않는다') &&
      ruleText.includes('가설이 강화되었다고 쓰지 않는다'),
    answerOrigin: originOk && payload.answerOriginNotice === followUpAnswerNotice(origin),
  };
}

export async function runFirstReview(input: {
  store: AiPmReviewStore;
  userId: string;
  projectId: string;
  text: string;
  origin: StoredReview['inputOrigin'];
  fileName: string | null;
  now: string;
  chat?: ReviewChat;
  evidence: StoredReview['evidence'];
  notRunReason?: string;
}): Promise<{ called: boolean; record: StoredReview; view: AiPmReviewView }> {
  const sha = sha256(input.text);
  const latest = await input.store.latestForInput(input.userId, sha, input.projectId);
  const repaired = latest ? repairUnstructured(latest) : null;
  if (repaired && repaired.status === 'succeeded' && latest?.status !== 'succeeded') {
    return {
      called: false,
      record: repaired,
      view: toAiPmReviewView(repaired, await input.store.listFeedback(input.userId, repaired.reviewId)),
    };
  }
  if (latest?.status === 'succeeded' || (latest?.status === 'not_run' && !input.chat)) {
    return {
      called: false,
      record: latest,
      view: toAiPmReviewView(latest, await input.store.listFeedback(input.userId, latest.reviewId)),
    };
  }
  const version = (latest?.version ?? 0) + 1;
  if (!input.chat) {
    const record = baseRecord({
      input,
      sha,
      version,
      parentReviewId: null,
      sourceFeedbackId: null,
      supplementSha: null,
      status: 'not_run',
      evidence: 'not_run',
      callCount: 0,
      error: input.notRunReason ?? 'engine_unconfigured',
    });
    await input.store.insertReview(record);
    return { called: false, record, view: toAiPmReviewView(record, []) };
  }
  return finishCall({
    store: input.store,
    input,
    sha,
    version,
    parentReviewId: null,
    sourceFeedbackId: null,
    supplementSha: null,
    request: buildFirstReviewRequest(input.text),
    chat: input.chat,
  });
}

export function parseFeedbackBody(body: unknown): { ok: true; value: Omit<StoredFeedback, 'feedbackId' | 'userId' | 'submittedAt' | 'modelCalls'> } | { ok: false; error: 'feedback_incomplete' } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'feedback_incomplete' };
  const source = body as Record<string, unknown>;
  const reviewId = typeof source.reviewId === 'string' ? source.reviewId.trim() : '';
  const choiceAnswer = readChoiceAnswer(source);
  if (reviewId && choiceAnswer) {
    return {
      ok: true,
      value: {
        reviewId,
        agreement: 'need_info',
        accuracy: 'hard_to_compare',
        revisionAreas: ['other'],
        comment: choiceAnswer.otherText || choiceAnswer.label,
        nextAction: 'verify_hypotheses',
        marks: [],
        choiceAnswer,
      },
    };
  }
  const agreement = oneOf(source.agreement, AGREEMENTS);
  const accuracy = oneOf(source.accuracy, ACCURACY);
  const nextAction = oneOf(source.nextAction, NEXT);
  const revisionAreas = Array.isArray(source.revisionAreas)
    ? [...new Set(source.revisionAreas.filter((item): item is RevisionArea => AREAS.includes(item as RevisionArea)))]
    : null;
  const comment = typeof source.comment === 'string' ? source.comment.trim().slice(0, 4000) : '';
  const marks = normalizeMarks(source.marks);
  if (reviewId && marks.length > 0) {
    const derived = feedbackFromMarks(marks, comment);
    return { ok: true, value: { reviewId, ...derived, choiceAnswer: null } };
  }
  if (!reviewId || !agreement || !accuracy || !nextAction || !revisionAreas) {
    return { ok: false, error: 'feedback_incomplete' };
  }
  return {
    ok: true,
    value: { reviewId, agreement, accuracy, revisionAreas, comment, nextAction, marks: [], choiceAnswer: null },
  };
}

export async function saveReviewFeedback(input: {
  store: AiPmReviewStore;
  userId: string;
  projectId: string;
  body: unknown;
  now: string;
}): Promise<{ ok: true; feedback: StoredFeedback; view: AiPmReviewView } | { ok: false; error: 'feedback_incomplete' | 'review_missing' }> {
  const parsed = parseFeedbackBody(input.body);
  if (!parsed.ok) return parsed;
  const stored = await input.store.readReview(input.userId, parsed.value.reviewId);
  const review = stored ? repairUnstructured(stored) : null;
  if (!review || review.status !== 'succeeded' || review.projectId !== input.projectId) {
    return { ok: false, error: 'review_missing' };
  }
  const feedback: StoredFeedback = {
    ...parsed.value,
    feedbackId: randomUUID(),
    userId: input.userId,
    submittedAt: input.now,
    modelCalls: 0,
  };
  await input.store.insertFeedback(feedback);
  const saved = await input.store.listFeedback(input.userId, review.reviewId);
  return { ok: true, feedback, view: toAiPmReviewView(review, saved) };
}

export async function runFollowUpReview(input: {
  store: AiPmReviewStore;
  userId: string;
  projectId: string;
  reviewId: string;
  supplement?: string;
  now: string;
  chat?: ReviewChat;
  evidence: StoredReview['evidence'];
  notRunReason?: string;
  /** A saved child stays in place. Set only for a new verification call. */
  forceNew?: boolean;
}): Promise<
  | { ok: true; called: boolean; record: StoredReview; view: AiPmReviewView }
  | { ok: false; error: 'review_missing' | 'feedback_required' | 'engine_unconfigured' | 'gpt_api_key_missing' }
> {
  const parent = await input.store.readReview(input.userId, input.reviewId);
  if (!parent || parent.projectId !== input.projectId || parent.status !== 'succeeded' || !parent.sections) {
    return { ok: false, error: 'review_missing' };
  }
  const feedback = (await input.store.listFeedback(input.userId, parent.reviewId)).at(-1) ?? null;
  const supplement = normalizeReviewText(input.supplement ?? '').slice(0, 4000);
  if (!feedback && !supplement) return { ok: false, error: 'feedback_required' };
  const supplementSha = sha256(supplement);
  const marks = normalizeMarks(feedback?.marks);
  const sourceFeedbackId = feedback?.feedbackId ?? null;
  const prior = (await input.store.listReviews(input.userId, input.projectId))
    .filter(
      (record) =>
        record.parentReviewId === parent.reviewId &&
        record.sourceFeedbackId === sourceFeedbackId &&
        record.supplementSha === supplementSha,
    )
    .at(-1);
  if (prior && reuseFollowUp(prior, marks) && !input.forceNew) {
    return {
      ok: true,
      called: false,
      record: prior,
      view: toAiPmReviewView(prior, await input.store.listFeedback(input.userId, prior.reviewId)),
    };
  }
  if (!input.chat) return { ok: false, error: input.notRunReason === 'gpt_api_key_missing' ? 'gpt_api_key_missing' : 'engine_unconfigured' };
  const latest = await input.store.latestForInput(input.userId, parent.inputSha, input.projectId);
  const records = await input.store.listReviews(input.userId, input.projectId);
  const projectFeedback = (await input.store.listFeedback(input.userId)).filter((item) =>
    records.some((record) => record.reviewId === item.reviewId),
  );
  const history = assembleConsultingHistory({ records, parent, supplement, feedback: projectFeedback });
  const root = history.root;
  const choice = feedback?.choiceAnswer ?? null;
  const ledger = buildEvidenceLedger({
    consultingPath: history.consultingPath,
    newFounderInformation: history.newFounderInformation,
    founderChoice: choice?.label ?? null,
    founderSupplement: supplement,
  });
  const productRequest = buildProductReanalysisRequest({
    originalInput: root.inputText,
    firstAnalysis: root.sections ?? parent.sections,
    priorTurns: history.priorTurns,
    priorAnalyses: history.priorAnalyses,
    previousQuestions: history.previousQuestions,
    founderAnswerSource: history.founderAnswerSource,
    latestAnalysis: parent.sections,
    consultingPath: history.consultingPath,
    experimentRecords: history.experimentRecords,
    failedCalls: history.failedCalls,
    newFounderInformation: history.newFounderInformation,
    founderChoice: choice ? { label: choice.label, otherText: choice.otherText } : null,
    founderSupplement: supplement,
    founderFeedback: feedback ? { comment: feedback.comment } : null,
  });
  const finished = await finishCall({
    store: input.store,
    input: {
      userId: input.userId,
      projectId: input.projectId,
      text: parent.inputText,
      origin: parent.inputOrigin,
      fileName: parent.fileName,
      now: input.now,
      evidence: input.evidence,
    },
    sha: parent.inputSha,
    version: (latest?.version ?? parent.version) + 1,
    parentReviewId: parent.reviewId,
    sourceFeedbackId,
    supplementSha,
    request: needsRevisionGate(marks)
      ? buildFollowUpRequest({
          originalInput: parent.inputText,
          sections: parent.sections,
          feedback,
          supplement,
          answerOrigin: 'founder-input',
        })
      : productRequest,
    chat: input.chat,
    gate: needsRevisionGate(marks) ? { previous: parent.sections, marks } : null,
    consultingAnswer: needsRevisionGate(marks)
      ? null
      : {
          question: parent.sections.nextQuestion,
          choiceLabel: choice?.label ?? null,
          supplement,
        },
    founderAnswerSource: needsRevisionGate(marks) ? null : history.founderAnswerSource,
    readingIssues: needsRevisionGate(marks)
      ? undefined
      : (content) => {
          const parsed = parseSections(content, parent.inputText);
          const analysis = parsed?.analysis;
          if (!parsed || !analysis) return [];
          return productReadingIssues({
            judgment: analysis.judgmentDetail,
            summary: analysis.summary,
            assumptions: analysis.assumptions,
            inferences: analysis.inferences,
            nextVerification: analysis.nextVerification,
            nextQuestion: parsed.nextQuestion,
            unresolved: ledger.unresolved,
            priorGoals: ledger.priorGoals,
            founderClaims: ledger.founderClaims,
            founderFacts: analysis.founderFacts,
            founderSupplement: supplement,
            answeredQuestion: parent.sections.nextQuestion,
            answeredVerification: parent.sections.analysis?.nextVerification ?? '',
          });
        },
    readingRepairContext: needsRevisionGate(marks) ? undefined : { supplement },
  });
  return { ok: true, called: finished.called, record: finished.record, view: finished.view };
}

export function needsRevisionGate(marks: ReviewMark[]): boolean {
  return marks.includes('understanding_wrong') || marks.includes('core_missing');
}

function reuseFollowUp(record: StoredReview, marks: ReviewMark[]): boolean {
  if (!needsRevisionGate(marks)) return record.status === 'succeeded';
  return record.revisionGate?.pass === true || record.revisionGate?.pass === false;
}

function revisionPayload(sections: ReviewSections, marks: ReviewMark[]) {
  if (!needsRevisionGate(marks)) return null;
  const wrong = marks.includes('understanding_wrong');
  const missing = marks.includes('core_missing');
  return {
    ...(wrong
      ? {
          reconfirm: {
            action: 'mark_unconfirmed' as const,
            scope: 'dependent_hypotheses' as const,
            doNotDeleteUnrelated: true,
            hypotheses: [
              { field: 'problem', dependsOn: 'understanding_wrong', previousClaim: sections.problem, requiredState: 'unconfirmed' as const },
              { field: 'target_customer', dependsOn: 'understanding_wrong', previousClaim: sections.customer, requiredState: 'unconfirmed' as const },
              { field: 'business_model', dependsOn: 'understanding_wrong', previousClaim: sections.revenueModel, requiredState: 'unconfirmed' as const },
            ],
            confirmation: {
              problem: 'unconfirmed' as const,
              target_customer: 'unconfirmed' as const,
              business_model: 'unconfirmed' as const,
            },
          },
        }
      : {}),
    ...(missing
      ? {
          askFounder: {
            action: 'ask_missing_core' as const,
            doNotInvent: true,
            previousQuestion: sections.nextQuestion,
            requiredMeaning: 'ask_what_core_is_missing' as const,
            rejectMeaning: 'partnership_or_plan_substitute' as const,
          },
        }
      : {}),
  };
}

export function assessFollowUpRevision(input: {
  previous: ReviewSections;
  next: ReviewSections;
  marks: ReviewMark[];
}): RevisionGate {
  const marks = normalizeMarks(input.marks);
  const failures: RevisionGate['failures'] = [];
  const changes: string[] = [];
  const wrong = marks.includes('understanding_wrong');
  const missing = marks.includes('core_missing');
  if (wrong) {
    const dependents = [
      ['문제', 'problem', input.previous.problem, input.next.problem],
      ['고객', 'customer', input.previous.customer, input.next.customer],
      ['수익', 'revenue', input.previous.revenueModel, input.next.revenueModel],
    ] as const;
    for (const [label, key, claim, field] of dependents) {
      const declared = input.next.claimConfirmation?.[key] ?? null;
      if (declared !== 'unconfirmed') {
        failures.push(declared === 'confirmed' ? 'confirmed_reuse' : 'confirmation_unset');
        changes.push(
          declared === 'confirmed'
            ? `${label} 가설이 확정 상태로 저장되었습니다.`
            : `${label} 가설의 확인 상태가 없습니다.`,
        );
      }
      const state = hypothesisState(claim, field);
      const judged = hypothesisState(claim, input.next.judgment);
      if (state === 'confirmed' || judged === 'confirmed') {
        failures.push('confirmed_reuse');
        changes.push(`${label} 가설이 확정 사실로 남았습니다.`);
      }
      if (state === 'absent') {
        failures.push('discarded_interpretation');
        changes.push(`${label} 가설을 확인 전으로 두지 않고 지웠습니다.`);
      }
      if (state === 'unconfirmed' && novelLength(field, claim) > 24) failures.push('invented_core');
    }
    if (wiped(input.previous.execution, input.next.execution) || wiped(input.previous.market, input.next.market)) {
      failures.push('discarded_interpretation');
      changes.push('오류 표시와 무관한 항목까지 지웠습니다.');
    }
  }
  if (missing) {
    const meaning = missingCoreQuestion(input.next.nextQuestion, input.previous.nextQuestion);
    if (meaning === 'unchanged') failures.push('question_unchanged');
    if (meaning !== 'asks') failures.push('missing_core_not_asked');
    for (const [previous, next] of [
      [input.previous.execution, input.next.execution],
      [input.previous.market, input.next.market],
    ] as const) {
      if (compact(previous) !== compact(next) && novelLength(next, previous) > 24) failures.push('invented_core');
    }
  }
  const unique = [...new Set(failures)];
  if (unique.length === 0) {
    if (wrong) changes.push('문제, 고객, 수익 가설의 확인 상태는 확인 전입니다.');
    if (missing) changes.push('다음 질문이 누락된 핵심을 묻습니다.');
    return { pass: true, summary: changes.join(' '), changes, failures: [] };
  }
  if (unique.includes('question_unchanged')) changes.push('다음 질문이 이전 질문과 같습니다.');
  if (unique.includes('missing_core_not_asked')) changes.push('다음 질문이 누락된 핵심을 묻지 않습니다.');
  if (unique.includes('invented_core')) changes.push('빠진 핵심을 입력에 없는 내용으로 채웠습니다.');
  return { pass: false, summary: `${changes.join(' ')} 이 후속 검토는 반영하지 않았습니다.`, changes, failures: unique };
}

function hypothesisState(claim: string, text: string): 'unconfirmed' | 'confirmed' | 'absent' {
  const claimCompact = compact(claim);
  const textCompact = compact(text);
  if (!claimCompact) return 'unconfirmed';
  if (!sharesClause(claimCompact, textCompact)) return 'absent';
  if (textCompact === claimCompact) return 'confirmed';
  const stating = sentencesOf(text).filter((sentence) => compact(sentence).includes(claimCompact));
  if (stating.length === 0 || stating.some((sentence) => !UNCONFIRMED_CLAIM.test(sentence))) return 'confirmed';
  return 'unconfirmed';
}

function sentencesOf(text: string): string[] {
  return text
    .split(/[\n]+|(?<=[.!?？])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function missingCoreQuestion(question: string, previous: string): 'unchanged' | 'asks' | 'substitute' {
  const asked = question.trim();
  if (compact(asked) === compact(previous)) return 'unchanged';
  const asksWhat = /빠진 핵심은 무엇|누락된 핵심은 무엇|어떤 핵심이 빠|무엇이 빠|어떤 내용이 빠/.test(asked);
  const planSubstitute = /파트너십|제휴|어떻게 구축|어떤 방식|구체화|계획인가/.test(asked);
  if (!asksWhat || planSubstitute || !/[?？까]$/.test(asked)) return 'substitute';
  return 'asks';
}

function wiped(previous: string, next: string): boolean {
  return compact(previous).length > 12 && compact(next).length < 8;
}

function sharesClause(previous: string, next: string): boolean {
  if (!previous) return true;
  if (next.includes(previous)) return true;
  const size = 12;
  if (previous.length < size) return next.includes(previous);
  for (let index = 0; index + size <= previous.length; index += 4) {
    if (next.includes(previous.slice(index, index + size))) return true;
  }
  return false;
}

function novelLength(next: string, previous: string): number {
  let text = compact(next).split(compact(previous)).join('');
  for (const piece of ['재확인대상:', '재확인대상', '이해석은확정된사실이아니다', '확정된사실이아니다']) {
    text = text.split(piece).join('');
  }
  return [...text].filter((char) => /\p{L}|\p{N}/u.test(char)).length;
}

function compact(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

export type FollowUpOutputContext = {
  previousJudgment: string;
  previousHypotheses: string[];
  previousNextVerification: string;
  previousNextQuestion: string;
  previousRevenueModel: string;
  choiceLabel: string | null;
  supplement: string;
  answerOrigin: FollowUpAnswerOrigin;
};

export function followUpOutputContext(input: {
  sections: ReviewSections;
  choiceLabel: string | null;
  supplement: string;
  answerOrigin: FollowUpAnswerOrigin;
}): FollowUpOutputContext {
  return {
    previousJudgment: input.sections.judgment,
    previousHypotheses: [...input.sections.hypotheses],
    previousNextVerification: input.sections.analysis?.nextVerification ?? '',
    previousNextQuestion: input.sections.nextQuestion,
    previousRevenueModel: input.sections.revenueModel,
    choiceLabel: input.choiceLabel,
    supplement: input.supplement,
    answerOrigin: input.answerOrigin,
  };
}

function hypothesisLine(value: readonly string[]): string {
  return value.join(' / ');
}

const ABSENT_INPUT_MARKERS = ['예약 고객', '예약', '가격', '계약', '확정된 양조장', '양조장'] as const;

function citesFollowUpInput(text: string, context: FollowUpOutputContext): boolean {
  const haystack = compact(text);
  const choice = compact(context.choiceLabel ?? '');
  if (choice.length >= 4 && haystack.includes(choice)) return true;
  const source = compact(context.supplement);
  if (source.length === 0) return text.trim().length > 0;
  if (source.length < 8) return haystack.includes(source);
  for (let index = 0; index + 8 <= source.length; index += 1) {
    if (haystack.includes(source.slice(index, index + 8))) return true;
  }
  return false;
}

function absentInputMarkers(supplement: string): string[] {
  if (!supplement.includes('없')) return [];
  return ABSENT_INPUT_MARKERS.filter((marker) => supplement.includes(marker));
}

function linksIncrementalAnswer(reason: string, current: string, context: FollowUpOutputContext): boolean {
  const text = `${reason}\n${current}`;
  if (citesFollowUpInput(text, context)) return true;
  return absentInputMarkers(context.supplement).some((marker) => text.includes(marker));
}

function citesSupplement(text: string, supplement: string): boolean {
  const source = compact(supplement);
  if (source.length === 0) return true;
  const haystack = compact(text);
  if (source.length < 8) return haystack.includes(source);
  for (let index = 0; index + 8 <= source.length; index += 1) {
    if (haystack.includes(source.slice(index, index + 8))) return true;
  }
  return false;
}

function founderAnswerRecordErrors(field: string, value: unknown, context: FollowUpOutputContext): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`founder_answer_type:${field}`];
  const record = value as Record<string, unknown>;
  const errors: string[] = [];
  const choice = record.choice;
  const supplement = typeof record.supplement === 'string' ? record.supplement.trim() : '';
  const source = typeof record.source === 'string' ? record.source.trim() : '';
  const status = typeof record.status === 'string' ? record.status.trim() : '';
  if (context.choiceLabel) {
    if (choice !== context.choiceLabel) errors.push(`founder_answer_choice:${field}`);
  } else if (!(choice === null || choice === '')) errors.push(`founder_answer_choice:${field}`);
  if (context.supplement.trim()) {
    if (!supplement) errors.push(`founder_answer_supplement_missing:${field}`);
    else if (!citesSupplement(supplement, context.supplement)) errors.push(`founder_answer_supplement_unlinked:${field}`);
    else {
      const needed = ['예약', '가격', '계약', '양조장'].filter((token) => context.supplement.includes(token));
      if (needed.some((token) => !supplement.includes(token))) errors.push(`founder_answer_supplement_missing:${field}`);
    }
  }
  if (source !== context.answerOrigin) errors.push(`founder_answer_source_unlinked:${field}`);
  if (status !== FOLLOW_UP_FOUNDER_ANSWER_STATUS) errors.push(`founder_answer_status:${field}`);
  return errors;
}

function choiceOnlyGrounds(grounds: string, choice: string): boolean {
  const haystack = compact(grounds);
  const label = compact(choice);
  if (label.length < 4 || !haystack.includes(label)) return false;
  return haystack.split(label).join('').length <= 12;
}

function choiceEffectErrors(field: string, value: unknown, context: FollowUpOutputContext): string[] {
  if (!context.choiceLabel) return [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`choice_effect_missing:${field}`];
  const record = value as Record<string, unknown>;
  const label = typeof record.label === 'string' ? record.label : '';
  const origin = typeof record.answerOrigin === 'string' ? record.answerOrigin.trim() : '';
  const role = typeof record.role === 'string' ? record.role.trim() : '';
  const effect = typeof record.effect === 'string' ? record.effect.trim() : '';
  const errors: string[] = [];
  if (label !== context.choiceLabel) errors.push(`choice_effect_label:${field}`);
  if (origin !== context.answerOrigin) errors.push(`choice_effect_origin:${field}`);
  if (role !== 'plan') errors.push(`choice_effect_role:${field}`);
  if (!effect) return [...errors, `choice_effect_missing:${field}`];
  const cue = FIELD_REASON_CUES[field as (typeof FOLLOW_UP_OUTPUT_FIELDS)[number]];
  if (!effect.includes(context.choiceLabel) || (cue && !cue.test(effect))) errors.push(`choice_effect_unrelated:${field}`);
  if (choiceOnlyGrounds(effect, context.choiceLabel)) errors.push(`choice_effect_choice_only:${field}`);
  const experienceFirst =
    context.choiceLabel.includes('체험') && context.choiceLabel.includes('먼저') && !context.choiceLabel.includes('마케팅을 먼저');
  if (effect.includes(context.choiceLabel)) {
    if (field === 'hypotheses' && !/수요 증거가 아니|근거가 아니|수요를 입증하지/.test(effect)) {
      errors.push('choice_effect_plan_as_evidence:hypotheses');
    }
    if (field === 'nextVerification' && experienceFirst && (!/먼저|우선/.test(effect) || !/입증되지|수요/.test(effect))) {
      errors.push('choice_effect_priority_unlinked:nextVerification');
    }
    if (field === 'nextQuestion' && experienceFirst && (!/질문/.test(effect) || !/양조장|후보/.test(effect))) {
      errors.push('choice_effect_question_unlinked:nextQuestion');
    }
  }
  return errors;
}

function judgmentRestatesChoice(judgment: string, choice: string | null): boolean {
  if (!choice) return false;
  const judged = compact(judgment);
  const label = compact(choice);
  if (!judged || !label) return false;
  if (judged === label || judgment.includes(choice)) return true;
  const stem = label.slice(0, 10);
  return stem.length >= 8 && judged.includes(stem);
}

function unconfirmedHypotheses(previous: readonly string[]): boolean {
  const lines = previous.map((item) => item.trim()).filter((item) => item.length > 0);
  return lines.length === 0 || lines.every((item) => item === '미확인');
}

function forecastsDemand(text: string): boolean {
  return /수요/.test(text) && /존재|있을|있다|예상/.test(text);
}

const FIELD_REASON_CUES: Record<(typeof FOLLOW_UP_OUTPUT_FIELDS)[number], RegExp> = {
  judgment: /판단/,
  hypotheses: /가설|미확인/,
  nextVerification: /검증|양조장/,
  nextQuestion: /질문/,
};

const EVIDENCE_STATUSES = new Set(['confirmed-fact', 'unverified-input', 'unconfirmed']);

function reasonIsGeneric(reason: string): boolean {
  const text = compact(reason).replace(/[.]/g, '');
  return ['바꾸지않은이유', '새정보가없어유지', '이전과동일한상태', '이전과동일', '유지'].includes(text);
}

function isGenericHold(text: string): boolean {
  if (reasonIsGeneric(text)) return true;
  const folded = compact(text).replace(/[.]/g, '');
  const specific = /충분하지|부족|확인된사실이아니|근거가아니|주장|계약서|증빙|예약|입금|인터뷰|기록/.test(folded);
  if (specific) return false;
  return /방향성|추가정보|동일한상태|미확인/.test(folded);
}

function explainsInsufficiency(reason: string): boolean {
  return /충분하지|바꾸지 않|확인된 사실이 아니|근거가 아니|부족|확정하지/.test(reason);
}

function explainsDeferral(reason: string): boolean {
  return /유보|아직 판단|확인해야|증빙|필요/.test(reason);
}

function decisionMatches(decision: string, changed: boolean): boolean {
  if (changed) return decision === 'changed';
  return decision === 'retained' || decision === 'unresolved';
}

function assertsConfirmation(text: string): boolean {
  return /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(text);
}

function inputSupplementKind(supplement: string): FollowUpInputLedgerEntry['kind'] {
  const text = supplement.trim();
  if (!text) return 'absent';
  if (assertsConfirmation(text)) return 'unverified-claim';
  if (text.includes('없') && /양조장|예약|가격|계약/.test(text)) return 'absence-statement';
  return 'supplement';
}

function experienceFirstChoice(label: string | null): boolean {
  return Boolean(label && label.includes('체험') && label.includes('먼저') && !label.includes('마케팅을 먼저'));
}

/** Marketing stays a later task. Joining it at the same rank as the experience check is unfocused. */
function marketingPlanUnfocused(plan: string): boolean {
  if (!/온라인 마케팅/.test(plan)) return false;
  if (/및 온라인 마케팅|같이|함께|동시에/.test(plan)) return true;
  return !/그 다음|그 뒤|이후|나중|남아/.test(plan);
}

const STATUS_REPEAT = /여전히유효|변화가없다|새로운정보가없|새정보가없|방향성을제공|명확한방향/;
const STATUS_SPECIFIC = /계획|근거가아니|주장|계약서|수요|고객|인터뷰|관련|부족|충분하지|확인된사실이아니|증빙/;

/** A status sentence that does not say how the new input relates to the stored item. */
function statusRepeat(text: string): boolean {
  const folded = compact(text).replace(/[.]/g, '');
  if (!STATUS_REPEAT.test(folded)) return false;
  return !STATUS_SPECIFIC.test(folded);
}

function marksClaimAsUnverified(text: string): boolean {
  return /주장|확인된 사실이 아니|증빙이 없|증빙은 없|계약서는 없|검증되지|미확인/.test(text);
}

function claimPromoted(text: string): boolean {
  return assertsConfirmation(text) && !marksClaimAsUnverified(text);
}

function citesRetentionInput(reason: string, context: FollowUpOutputContext): boolean {
  if (citesFollowUpInput(reason, context)) return true;
  return absentInputMarkers(context.supplement).some((marker) => reason.includes(marker));
}

function reviewFieldText(change: Record<string, unknown>, key: (typeof FOLLOW_UP_REVIEW_FIELDS)[number]): string {
  const value = change[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Scores the six review fields the schema requires.
 * Does not write those strings. An empty field is a missing review.
 */
function reviewFieldErrors(
  field: string,
  change: Record<string, unknown>,
  decision: string,
  context: FollowUpOutputContext,
): string[] {
  const errors: string[] = [];
  const inputConsidered = reviewFieldText(change, 'inputConsidered');
  const impactAssessment = reviewFieldText(change, 'impactAssessment');
  const sufficiency = reviewFieldText(change, 'sufficiencyAssessment');
  const retentionDecision = reviewFieldText(change, 'retentionDecision');
  const holdReason = reviewFieldText(change, 'holdReason');
  const evidenceNeeded = reviewFieldText(change, 'evidenceNeeded');
  if (!inputConsidered) errors.push(`review_field_missing:inputConsidered:${field}`);
  if (!impactAssessment) errors.push(`review_field_missing:impactAssessment:${field}`);
  if (!sufficiency) errors.push(`review_field_missing:sufficiencyAssessment:${field}`);
  else if (!FOLLOW_UP_SUFFICIENCY.includes(sufficiency as (typeof FOLLOW_UP_SUFFICIENCY)[number])) {
    errors.push(`review_field_invalid:sufficiencyAssessment:${field}`);
  }
  if (!retentionDecision) errors.push(`review_field_missing:retentionDecision:${field}`);
  else if (!FOLLOW_UP_DECISIONS.includes(retentionDecision as (typeof FOLLOW_UP_DECISIONS)[number])) {
    errors.push(`review_field_invalid:retentionDecision:${field}`);
  } else if (retentionDecision !== decision) errors.push(`retention_decision_mismatch:${field}`);
  if (!holdReason) errors.push(`review_field_missing:holdReason:${field}`);
  if (!evidenceNeeded) errors.push(`review_field_missing:evidenceNeeded:${field}`);
  const reviewed = field === 'judgment' || field === 'hypotheses';
  if (!reviewed) return errors;
  const held = decision === 'retained' || decision === 'unresolved';
  if (inputConsidered && !citesRetentionInput(inputConsidered, context)) errors.push(`retention_input_missing:${field}`);
  if (
    inputConsidered &&
    absentInputMarkers(context.supplement).length > 0 &&
    !absentInputMarkers(context.supplement).some((marker) => inputConsidered.includes(marker))
  ) {
    errors.push(`retention_input_missing:${field}`);
  }
  if (impactAssessment && !/영향|바꾸|유지|유보|판단|가설|미확인|충돌/.test(impactAssessment)) {
    errors.push(`retention_effect_missing:${field}`);
  }
  if (impactAssessment && held && isGenericHold(impactAssessment)) errors.push(`review_hold_generic:impactAssessment:${field}`);
  if (held && sufficiency === 'sufficient') errors.push(`sufficiency_conflict:${field}`);
  if (decision === 'changed' && sufficiency === 'insufficient') errors.push(`sufficiency_conflict:${field}`);
  if (held && holdReason && isGenericHold(holdReason)) errors.push(`review_hold_generic:holdReason:${field}`);
  if (held && decision === 'retained' && holdReason && !/유지|바꾸지|그대로|두지|머문/.test(holdReason)) {
    errors.push(`retention_hold_missing:${field}`);
  }
  if (held && decision === 'unresolved' && holdReason && !/유보|아직/.test(holdReason)) {
    errors.push(`unresolved_verification_missing:${field}`);
  }
  if (held && evidenceNeeded && !/계약서|증빙|예약|입금|확인|인터뷰|기록/.test(evidenceNeeded)) {
    errors.push(`retention_evidence_missing:${field}`);
  }
  if (assertsConfirmation(context.supplement)) {
    for (const text of [inputConsidered, impactAssessment, holdReason]) {
      if (text && claimPromoted(text)) errors.push(`claim_promoted_to_fact:${field}`);
    }
  }
  if (held && impactAssessment && statusRepeat(impactAssessment)) errors.push(`status_repeat:impactAssessment:${field}`);
  if (held && holdReason && statusRepeat(holdReason)) errors.push(`status_repeat:holdReason:${field}`);
  const choice = (context.choiceLabel ?? '').trim();
  if (held && choice && inputConsidered && compact(inputConsidered) === compact(choice)) errors.push(`input_echo_only:${field}`);
  const choiceOnly = choice.length > 0 && context.supplement.trim().length === 0;
  if (choiceOnly && held && impactAssessment) {
    const relates =
      field === 'hypotheses'
        ? /계획|선택/.test(impactAssessment) && /가설|미확인|관련/.test(impactAssessment)
        : /계획|선택/.test(impactAssessment) && /판단|관련|근거/.test(impactAssessment);
    if (!relates) errors.push(`trace_relation_missing:${field}`);
  }
  if (choiceOnly && held && evidenceNeeded && !/고객|수요|인터뷰|참여|예약|의향/.test(evidenceNeeded)) {
    errors.push(`trace_evidence_unrelated:${field}`);
  }
  if (
    experienceFirstChoice(context.choiceLabel) &&
    assertsConfirmation(context.supplement) &&
    inputConsidered &&
    !/양조장|확정|계약/.test(inputConsidered)
  ) {
    errors.push(`claim_unlinked:${field}`);
  }
  if (
    field === 'judgment' &&
    experienceFirstChoice(context.choiceLabel) &&
    assertsConfirmation(context.supplement) &&
    evidenceNeeded &&
    !/계약서|증빙|입금/.test(evidenceNeeded)
  ) {
    errors.push(`trace_evidence_unrelated:${field}`);
  }
  return errors;
}

function retentionReviewErrors(field: string, reason: string, decision: string, context: FollowUpOutputContext): string[] {
  if (field !== 'judgment' && field !== 'hypotheses') return [];
  if (decision !== 'retained' && decision !== 'unresolved') return [];
  const errors: string[] = [];
  if (!citesRetentionInput(reason, context)) errors.push(`retention_input_missing:${field}`);
  if (!/영향|바꾸|유지|유보|판단|가설|미확인/.test(reason)) errors.push(`retention_effect_missing:${field}`);
  if (!/충분하지|부족|확인된 사실이 아니|근거가 아니|증빙이 없|증빙은 없|확정하지|검증되지/.test(reason)) {
    errors.push(`retention_sufficiency_missing:${field}`);
  }
  if (decision === 'retained' && !/유지|바꾸지|그대로|두지|머문/.test(reason)) errors.push(`retention_hold_missing:${field}`);
  if (decision === 'unresolved' && !/유보|아직/.test(reason)) errors.push(`unresolved_verification_missing:${field}`);
  if (!/필요|확인해야|증빙|증거가|계약서/.test(reason)) errors.push(`retention_evidence_missing:${field}`);
  return errors;
}

function supplementConflicts(previous: string, supplement: string): boolean {
  if (!previous || !supplement) return false;
  const deniesMarketing = /마케팅/.test(previous) && /마케팅[^。]{0,16}하지 않|마케팅 지원은 하지/.test(supplement);
  const deniesExperience = /체험/.test(previous) && /체험[^。]{0,16}하지 않/.test(supplement);
  return deniesMarketing || deniesExperience;
}

function asksAQuestion(text: string): boolean {
  const trimmed = text.trim();
  return /[?？]$/.test(trimmed) && !/질문한다|이 문장이다|적는다|실패다/.test(trimmed);
}

function verificationPlanReady(text: string): boolean {
  return (
    text.includes('양조장 후보') &&
    text.includes('협력 가능') &&
    text.includes('확정된 공급처로 간주하지') &&
    text.includes('별도')
  );
}

function inventedPresence(text: string, supplement: string): boolean {
  if (!supplement.includes('없')) return false;
  const rules: Array<[string, RegExp]> = [
    ['예약', /예약 고객이 있(?!는지)|예약이 있(?!는지)|예약했다|예약 고객 \d/],
    ['가격', /가격이 있(?!는지)|가격이 정해졌|참가비는\s*\d|가격은\s*\d/],
    ['계약', /계약이 있(?!는지)|계약했다|계약을 맺/],
    ['양조장', /양조장이 확정되었|확정된 양조장이 있(?!는지)|양조장을 정했다/],
  ];
  return rules.some(([topic, claim]) => supplement.includes(topic) && claim.test(text));
}

export type IncrementalNormalization = {
  sections: ReviewSections | null;
  errors: string[];
};

function readReflectionObject(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function cloneReviewSections(previous: ReviewSections): ReviewSections {
  const analysis = previous.analysis;
  return {
    ...previous,
    risks: [...previous.risks],
    uncertain: [...previous.uncertain],
    hypotheses: [...previous.hypotheses],
    claimConfirmation: previous.claimConfirmation ? { ...previous.claimConfirmation } : null,
    analysis: analysis
      ? {
          ...analysis,
          strengths: [...analysis.strengths],
          assumptions: [...analysis.assumptions],
          evidenceToChange: [...analysis.evidenceToChange],
          founderFacts: [...analysis.founderFacts],
          inferences: [...analysis.inferences],
          choices: analysis.choices.map((choice) => ({ ...choice })),
        }
      : analysis,
  };
}

function sectionsStorageErrors(sections: ReviewSections): string[] {
  const errors: string[] = [];
  const textKeys = [
    'customer',
    'problem',
    'market',
    'revenueModel',
    'execution',
    'judgment',
    'nextQuestion',
    'nextQuestionReason',
    'answerHint',
  ] as const;
  for (const key of textKeys) {
    if (typeof sections[key] !== 'string' || sections[key].trim().length === 0) errors.push(`sections_missing:${key}`);
  }
  for (const key of ['risks', 'uncertain', 'hypotheses'] as const) {
    if (!Array.isArray(sections[key]) || sections[key].some((item) => typeof item !== 'string' || item.trim().length === 0)) {
      errors.push(`sections_missing:${key}`);
    }
  }
  return errors;
}

/**
 * Semantic reflection contract. The founder answer stays on the request.
 * A change explains the effect in reason and current. It does not repeat choice, supplement, and label.
 * An empty list means the structure and the analytical link hold.
 */
export function incrementalReflectionErrors(raw: string, context: FollowUpOutputContext): string[] {
  const parsed = readReflectionObject(raw);
  if (!parsed) return ['follow_up_output_unparsed'];
  const errors: string[] = [];
  const judgment = typeof parsed.judgment === 'string' ? parsed.judgment.trim() : '';
  const nextVerification = typeof parsed.nextVerification === 'string' ? parsed.nextVerification.trim() : '';
  const nextQuestion = typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.trim() : '';
  const hypotheses = Array.isArray(parsed.hypotheses)
    ? parsed.hypotheses.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (!judgment) errors.push('follow_up_output_missing_judgment');
  if (!Array.isArray(parsed.hypotheses) || hypotheses.length === 0) errors.push('follow_up_output_missing_hypotheses');
  if (!nextVerification) errors.push('follow_up_output_missing_nextVerification');
  if (!nextQuestion) errors.push('follow_up_output_missing_nextQuestion');
  const revenue =
    typeof parsed.revenueModel === 'string'
      ? parsed.revenueModel.trim()
      : typeof parsed.business_model === 'string'
        ? parsed.business_model.trim()
        : '';
  if (!revenue) errors.push('follow_up_output_missing_revenueModel');
  else if (context.previousRevenueModel.trim() && revenue !== context.previousRevenueModel.trim()) errors.push('revenue_hypothesis_replaced');
  else if (context.previousRevenueModel.includes('가설') && !revenue.includes('가설')) errors.push('hypothesis_label_removed');
  if (!context.previousRevenueModel.trim() && revenue) errors.push('revenue_hypothesis_invented');
  if (/가격[^。\n]{0,16}없/.test(context.supplement) && revenue && !revenue.includes('가설') && /참가비|수익/.test(revenue)) {
    errors.push('hypothesis_label_removed');
  }
  const facts = Array.isArray(parsed.founderFacts) ? parsed.founderFacts.map((item) => String(item)) : [];
  if (context.choiceLabel && facts.some((fact) => fact.includes(context.choiceLabel ?? ''))) errors.push('choice_in_founder_facts');
  if (context.supplement && facts.some((fact) => fact.includes(context.supplement))) errors.push('supplement_in_founder_facts');
  const changes = Array.isArray(parsed.changes) ? parsed.changes : null;
  if (!Object.prototype.hasOwnProperty.call(parsed, 'changes') || parsed.changes == null) errors.push('follow_up_output_missing_changes');
  else if (!changes) errors.push('follow_up_output_changes_type');
  else if (changes.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) errors.push('follow_up_output_change_type');
  const expectedPrevious: Record<(typeof FOLLOW_UP_OUTPUT_FIELDS)[number], string> = {
    judgment: context.previousJudgment,
    hypotheses: hypothesisLine(context.previousHypotheses),
    nextVerification: context.previousNextVerification,
    nextQuestion: context.previousNextQuestion,
  };
  const expectedUpdated: Record<(typeof FOLLOW_UP_OUTPUT_FIELDS)[number], string> = {
    judgment,
    hypotheses: hypothesisLine(hypotheses),
    nextVerification,
    nextQuestion,
  };
  const priorityChoice = Boolean(context.choiceLabel && /먼저|검증/.test(context.choiceLabel));
  const recordedReasons: string[] = [];
  for (const field of FOLLOW_UP_OUTPUT_FIELDS) {
    const change = changes?.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === field) as
      | Record<string, unknown>
      | undefined;
    if (!change) {
      errors.push(`follow_up_output_missing_change:${field}`);
      continue;
    }
    const previous = typeof change.previous === 'string' ? change.previous : '';
    const current = typeof change.current === 'string' ? change.current : '';
    const decision = typeof change.decision === 'string' ? change.decision.trim() : '';
    const reason = typeof change.reason === 'string' ? change.reason.trim() : '';
    const evidenceStatus = typeof change.evidenceStatus === 'string' ? change.evidenceStatus.trim() : '';
    recordedReasons.push(reason);
    if (previous !== expectedPrevious[field]) errors.push(`follow_up_output_previous:${field}`);
    if (!Object.prototype.hasOwnProperty.call(change, 'current') || current !== expectedUpdated[field]) errors.push(`follow_up_output_current:${field}`);
    const changed = current !== previous;
    if (!decision) errors.push(`decision_missing:${field}`);
    else if (!decisionMatches(decision, changed)) errors.push(`decision_mismatch:${field}`);
    if (!reason) errors.push(`reason_missing:${field}`);
    else if (reasonIsGeneric(reason)) errors.push(`reason_generic:${field}`);
    else if (!changed && decision === 'unresolved' && !explainsDeferral(reason)) errors.push(`unresolved_verification_missing:${field}`);
    else if (!changed && decision !== 'unresolved' && !explainsInsufficiency(reason)) errors.push(`reason_insufficient:${field}`);
    else if (changed && !linksIncrementalAnswer(reason, current, context)) errors.push(`reason_untraced:${field}`);
    if (reason) errors.push(...retentionReviewErrors(field, reason, decision, context));
    if (assertsConfirmation(context.supplement) && evidenceStatus === 'confirmed-fact') errors.push(`claim_promoted_to_fact:${field}`);
    if (assertsConfirmation(context.supplement) && (field === 'judgment' || field === 'hypotheses') && claimPromoted(current)) {
      errors.push(`claim_promoted_to_fact:${field}`);
    }
    if (assertsConfirmation(context.supplement) && (field === 'judgment' || field === 'hypotheses') && reason && !marksClaimAsUnverified(reason)) {
      errors.push(`claim_unmarked:${field}`);
    }
    const reviewProse = [reason, reviewFieldText(change, 'impactAssessment'), reviewFieldText(change, 'holdReason')].join('\n');
    if (
      field === 'judgment' &&
      !changed &&
      decision === 'retained' &&
      supplementConflicts(context.previousJudgment, context.supplement) &&
      !/충돌|반대로|하지 않/.test(reviewProse)
    ) {
      errors.push('conflict_unreviewed:judgment');
    }
    if (field === 'judgment' && context.choiceLabel && reason && choiceOnlyGrounds(reason, context.choiceLabel)) {
      errors.push('reason_choice_copied:judgment');
    }
    if (!evidenceStatus || !EVIDENCE_STATUSES.has(evidenceStatus)) errors.push(`evidence_status:${field}`);
    else if (absentInputMarkers(context.supplement).length > 0 && evidenceStatus !== FOLLOW_UP_FOUNDER_ANSWER_STATUS) {
      errors.push(`evidence_status_promoted:${field}`);
    }
    errors.push(...reviewFieldErrors(field, change, decision, context));
    if (priorityChoice && field === 'nextVerification' && !changed) errors.push('next_verification_unchanged');
  }
  if (recordedReasons.every((reason) => reason.length > 0) && new Set(recordedReasons).size === 1) errors.push('reason_copied_across_fields');
  if (
    context.choiceLabel &&
    recordedReasons.every((reason) => reason.length > 0 && choiceOnlyGrounds(reason, context.choiceLabel ?? ''))
  ) {
    errors.push('reason_repeated_choice');
  }
  const linked = [judgment, hypotheses.join('\n'), nextVerification, nextQuestion, recordedReasons.join('\n')].join('\n');
  if (context.choiceLabel && !linked.includes(context.choiceLabel)) errors.push('choice_unlinked');
  if (judgmentRestatesChoice(judgment, context.choiceLabel)) errors.push('choice_promoted_to_judgment');
  if (
    unconfirmedHypotheses(context.previousHypotheses) &&
    absentInputMarkers(context.supplement).length > 0 &&
    hypothesisLine(hypotheses) !== hypothesisLine(context.previousHypotheses)
  ) {
    errors.push('hypothesis_unconfirmed_replaced');
  }
  if (
    unconfirmedHypotheses(context.previousHypotheses) &&
    hypothesisLine(hypotheses) !== hypothesisLine(context.previousHypotheses) &&
    forecastsDemand(hypotheses.join('\n'))
  ) {
    errors.push('hypothesis_demand_ungrounded');
  }
  const claimText = [judgment, hypotheses.join('\n'), nextVerification, nextQuestion, recordedReasons.join('\n')].join('\n');
  const absence = absentInputMarkers(context.supplement);
  if (absence.length > 0 && !absence.some((marker) => claimText.includes(marker))) errors.push('supplement_unlinked');
  if (inventedPresence(claimText, context.supplement)) errors.push('absent_input_invented');
  const experienceFirst = experienceFirstChoice(context.choiceLabel);
  const choiceOnly = experienceFirst && context.supplement.trim().length === 0;
  const claimChoice = experienceFirst && assertsConfirmation(context.supplement);
  if (experienceFirst && context.choiceLabel && !nextVerification.includes(context.choiceLabel)) errors.push('next_verification_choice_absent');
  if (experienceFirst && !nextVerification.includes('체험')) errors.push('next_verification_priority_missing');
  if (
    experienceFirst &&
    !assertsConfirmation(context.supplement) &&
    absentInputMarkers(context.supplement).some((marker) => marker.includes('양조장')) &&
    !verificationPlanReady(nextVerification)
  ) {
    errors.push('next_verification_not_executable');
  }
  if (choiceOnly && (nextVerification === FOLLOW_UP_BREWERY_VERIFICATION_PLAN || nextVerification.includes('양조장 후보'))) {
    errors.push('plan_not_from_input');
  }
  if (choiceOnly && nextQuestion.includes('양조장 후보')) errors.push('question_not_from_input');
  if (
    choiceOnly &&
    unconfirmedHypotheses(context.previousHypotheses) &&
    hypothesisLine(hypotheses) !== hypothesisLine(context.previousHypotheses)
  ) {
    errors.push('hypothesis_unconfirmed_replaced');
  }
  if (choiceOnly && judgment !== context.previousJudgment.trim()) errors.push('judgment_changed_by_choice');
  if (claimChoice && nextVerification === FOLLOW_UP_BREWERY_VERIFICATION_PLAN) errors.push('plan_not_from_input');
  if (claimChoice && !/계약서|증빙|입금/.test(nextVerification)) errors.push('claim_verification_missing');
  if (choiceOnly && marketingPlanUnfocused(nextVerification)) errors.push('priority_plan_unfocused');
  if (choiceOnly && /온라인 마케팅/.test(context.previousNextVerification) && !/온라인 마케팅/.test(nextVerification)) {
    errors.push('priority_task_dropped');
  }
  if ((choiceOnly || claimChoice) && nextQuestion === context.previousNextQuestion.trim()) errors.push('question_unchanged');
  if (claimChoice && !/계약서|증빙|입금/.test(nextQuestion)) errors.push('question_claim_unlinked');
  if (experienceFirst && !asksAQuestion(nextQuestion)) errors.push('next_question_not_a_question');
  if (experienceFirst && /마케팅/.test(nextQuestion) && /효과|우선|먼저|검증/.test(nextQuestion)) errors.push('next_question_regressed');
  if (experienceFirst) {
    const markers = absentInputMarkers(context.supplement);
    const focus = markers.length > 0 ? markers : ['체험'];
    if (!focus.some((marker) => nextQuestion.includes(marker)) && !nextQuestion.includes('체험')) errors.push('next_question_unknown_missing');
  }
  const prose = [judgment, hypotheses.join('\n'), nextVerification, nextQuestion, JSON.stringify(changes ?? [])].join('\n');
  if (choiceOnly && /확정된 양조장|확보했다|계약했다|양조장이 확정|계약을 맺/.test(prose)) errors.push('input_invented');
  if (/강화되었|강화됐다|수요가 확인되었|수요가 확인됐다|수요가 있다/.test(prose)) errors.push('hypothesis_strengthened');
  return [...new Set(errors)];
}

/** True when two reviews reuse the same judgment input or the same hold sentence. */
export function reflectionReviewsRepeat(leftRaw: string, rightRaw: string): boolean {
  const read = (raw: string) => {
    const parsed = readReflectionObject(raw);
    const changes = Array.isArray(parsed?.changes) ? parsed.changes : [];
    const judgment = changes.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === 'judgment') as
      | Record<string, unknown>
      | undefined;
    return {
      input: typeof judgment?.inputConsidered === 'string' ? judgment.inputConsidered : '',
      hold: typeof judgment?.holdReason === 'string' ? judgment.holdReason : '',
    };
  };
  const left = read(leftRaw);
  const right = read(rightRaw);
  if (!left.input || !right.input) return false;
  return compact(left.input) === compact(right.input) || compact(left.hold) === compact(right.hold);
}

/**
 * Applies a reflection return onto the stored sections.
 * Unchanged fields stay. sections is null when the return cannot be stored.
 * The previous object is not modified.
 */
export function normalizeIncrementalSections(
  previous: ReviewSections,
  raw: string,
  context: FollowUpOutputContext,
): IncrementalNormalization {
  const errors = incrementalReflectionErrors(raw, context);
  if (errors.length > 0) return { sections: null, errors };
  const parsed = readReflectionObject(raw);
  if (!parsed) return { sections: null, errors: ['follow_up_output_unparsed'] };
  const next = cloneReviewSections(previous);
  const judgment = typeof parsed.judgment === 'string' ? parsed.judgment.trim() : '';
  const nextQuestion = typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.trim() : '';
  const nextVerification = typeof parsed.nextVerification === 'string' ? parsed.nextVerification.trim() : '';
  const hypotheses = Array.isArray(parsed.hypotheses)
    ? parsed.hypotheses.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  next.judgment = judgment;
  next.hypotheses = hypotheses;
  next.nextQuestion = nextQuestion;
  next.revenueModel = previous.revenueModel;
  if (nextQuestion !== previous.nextQuestion) {
    const questionChange = (Array.isArray(parsed.changes) ? parsed.changes : []).find(
      (item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === 'nextQuestion',
    ) as Record<string, unknown> | undefined;
    const reason = typeof questionChange?.reason === 'string' ? questionChange.reason.trim() : '';
    if (reason) next.nextQuestionReason = reason;
  }
  if (next.analysis) next.analysis = { ...next.analysis, nextVerification };
  const storageErrors = sectionsStorageErrors(next);
  if (storageErrors.length > 0) return { sections: null, errors: storageErrors };
  return { sections: next, errors: [] };
}

/**
 * Echo-era reflection contract. Kept so recorded runs stay scored the same way.
 * Storage uses normalizeIncrementalSections. An empty list is not a reflection pass.
 */
export function followUpOutputContractErrors(raw: string, context: FollowUpOutputContext): string[] {
  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (!parsed) return ['follow_up_output_unparsed'];
  const errors: string[] = [];
  const judgment = typeof parsed.judgment === 'string' ? parsed.judgment.trim() : '';
  const nextVerification = typeof parsed.nextVerification === 'string' ? parsed.nextVerification.trim() : '';
  const nextQuestion = typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.trim() : '';
  const hypotheses = Array.isArray(parsed.hypotheses)
    ? parsed.hypotheses.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (!judgment) errors.push('follow_up_output_missing_judgment');
  if (!Array.isArray(parsed.hypotheses) || hypotheses.length === 0) errors.push('follow_up_output_missing_hypotheses');
  if (!nextVerification) errors.push('follow_up_output_missing_nextVerification');
  if (!nextQuestion) errors.push('follow_up_output_missing_nextQuestion');
  const revenue =
    typeof parsed.revenueModel === 'string'
      ? parsed.revenueModel.trim()
      : typeof parsed.business_model === 'string'
        ? parsed.business_model.trim()
        : '';
  if (!revenue) errors.push('follow_up_output_missing_revenueModel');
  else if (context.previousRevenueModel.trim() && revenue !== context.previousRevenueModel.trim()) errors.push('revenue_hypothesis_replaced');
  else if (context.previousRevenueModel.includes('가설') && !revenue.includes('가설')) errors.push('hypothesis_label_removed');
  if (!context.previousRevenueModel.trim() && revenue) errors.push('revenue_hypothesis_invented');
  if (/가격[^。\n]{0,16}없/.test(context.supplement) && revenue && !revenue.includes('가설') && /참가비|수익/.test(revenue)) {
    errors.push('hypothesis_label_removed');
  }
  const facts = Array.isArray(parsed.founderFacts) ? parsed.founderFacts.map((item) => String(item)) : [];
  if (context.choiceLabel && facts.some((fact) => fact.includes(context.choiceLabel ?? ''))) errors.push('choice_in_founder_facts');
  if (context.supplement && facts.some((fact) => fact.includes(context.supplement))) errors.push('supplement_in_founder_facts');
  const changes = Array.isArray(parsed.changes) ? parsed.changes : null;
  if (!Object.prototype.hasOwnProperty.call(parsed, 'changes') || parsed.changes == null) errors.push('follow_up_output_missing_changes');
  else if (!changes) errors.push('follow_up_output_changes_type');
  else if (changes.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) errors.push('follow_up_output_change_type');
  if (context.choiceLabel && changes) {
    const root = parsed.choiceTrace;
    const rootObject = Boolean(root && typeof root === 'object' && !Array.isArray(root));
    const elementTraces = FOLLOW_UP_OUTPUT_FIELDS.map((field) => {
      const change = changes.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === field) as
        | Record<string, unknown>
        | undefined;
      const trace = change?.choiceTrace;
      return Boolean(trace && typeof trace === 'object' && !Array.isArray(trace));
    });
    if (rootObject && elementTraces.every((present) => !present)) errors.push('choice_trace_root_only');
  }
  const expectedPrevious: Record<(typeof FOLLOW_UP_OUTPUT_FIELDS)[number], string> = {
    judgment: context.previousJudgment,
    hypotheses: hypothesisLine(context.previousHypotheses),
    nextVerification: context.previousNextVerification,
    nextQuestion: context.previousNextQuestion,
  };
  const expectedUpdated: Record<(typeof FOLLOW_UP_OUTPUT_FIELDS)[number], string> = {
    judgment,
    hypotheses: hypothesisLine(hypotheses),
    nextVerification,
    nextQuestion,
  };
  const priorityChoice = Boolean(context.choiceLabel && /먼저|검증/.test(context.choiceLabel));
  for (const field of FOLLOW_UP_OUTPUT_FIELDS) {
    const change = changes?.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === field) as
      | Record<string, unknown>
      | undefined;
    if (!change) {
      errors.push(`follow_up_output_missing_change:${field}`);
      continue;
    }
    const previous = typeof change.previous === 'string' ? change.previous : '';
    const current = typeof change.current === 'string' ? change.current : '';
    const decision = typeof change.decision === 'string' ? change.decision.trim() : '';
    const reason = typeof change.reason === 'string' ? change.reason.trim() : '';
    const evidenceStatus = typeof change.evidenceStatus === 'string' ? change.evidenceStatus.trim() : '';
    if (previous !== expectedPrevious[field]) errors.push(`follow_up_output_previous:${field}`);
    errors.push(...founderAnswerRecordErrors(field, change.founderAnswer, context));
    errors.push(...choiceEffectErrors(field, change.choiceTrace, context));
    if (!Object.prototype.hasOwnProperty.call(change, 'current') || current !== expectedUpdated[field]) errors.push(`follow_up_output_current:${field}`);
    const changed = current !== previous;
    if (!decision) errors.push(`decision_missing:${field}`);
    else if (decision !== (changed ? 'changed' : 'retained')) errors.push(`decision_mismatch:${field}`);
    if (!reason) errors.push(`reason_missing:${field}`);
    else if (reasonIsGeneric(reason)) errors.push(`reason_generic:${field}`);
    else if (!citesFollowUpInput(reason, context)) errors.push(`reason_untraced:${field}`);
    else if (absentInputMarkers(context.supplement).length > 0 && !absentInputMarkers(context.supplement).some((marker) => reason.includes(marker))) {
      errors.push(`reason_missing_supplement:${field}`);
    } else if (!changed && !explainsInsufficiency(reason)) errors.push(`reason_insufficient:${field}`);
    if (reason && !FIELD_REASON_CUES[field].test(reason)) errors.push(`reason_not_field_specific:${field}`);
    if (field === 'judgment' && context.choiceLabel && reason && choiceOnlyGrounds(reason, context.choiceLabel)) {
      errors.push('reason_choice_copied:judgment');
    }
    if (!evidenceStatus || !EVIDENCE_STATUSES.has(evidenceStatus)) errors.push(`evidence_status:${field}`);
    else if (absentInputMarkers(context.supplement).length > 0 && evidenceStatus !== FOLLOW_UP_FOUNDER_ANSWER_STATUS) {
      errors.push(`evidence_status_promoted:${field}`);
    }
    if (priorityChoice && field === 'nextVerification') {
      if (!changed) errors.push('next_verification_unchanged');
      if (context.choiceLabel && !reason.includes(context.choiceLabel)) errors.push('next_verification_choice_unmentioned');
    }
    if (priorityChoice && field === 'nextQuestion' && context.choiceLabel && !reason.includes(context.choiceLabel)) {
      errors.push('next_question_choice_unmentioned');
    } else if (
      priorityChoice &&
      field === 'nextQuestion' &&
      reason &&
      context.supplement.trim() &&
      !citesSupplement(reason, context.supplement)
    ) {
      errors.push('reason_missing_supplement:nextQuestion');
    }
    const trace = change.choiceTrace;
    const effect =
      trace && typeof trace === 'object' && !Array.isArray(trace) && typeof (trace as Record<string, unknown>).effect === 'string'
        ? ((trace as Record<string, unknown>).effect as string).trim()
        : '';
    if (reason && effect && compact(reason) === compact(effect)) errors.push(`reason_repeats_effect:${field}`);
  }
  const experienceFirst = Boolean(
    context.choiceLabel &&
      context.choiceLabel.includes('체험') &&
      context.choiceLabel.includes('먼저') &&
      !context.choiceLabel.includes('마케팅을 먼저'),
  );
  const recordedReasons = FOLLOW_UP_OUTPUT_FIELDS.map((field) => {
    const change = changes?.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === field) as
      | Record<string, unknown>
      | undefined;
    return typeof change?.reason === 'string' ? change.reason.trim() : '';
  });
  if (recordedReasons.every((reason) => reason.length > 0) && new Set(recordedReasons).size === 1) errors.push('reason_copied_across_fields');
  const recordedEffects = FOLLOW_UP_OUTPUT_FIELDS.map((field) => {
    const change = changes?.find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).field === field) as
      | Record<string, unknown>
      | undefined;
    const trace = change?.choiceTrace;
    const record = trace && typeof trace === 'object' && !Array.isArray(trace) ? (trace as Record<string, unknown>) : null;
    return typeof record?.effect === 'string' ? record.effect.trim() : '';
  });
  if (context.choiceLabel && recordedEffects.every((effect) => effect.length > 0) && new Set(recordedEffects).size === 1) {
    errors.push('choice_effect_copied');
  }
  if (
    context.choiceLabel &&
    recordedReasons.every((reason) => reason.length > 0 && choiceOnlyGrounds(reason, context.choiceLabel ?? ''))
  ) {
    errors.push('reason_repeated_choice');
  }
  if (judgmentRestatesChoice(judgment, context.choiceLabel)) errors.push('choice_promoted_to_judgment');
  if (
    unconfirmedHypotheses(context.previousHypotheses) &&
    absentInputMarkers(context.supplement).length > 0 &&
    hypothesisLine(hypotheses) !== hypothesisLine(context.previousHypotheses)
  ) {
    errors.push('hypothesis_unconfirmed_replaced');
  }
  if (
    unconfirmedHypotheses(context.previousHypotheses) &&
    hypothesisLine(hypotheses) !== hypothesisLine(context.previousHypotheses) &&
    forecastsDemand(hypotheses.join('\n'))
  ) {
    errors.push('hypothesis_demand_ungrounded');
  }
  const claimText = [judgment, hypotheses.join('\n'), nextVerification, nextQuestion, recordedReasons.join('\n')].join('\n');
  if (inventedPresence(claimText, context.supplement)) errors.push('absent_input_invented');
  if (experienceFirst && context.choiceLabel && !nextVerification.includes(context.choiceLabel)) errors.push('next_verification_choice_absent');
  if (experienceFirst && !nextVerification.includes('체험')) errors.push('next_verification_priority_missing');
  if (
    experienceFirst &&
    absentInputMarkers(context.supplement).some((marker) => marker.includes('양조장')) &&
    !verificationPlanReady(nextVerification)
  ) {
    errors.push('next_verification_not_executable');
  }
  if (experienceFirst && !asksAQuestion(nextQuestion)) errors.push('next_question_not_a_question');
  if (experienceFirst && /마케팅/.test(nextQuestion) && /효과|우선|먼저|검증/.test(nextQuestion)) errors.push('next_question_regressed');
  if (experienceFirst) {
    const markers = absentInputMarkers(context.supplement);
    const focus = markers.length > 0 ? markers : ['체험'];
    if (!focus.some((marker) => nextQuestion.includes(marker)) && !nextQuestion.includes('체험')) errors.push('next_question_unknown_missing');
  }
  const prose = [judgment, hypotheses.join('\n'), nextVerification, nextQuestion, JSON.stringify(changes ?? [])].join('\n');
  if (/강화되었|강화됐다|수요가 확인되었|수요가 확인됐다|수요가 있다/.test(prose)) errors.push('hypothesis_strengthened');
  return [...new Set(errors)];
}

function followUpBasePrompt(): string {
  return [
    '당신은 ALABOM의 AI PM이다.',
    '입력에 없는 가격, 인원, 매출, 시장 규모는 만들지 않는다.',
    'JSON 객체만 반환한다.',
    '모델 이름이나 공급사 이름은 쓰지 않는다.',
    ...FOLLOW_UP_SEPARATION_RULES,
  ].join(' ');
}

function gatedFollowUpPrompt(): string {
  return [
    followUpBasePrompt(),
    '키는 problem, target_customer, solution, business_model, validation_metric, nextQuestion 이다.',
    'nextQuestion은 이 입력에서 창업자가 답해야 판단이 바뀌는 질문 하나다.',
    '질문 목록의 문장을 복사하지 않는다.',
    '응답 JSON에 confirmation을 넣는다.',
    'confirmation.problem, confirmation.target_customer, confirmation.business_model은 unconfirmed다.',
    '그 세 문장은 확인 전이며 확정된 사실로 쓰지 않는다.',
    'doNotDeleteUnrelated이면 solution과 validation_metric을 비우지 않는다.',
    'requiredMeaning이 ask_what_core_is_missing이면 nextQuestion은 누락된 핵심이 무엇인지 묻는다.',
    '파트너십이나 계획 질문으로 바꾸지 않는다.',
  ].join(' ');
}

/**
 * Names the failed checks from the first response.
 * It tells the model which stored values to restore. It does not write the review.
 */
function failedReviewPhrases(raw: string | undefined): { judgmentReason: string; hypothesesReason: string; plan: string } {
  if (!raw) return { judgmentReason: '', hypothesesReason: '', plan: '' };
  try {
    const parsed = JSON.parse(raw) as { nextVerification?: unknown; changes?: unknown };
    const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
    const reasonFor = (field: string) => {
      const change = changes.find((item) => item && typeof item === 'object' && (item as { field?: unknown }).field === field) as
        | { reason?: unknown }
        | undefined;
      return typeof change?.reason === 'string' ? change.reason.trim().slice(0, 80) : '';
    };
    return {
      judgmentReason: reasonFor('judgment'),
      hypothesesReason: reasonFor('hypotheses'),
      plan: typeof parsed.nextVerification === 'string' ? parsed.nextVerification.trim().slice(0, 120) : '',
    };
  } catch {
    return { judgmentReason: '', hypothesesReason: '', plan: '' };
  }
}

export function followUpRepairMessage(errors: string[], failedRaw?: string): string {
  const has = (code: string) => errors.some((error) => error === code || error.startsWith(`${code}:`));
  const lines = [
    '이전 JSON은 저장되지 않았다.',
    `실패 코드: ${errors.join(',')}.`,
    '이전 JSON과 같은 응답을 다시 내면 실패다.',
    '여섯 검토 필드를 비우거나 선택 문장만 복사하지 마라.',
    '없는 확정 사실을 만들지 마라. 수요가 있다고 단정하지 마라.',
    'retentionDecision은 decision과 같아야 한다.',
    'judgment와 hypotheses는 문장이 previous와 같으면 decision이 retained다. nextVerification은 내용이 바뀌면 decision이 changed다. 문장을 유지한 채 changed로 두면 실패다.',
    'judgment.reason과 hypotheses.reason 각각에 영향, 유지 이유, 근거가 부족, 바꾸려면 필요한 증거를 모두 넣어라. holdReason에만 두면 실패다.',
  ];
  if (has('choice_promoted_to_judgment') || has('judgment_changed_by_choice')) {
    lines.push('judgment.current는 입력의 previousJudgment와 같은 문장으로 되돌려라. decision은 retained다. 선택은 검증 우선순위이며 판단의 증거가 아니다.');
  }
  if (has('input_echo_only')) {
    lines.push('inputConsidered를 다시 써라. founderChoice.label과 같으면 실패다. 그 문장만 남겨 두지 마라.');
  }
  if (has('status_repeat') || has('trace_relation_missing')) {
    lines.push('impactAssessment와 holdReason에 여전히 유효하다, 변화가 없다, 새로운 정보가 없다만 쓰지 마라. 선택이 판단의 근거인지, 가설과 관련되는지, 검증 계획의 우선순위인지를 구분해 적어라. hypotheses.impactAssessment에는 선택 또는 계획, 그리고 가설 또는 미확인을 적어라.');
  }
  if (
    has('retention_hold_missing') ||
    has('reason_insufficient') ||
    has('review_hold_generic') ||
    has('retention_sufficiency_missing') ||
    has('retention_effect_missing')
  ) {
    lines.push('reason 한 문장 안에 바꾸지 않고 유지, 근거가 부족, 미치는 영향, 아직 필요한 증거를 넣어라. holdReason에만 두면 실패다. 동일하며, 추가 정보가 필요하다, 방향성이 명확하다만 쓰면 실패다.');
  }
  if (has('retention_evidence_missing') || has('trace_evidence_unrelated')) {
    lines.push('reason과 holdReason과 evidenceNeeded에 아직 없는 증거를 적어라. 체험 선택이면 고객 인터뷰나 예약 의향이다. 확정 주장이면 계약서나 입금 증빙이다.');
  }
  if (has('hypothesis_unconfirmed_replaced') || has('hypothesis_demand_ungrounded')) {
    lines.push('hypotheses.current는 저장된 가설 그대로다. 미확인이면 미확인만 둔다. 수요가 있다, 있을 것이다, 성공 가능성을 높인다를 넣지 마라.');
  }
  const claimRepair =
    has('claim_unmarked') ||
    has('claim_promoted_to_fact') ||
    has('claim_verification_missing') ||
    has('claim_unlinked') ||
    has('question_claim_unlinked') ||
    has('retention_input_missing');
  if (claimRepair) {
    lines.push(
      '확정 주장은 주장으로 적고 확인된 사실이 아니라고 적어라. judgment와 hypotheses의 reason에도 양조장 또는 계약, 바꾸지 않고 유지, 근거가 부족, 계약서가 필요를 넣어라. holdReason에만 두면 실패다. evidenceStatus는 unverified-input이다. judgment.current와 hypotheses.current가 previous와 같으면 그 decision은 retained다. 문장을 유지한 채 changed로 두면 실패다. nextVerification.current는 founderChoice.label을 그대로 포함하고 계약서 또는 입금 증빙 확인을 함께 담는다. 라벨을 다른 말로 바꾸면 실패다. nextVerification.decision만 changed다. sufficiencyAssessment는 partial이다.',
    );
  } else if (
    has('next_verification_choice_absent') ||
    has('choice_unlinked') ||
    has('priority_plan_unfocused') ||
    has('priority_task_dropped') ||
    has('plan_not_from_input')
  ) {
    lines.push(
      'nextVerification.current는 founderChoice.label을 그대로 포함한다. 라벨을 다른 말로 바꾸면 실패다. 체험 프로그램의 수요와 실행 가능성을 먼저 확인하는 순서를 잇는다. previousVerification에 온라인 마케팅 검증이 있으면 빼지 마라. 그 다음에도 온라인 마케팅 검증은 남아 있다고 적어라. 및, 같이, 함께로 붙이면 실패다. 수요가 확인되었다고 쓰지 마라. nextVerification.decision만 changed다. judgment.decision은 retained다.',
    );
  }
  if (has('decision_mismatch')) {
    lines.push('current가 previous와 같으면 decision과 retentionDecision은 retained다. 문장을 유지한 채 changed로 두면 실패다. current가 다르면 decision은 changed이고 sufficiencyAssessment는 partial이다. 판단의 유지와 검증 계획의 변경은 다른 결정이다.');
  }
  if (
    has('follow_up_output_previous') ||
    has('question_unchanged') ||
    has('question_not_from_input') ||
    has('next_question_unknown_missing') ||
    has('question_claim_unlinked') ||
    has('plan_not_from_input')
  ) {
    lines.push(
      'nextQuestion.previous는 previousAnalysis.nextQuestion과 같다. current가 그 질문과 같으면 실패다. current는 이번 입력의 남은 불확실성을 묻는다. 추가 설명이 없으면 미확인 가설의 체험 참여 의향이나 고객 인터뷰를 묻는다. 확정 주장이 있으면 계약서나 입금 증빙을 묻는다. 입력에 없는 다른 검증 대상으로 바꾸지 마라.',
    );
  }
  if (has('sufficiency_conflict')) {
    lines.push('선택만으로 judgment를 changed로 두지 마라. 문장이 같은데 changed이면서 sufficiencyAssessment가 insufficient이면 실패다. retained의 sufficiencyAssessment는 insufficient다. changed인 nextVerification의 sufficiencyAssessment는 partial이다.');
  }
  const failed = failedReviewPhrases(failedRaw);
  if (failed.judgmentReason) lines.push(`judgment.reason의 이전 문장은 실패다. 다시 쓰지 마라. ${failed.judgmentReason}`);
  if (failed.hypothesesReason) lines.push(`hypotheses.reason의 이전 문장은 실패다. 다시 쓰지 마라. ${failed.hypothesesReason}`);
  if (failed.plan.includes('및')) lines.push(`nextVerification의 이전에 및이 있다. 및을 빼고 그 다음에도 온라인 마케팅 검증은 남아 있다고 적어라. ${failed.plan}`);
  lines.push('같은 스키마의 JSON만 반환하라.');
  return lines.join(' ');
}

function reviewRoute(supplement: string): string[] {
  if (supplement.includes('확정된 양조장은 없다')) {
    return [
      'judgment는 저장 판단을 유지한다. 선택이나 검증 계획을 판단으로 옮기지 않는다.',
      `nextVerification의 current는 이 문장이다. ${FOLLOW_UP_BREWERY_VERIFICATION_PLAN}`,
      '그 문장은 검증 계획이다. 양조장 후보, 협력 가능 여부, 참여 의향, 가격과 예약의 별도 검증 순서다. 어느 단계도 끝난 사실이 아니다. decision은 changed이다.',
      'nextVerification의 reason은 그 순서가 필요한 이유를 적는다. 선택 문장을 그대로 반복하지 않아도 된다.',
      'nextQuestion의 current는 양조장 후보가 있는가? 이다. 물음표로 끝난다. 지시 문장을 질문 값으로 쓰면 실패다. previous는 저장된 질문 그대로다. decision은 changed이다.',
      'nextQuestion의 reason은 그 질문이 남은 불확실성인 이유를 적는다.',
    ];
  }
  if (assertsConfirmation(supplement)) {
    return [
      'founderChoice와 founderSupplement는 다른 입력이다. 선택은 검증 우선순위다. kind는 unverified-claim이다. 가설의 검증 순서와 확정 주장의 영향을 따로 적어라.',
      '확정 주장은 확인된 사실이 아니다. 사실로 승격하지 마라.',
      'judgment.current는 previousJudgment와 같은 문장이다. decision은 retained다. sufficiencyAssessment는 insufficient다. evidenceStatus는 unverified-input이다. 문장이 같은데 decision을 changed로 두면 실패다.',
      'judgment.inputConsidered는 양조장 확정 문장을 주장으로 적고 증빙이 없다고 적는다. 선택 문장만 쓰면 실패다. 계약서가 필요하다고 적는다.',
      'judgment.reason 한 문장에 판단에 미치는 영향, 양조장, 주장, 확인된 사실이 아니다, 바꾸지 않고 유지, 근거가 부족, 계약서가 필요를 넣어라. holdReason에만 두면 실패다.',
      'hypotheses가 미확인이면 current도 미확인만 둔다. decision은 retained다. 문장이 같은데 decision을 changed로 두면 실패다. hypotheses의 inputConsidered와 reason은 양조장 주장을 가설의 근거로 쓰지 않고, 가설에 미치는 영향, 미확인으로 유지, 근거가 부족, 계약서가 필요를 한 문장에 넣어라.',
      'nextVerification.current는 founderChoice.label을 글자 그대로 포함한다. 체험 수요와 실행 가능성, 계약서나 입금 증빙 확인을 함께 적는다. 선택 문장만 쓰면 실패다. 수요가 있다고 단정하지 마라. nextVerification.decision만 changed다. sufficiencyAssessment는 partial이다.',
      'nextQuestion.current는 저장된 이전 질문과 다른 질문이다. 계약서나 입금 증빙을 묻는다. 물음표로 끝난다. previous는 previousAnalysis.nextQuestion 그대로다.',
    ];
  }
  if (!supplement.trim()) {
    return [
      'founderChoice의 kind는 plan-choice다. 이것은 검증 우선순위다. 사업 성공의 증거가 아니다. 가설의 검증 순서를 바꾼다.',
      'founderSupplement의 kind는 absent다. 없는 확정과 수요를 만들지 마라.',
      'judgment.current는 previousJudgment와 같은 문장이다. decision은 retained다. sufficiencyAssessment는 insufficient다. evidenceStatus는 unconfirmed다. 문장이 같은데 decision을 changed로 두면 실패다.',
      'judgment.inputConsidered가 founderChoice.label과 같으면 실패다. 선택 문장 뒤에 수요의 증거가 아니라는 말을 적어라. impactAssessment는 선택한 계획이 판단의 근거가 아니라는 관계를 적는다.',
      'judgment.reason 한 문장에 판단에 미치는 영향, 바꾸지 않고 유지, 근거가 부족, 고객 인터뷰가 필요를 넣어라. holdReason에만 두면 실패다. 방향성이 명확하다는 쓰지 마라.',
      'hypotheses가 미확인이면 current도 미확인만 둔다. decision은 retained다. 수요가 있다를 넣으면 실패다. inputConsidered가 선택 문장과 같으면 실패다.',
      'hypotheses.impactAssessment는 선택 또는 계획과 가설 또는 미확인을 적고, 가설의 검증 순서가 어떻게 바뀌는지 적는다.',
      'hypotheses.reason 한 문장에 가설에 미치는 영향, 미확인, 유지, 근거가 부족, 인터뷰가 필요를 넣어라. holdReason에만 두면 실패다. 미확인 상태만 반복하면 실패다.',
      'nextVerification.current는 founderChoice.label을 글자 그대로 앞에 둔다. 체험 수요를 먼저 확인한다. 그 다음에도 온라인 마케팅 검증은 남아 있다고 적는다. 문장에 및이 있으면 실패다. nextVerification.reason은 체험을 먼저 보는 이유를 적는다. 순서가 변경되었다만 쓰면 실패다. nextVerification.decision만 changed다.',
      'nextQuestion.current는 체험 참여 의향을 묻는다. 체험을 포함한다. 물음표로 끝난다. previous는 previousAnalysis.nextQuestion 그대로다. current가 그 질문과 같으면 실패다.',
    ];
  }
  return [
    'founderChoice는 검증 우선순위다. 그 문장만으로 저장 판단을 바꾸지 마라.',
    '추가 설명이 기존 판단과 충돌하면 그 충돌을 검토한다. 없으면 판단을 유지하고, 유지 이유에 무엇이 부족한지 적는다.',
    '변화가 없다, 여전히 유효하다, 새로운 정보가 없다만 쓰면 실패다.',
    'nextVerification은 그 입력에서 아직 확인되지 않은 증거를 확인하는 순서다. 양조장 후보가 있는가로 바꾸지 마라.',
  ];
}

function reviewSystemPrompt(supplement: string): string {
  return [
    followUpBasePrompt(),
    `반환 계약 ${FOLLOW_UP_OUTPUT_CONTRACT}.`,
    '필수 키는 judgment, hypotheses, nextVerification, nextQuestion, revenueModel, changes 이다.',
    '필수 키가 없으면 실패다.',
    'hypotheses는 비어 있지 않은 문자열 배열이다.',
    'changes는 JSON 배열이다. 객체 맵, 문자열, 누락, 배열이 아닌 원소는 실패다.',
    '배열 원소는 네 개다. field는 judgment, hypotheses, nextVerification, nextQuestion 이다.',
    '원소 키는 field, previous, current, decision, reason, evidenceStatus, inputConsidered, impactAssessment, sufficiencyAssessment, retentionDecision, holdReason, evidenceNeeded 이다. founderAnswer와 choiceTrace는 넣지 않는다. 코드가 창업자 답변을 보존한다. 코드는 여섯 검토 필드를 만들지 않는다.',
    'previous는 저장된 값 그대로다. nextQuestion.previous가 저장된 질문과 다르면 실패다.',
    'current는 그 필드의 반환값과 같다. hypotheses의 previous와 current는 항목을 " / "로 잇는다.',
    'decision은 changed, retained, unresolved 중 하나다. current가 previous와 다르면 changed다. 값이 같고 답변을 검토해 유지하면 retained다. 값이 같고 근거가 부족해 판단을 유보하면 unresolved다.',
    'reason이 비어 있으면 실패다. retained여도 비어 있으면 실패다. 새 정보가 없어 유지, 바꾸지 않은 이유, 이전과 동일한 상태라고만 쓰면 실패다.',
    'reason은 그 답변이 그 필드에 미치는 영향을 설명한다. 선택 문장과 추가 설명을 원소마다 복사하지 않는다.',
    'inputLedger는 founderChoice, founderSupplement, previousJudgment, previousHypotheses, previousVerification을 구분한다. kind가 다른 입력을 같은 문장으로 다루지 않는다. 관련성이 낮으면 낮다고 적는다.',
    'judgment와 hypotheses의 inputConsidered는 답변이 새로 말한 정보다. impactAssessment는 기존 판단이나 가설에 미치는 영향이다. sufficiencyAssessment는 sufficient, insufficient, partial 중 하나다. retained 또는 unresolved이면 sufficient가 아니다. retentionDecision은 decision과 같다. holdReason은 유지하거나 유보하는 구체적 이유다. 방향성만 적거나 추가 정보가 필요하다만 쓰면 실패다. evidenceNeeded는 판단을 바꾸려면 필요한 계약서, 증빙, 예약, 입금, 확인, 인터뷰, 기록이다. 확정 주장을 확인된 사실로 쓰지 않는다.',
    '확정, 계약, 확보는 창업자의 주장일 수 있다. 계약서나 입금 기록이 없으면 확인된 사실이 아니다. 주장이라고 적고 evidenceStatus는 unverified-input이다. 그 주장을 무시하지 않는다.',
    '답변이 기존 판단과 충돌하면 검토 없이 retained하지 않는다. 판단을 바꾸거나 unresolved로 충돌을 적는다.',
    'retained인 reason은 추가 설명이 왜 그 필드를 바꾸기에 부족한지 적는다. 네 reason은 서로 다르다.',
    'judgment의 reason에는 판단, hypotheses에는 가설 또는 미확인, nextVerification에는 검증, nextQuestion에는 질문이라는 말을 넣는다.',
    '판단의 reason이 선택 문장뿐이면 실패다. 선택은 그 계획이 옳다는 근거가 아니다.',
    'evidenceStatus는 unverified-input, confirmed-fact, unconfirmed 중 하나다. 예약 고객, 가격, 계약, 확정된 양조장이 없다고 하면 unverified-input 이다. confirmed-fact로 쓰면 실패다.',
    'hypotheses는 미확인이면 retained다. 그 없음이 가설을 확정하지 못한다고 reason에 적는다. 가설 current에 수요 문장을 넣지 않는다.',
    ...reviewRoute(supplement),
    'revenueModel은 previousAnalysis.revenueModel 문장을 그대로 복사한다. 빼거나 고치면 실패다. 가설 표시를 지우거나 확정 수익으로 바꾸지 않는다. 저장된 값이 없으면 새 문장을 만들지 않는다.',
    'founderFacts에 선택 문장이나 추가 설명을 넣지 않는다.',
    '가설이 강화되었다고 쓰지 않는다. 수요가 있다고 단정하지 않는다.',
  ].join(' ');
}

function firstReviewSystemPrompt(): string {
  return [
    `프롬프트 버전 ${AI_PM_FIRST_PROMPT_VERSION}. 당신은 초기 창업자의 사업성 검토를 돕는 전략 파트너다. 요약으로 끝내지 말고 성립 조건과 가장 큰 불확실성을 분석한다.`,
    '창업자가 아직 고르지 않은 답을 사실로 만들지 않는다. 첫 질문은 정도(높다, 낮다)가 아니라 사업의 갈림길을 가른다.',
    '사실, 추론, 가설을 구분하고 추론과 가설에는 그 말을 붙인다. 정보가 적어도 중단하지 않는다.',
    '고객, 문제, 기존 대안, 가치, 이용자와 지불자, 수익 구조, 운영, 차별화, 경쟁을 검토한다.',
    '가격, 인원, 매출, 시장 규모, 수수료, 참가비, 제휴 확정은 입력에 없으면 사실로 쓰지 않는다. 가능한 수익은 가설이라고 적는다.',
    '분석을 마친 뒤, 한 번의 답으로 불확실성이 가장 많이 줄어드는 미확인 가정 하나만 질문으로 만든다.',
    '모든 사업에 결제 여부를 먼저 묻지 않는다. 높다, 낮다, 미정처럼 정도만 다른 선택지는 만들지 않는다.',
    '선택지는 서로 다른 문제, 고객, 지불자, 운영 방식이어야 한다. 아직 정하지 못한 상태와 기타 / 직접 입력을 포함한다.',
    'JSON만 반환한다. 모델 이름이나 공급사 이름은 쓰지 않는다.',
    '키는 summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices 이다.',
    'summary는 원문을 반영한 설명, judgment는 예비 판단과 근거, nextVerification은 적은 비용의 확인 행동이다. assumptions는 1개에서 3개다.',
  ].join(' ');
}

function readingCallExcerpt(content: string): Pick<ReviewCallNote, 'judgment' | 'nextQuestion' | 'nextVerification'> {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const pick = (key: string) => (typeof parsed[key] === 'string' ? parsed[key].slice(0, 400) : '');
    const judgment = pick('judgment');
    const nextQuestion = pick('nextQuestion');
    const nextVerification = pick('nextVerification');
    return {
      ...(judgment ? { judgment } : {}),
      ...(nextQuestion ? { nextQuestion } : {}),
      ...(nextVerification ? { nextVerification } : {}),
    };
  } catch {
    return {};
  }
}

async function finishCall(input: {
  store: AiPmReviewStore;
  input: {
    userId: string;
    projectId: string;
    text: string;
    origin: StoredReview['inputOrigin'];
    fileName: string | null;
    now: string;
    evidence: StoredReview['evidence'];
  };
  sha: string;
  version: number;
  parentReviewId: string | null;
  sourceFeedbackId: string | null;
  supplementSha: string | null;
  request: ChatRequest;
  chat: ReviewChat;
  gate?: { previous: ReviewSections; marks: ReviewMark[] } | null;
  outputContract?: FollowUpOutputContext | null;
  previousSections?: ReviewSections | null;
  consultingAnswer?: { question: string; choiceLabel: string | null; supplement: string } | null;
  founderAnswerSource?: FounderAnswerCitation | null;
  /** Structural reading checks. They do not choose the business judgment. */
  readingIssues?: (content: string) => string[];
  readingRepairContext?: { supplement?: string };
}): Promise<{ called: boolean; record: StoredReview; view: AiPmReviewView }> {
  const started = Date.now();
  try {
    const first = await input.chat(input.request);
    let response = first;
    let callCount = 1;
    let firstRawContent: string | null = null;
    const callLedger: ReviewCallNote[] = [];
    const noteCall = (content: string, result: ChatResponse) => {
      if (!input.readingIssues) return;
      const known = result.usageKnown === true;
      callLedger.push({
        index: callLedger.length + 1,
        promptTokens: known ? result.usage.inputTokens : null,
        completionTokens: known ? result.usage.outputTokens : null,
        totalTokens: known ? result.usage.totalTokens : null,
        readingIssues: input.readingIssues(content),
        ...readingCallExcerpt(content),
      });
    };
    noteCall(first.content, first);
    let usageKnown = first.usageKnown === true;
    let promptTokens = usageKnown ? first.usage.inputTokens : null;
    let completionTokens = usageKnown ? first.usage.outputTokens : null;
    let totalTokens = usageKnown ? first.usage.totalTokens : null;
    const score = (content: string) =>
      input.outputContract && input.previousSections
        ? normalizeIncrementalSections(input.previousSections, content, input.outputContract)
        : null;
    let normalized = score(response.content);
    if (normalized && normalized.errors.length > 0 && input.outputContract && input.previousSections) {
      const failedChecks = normalized.errors;
      firstRawContent = first.content;
      try {
        const repair = await input.chat({
          ...input.request,
          messages: [
            ...input.request.messages,
            { role: 'assistant', content: first.content },
            { role: 'user', content: followUpRepairMessage(failedChecks, first.content) },
          ],
        });
        callCount = 2;
        response = repair;
        if (usageKnown && repair.usageKnown === true) {
          promptTokens = (promptTokens ?? 0) + repair.usage.inputTokens;
          completionTokens = (completionTokens ?? 0) + repair.usage.outputTokens;
          totalTokens = (totalTokens ?? 0) + repair.usage.totalTokens;
        } else {
          usageKnown = false;
          promptTokens = null;
          completionTokens = null;
          totalTokens = null;
        }
        normalized = score(response.content);
      } catch (repairError) {
        callCount = 2;
        const repairMessage = repairError instanceof Error ? repairError.message : 'review_failed';
        normalized = {
          sections: null,
          errors: [...failedChecks, `repair_failed:${repairMessage.slice(0, 180)}`],
        };
      }
    }
    if (input.readingIssues && !input.outputContract) {
      let issues = input.readingIssues(response.content);
      let bestCount = issues.length;
      let draft = response.content;
      // The provider allows the first call and three repairs. A repair is kept only when it has fewer failures.
      for (let attempt = 0; attempt < 3 && issues.length > 0; attempt += 1) {
        firstRawContent = firstRawContent ?? first.content;
        try {
          const repair = await input.chat({
            ...input.request,
            messages: [
              ...input.request.messages,
              { role: 'assistant', content: draft },
              { role: 'user', content: productReadingRepairMessage(issues, input.readingRepairContext) },
            ],
          });
          callCount += 1;
          noteCall(repair.content, repair);
          if (usageKnown && repair.usageKnown === true) {
            promptTokens = (promptTokens ?? 0) + repair.usage.inputTokens;
            completionTokens = (completionTokens ?? 0) + repair.usage.outputTokens;
            totalTokens = (totalTokens ?? 0) + repair.usage.totalTokens;
          } else {
            usageKnown = false;
            promptTokens = null;
            completionTokens = null;
            totalTokens = null;
          }
          const repairIssues = input.readingIssues(repair.content);
          const parsed = Boolean(parseSections(repair.content, input.input.text));
          const reopenedClaim = ['claim_not_labeled', 'claim_used_as_premise', 'claim_in_summary'].some(
            (code) => repairIssues.includes(code) && !issues.includes(code),
          );
          if (repairIssues.length < bestCount && parsed && !reopenedClaim) {
            response = repair;
            issues = repairIssues;
            bestCount = repairIssues.length;
            draft = repair.content;
          } else if (attempt < 2 && parsed) {
            if (attempt === 0) {
              issues = [...new Set([...issues, ...repairIssues])];
              draft = repair.content;
            } else {
              draft = response.content;
              issues = input.readingIssues(response.content);
            }
          } else {
            break;
          }
        } catch (error) {
          callCount += 1;
          callLedger.push({
            index: callLedger.length + 1,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            readingIssues: [`repair_failed:${error instanceof Error ? error.message.slice(0, 180) : 'review_failed'}`],
          });
          break;
        }
      }
    }
    const sections = normalized ? normalized.sections : parseSections(response.content, input.input.text);
    const outputErrors = normalized ? normalized.errors : input.outputContract ? ['incremental_previous_missing'] : [];
    const outputError = outputErrors.length > 0 ? outputErrors.join(',') : null;
    const revisionGate =
      sections && input.gate && needsRevisionGate(input.gate.marks)
        ? assessFollowUpRevision({ previous: input.gate.previous, next: sections, marks: input.gate.marks })
        : null;
    const accepted = Boolean(sections) && !outputError && revisionGate?.pass !== false;
    const consultingTurn =
      accepted && sections && input.consultingAnswer
        ? {
            question: input.consultingAnswer.question,
            choiceLabel: input.consultingAnswer.choiceLabel,
            supplement: input.consultingAnswer.supplement,
            judgment: sections.analysis?.judgmentDetail || sections.judgment,
            nextVerification: sections.analysis?.nextVerification ?? '',
            nextQuestion: sections.nextQuestion,
          }
        : null;
    const record = baseRecord({
      input: input.input,
      sha: input.sha,
      version: input.version,
      parentReviewId: input.parentReviewId,
      sourceFeedbackId: input.sourceFeedbackId,
      supplementSha: input.supplementSha,
      status: accepted ? 'succeeded' : 'failed',
      evidence: input.input.evidence,
      callCount,
      error: outputError ?? (sections ? (revisionGate && !revisionGate.pass ? 'revision_gate' : null) : reviewContractError(response.content)),
      provider: response.provider === 'google' ? 'google' : response.provider === 'openai' ? 'openai' : null,
      model: response.model,
      sections,
      revisionGate,
      rawContent: response.content,
      firstRawContent,
      consultingTurn,
      founderAnswerSource: input.founderAnswerSource ?? null,
      callLedger: callLedger.length > 0 ? callLedger : undefined,
      promptTokens,
      completionTokens,
      totalTokens,
      usageKnown,
      latencyMs: response.latencyMs ?? Date.now() - started,
    });
    await input.store.insertReview(record);
    return { called: true, record, view: toAiPmReviewView(record, []) };
  } catch (error) {
    const record = baseRecord({
      input: input.input,
      sha: input.sha,
      version: input.version,
      parentReviewId: input.parentReviewId,
      sourceFeedbackId: input.sourceFeedbackId,
      supplementSha: input.supplementSha,
      status: 'failed',
      evidence: input.input.evidence,
      callCount: 1,
      error: error instanceof Error ? error.message : 'review_failed',
      latencyMs: Date.now() - started,
    });
    await input.store.insertReview(record);
    return { called: true, record, view: toAiPmReviewView(record, []) };
  }
}

function baseRecord(input: {
  input: {
    userId: string;
    projectId: string;
    text: string;
    origin: StoredReview['inputOrigin'];
    fileName: string | null;
    now: string;
  };
  sha: string;
  version: number;
  parentReviewId: string | null;
  sourceFeedbackId: string | null;
  supplementSha: string | null;
  status: StoredReview['status'];
  evidence: StoredReview['evidence'];
  callCount: number;
  error: string | null;
  provider?: StoredReview['provider'];
  model?: string | null;
  sections?: ReviewSections | null;
  revisionGate?: RevisionGate | null;
  rawContent?: string | null;
  firstRawContent?: string | null;
  consultingTurn?: ConsultingTurn | null;
  founderAnswerSource?: FounderAnswerCitation | null;
  callLedger?: ReviewCallNote[];
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  usageKnown?: boolean;
  latencyMs?: number | null;
}): StoredReview {
  return {
    reviewId: randomUUID(),
    userId: input.input.userId,
    projectId: input.input.projectId,
    version: input.version,
    parentReviewId: input.parentReviewId,
    sourceFeedbackId: input.sourceFeedbackId,
    supplementSha: input.supplementSha,
    inputSha: input.sha,
    inputText: input.input.text,
    inputOrigin: input.input.origin,
    fileName: input.input.fileName,
    status: input.status,
    evidence: input.evidence,
    provider: input.provider ?? null,
    model: input.model ?? null,
    sections: input.sections ?? null,
    revisionGate: input.revisionGate ?? null,
    rawContent: input.rawContent ?? null,
    ...(input.firstRawContent ? { firstRawContent: input.firstRawContent } : {}),
    ...(input.consultingTurn ? { consultingTurn: input.consultingTurn } : {}),
    ...(input.founderAnswerSource ? { founderAnswerSource: input.founderAnswerSource } : {}),
    ...(input.callLedger && input.callLedger.length > 0 ? { callLedger: input.callLedger } : {}),
    promptTokens: input.promptTokens ?? null,
    completionTokens: input.completionTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    usageKnown: input.usageKnown ?? false,
    callCount: input.callCount,
    latencyMs: input.latencyMs ?? null,
    error: input.error,
    requestedAt: input.input.now,
    finishedAt: input.input.now,
  };
}

/** S.I. paid_conversion 고정 문구. 모델 JSON이 이 문장이면 검토 성공으로 받지 않는다. */
const FIXED_RULE_QUESTION =
  '가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까? 있다면 그 한 건을 알려주세요. 아직이면 제안 전이라고 답해도 됩니다.';

function expandShortAnalysis(input: {
  problem: string;
  target_customer: string;
  solution: string;
  business_model: string;
  validation_metric: string;
  nextQuestion: string;
  claimConfirmation: ReviewSections['claimConfirmation'];
}): ReviewSections {
  return {
    customer: input.target_customer,
    problem: input.problem,
    market: input.validation_metric,
    revenueModel: input.business_model,
    execution: input.solution,
    risks: ['가격, 인원, 매출은 입력에 없으면 적지 않는다.'],
    uncertain: [input.validation_metric],
    hypotheses: [input.validation_metric],
    judgment: `${input.problem} 고객은 ${input.target_customer}. 수익 가설은 ${input.business_model}.`,
    nextQuestion: input.nextQuestion,
    nextQuestionReason: `확인할 지표는 ${input.validation_metric}`,
    answerHint: '확인된 사실만 적는다. 계획이면 계획이라고 적는다.',
    claimConfirmation: input.claimConfirmation,
    analysis: null,
  };
}

/**
 * Fills omitted placeholders with 미확인. A missing question, a missing choice
 * array, or a revenue value that is not a string stays a failure.
 */
function repairAbsentPlaceholders(parsed: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(parsed.choices)) return parsed;
  if (typeof parsed.revenueModel !== 'string' || !parsed.revenueModel.trim()) return parsed;
  if (typeof parsed.nextQuestion !== 'string' || !parsed.nextQuestion.trim()) return parsed;
  const next: Record<string, unknown> = { ...parsed };
  const strings = [
    'summary',
    'customer',
    'problem',
    'value',
    'operatingModel',
    'payer',
    'alternatives',
    'differentiation',
    'market',
    'competition',
    'operations',
    'profitability',
    'judgment',
    'nextQuestionReason',
  ] as const;
  for (const key of strings) {
    const value = next[key];
    if (value == null || value === '') next[key] = '미확인';
    else if (typeof value !== 'string') return parsed;
  }
  const lists = ['strengths', 'risks', 'assumptions', 'evidenceToChange'] as const;
  for (const key of lists) {
    const value = next[key];
    if (value == null) next[key] = ['미확인'];
    else if (typeof value !== 'string' && !Array.isArray(value)) return parsed;
  }
  return next;
}

export function parseSections(content: string, sourceText = ''): ReviewSections | null {
  const stripped = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    const analysis = readBusinessAnalysis(repairAbsentPlaceholders(parsed), sourceText);
    if (analysis) return analysis;
    if (textField(parsed.summary) || Array.isArray(parsed.choices)) return null;
    const problem = textField(parsed.problem);
    const targetCustomer = textField(parsed.target_customer);
    const solution = textField(parsed.solution);
    const businessModel = textField(parsed.business_model);
    const validationMetric = textField(parsed.validation_metric);
    const shortQuestion = textField(parsed.nextQuestion);
    if (problem && targetCustomer && solution && businessModel && validationMetric && shortQuestion) {
      if (shortQuestion === FIXED_RULE_QUESTION) return null;
      return expandShortAnalysis({
        problem,
        target_customer: targetCustomer,
        solution,
        business_model: businessModel,
        validation_metric: validationMetric,
        nextQuestion: shortQuestion,
        claimConfirmation: readConfirmation(parsed.confirmation),
      });
    }
    const customer = textField(parsed.customer);
    const market = textField(parsed.market);
    const revenueModel = textField(parsed.revenueModel);
    const execution = textField(parsed.execution);
    const judgment = textField(parsed.judgment);
    const nextQuestion = textField(parsed.nextQuestion);
    const nextQuestionReason = textField(parsed.nextQuestionReason);
    const answerHint = textField(parsed.answerHint);
    const risks = stringList(parsed.risks);
    const uncertain = stringList(parsed.uncertain);
    const hypotheses = stringList(parsed.hypotheses);
    if (!customer || !problem || !market || !revenueModel || !execution || !judgment) return null;
    if (!risks || !uncertain || !hypotheses) return null;
    if (!nextQuestion || !nextQuestionReason || !answerHint) return null;
    if (nextQuestion === FIXED_RULE_QUESTION) return null;
    return {
      customer,
      problem,
      market,
      revenueModel,
      execution,
      risks,
      uncertain,
      hypotheses,
      judgment,
      nextQuestion,
      nextQuestionReason,
      answerHint,
      claimConfirmation: readConfirmation(parsed.confirmation),
      analysis: null,
    };
  } catch {
    return null;
  }
}

function readChoiceAnswer(source: Record<string, unknown>): ChoiceAnswer | null {
  const choiceId = typeof source.choiceId === 'string' ? source.choiceId.trim() : '';
  const label = typeof source.choiceLabel === 'string' ? source.choiceLabel.trim().slice(0, 500) : '';
  const otherText = typeof source.otherText === 'string' ? source.otherText.trim().slice(0, 2000) : '';
  if (!choiceId || !label) return null;
  if (choiceId === 'other' && !otherText) return null;
  return { choiceId, label, otherText };
}

function readBusinessAnalysis(parsed: Record<string, unknown>, sourceText: string): ReviewSections | null {
  const summary = scrubFigures(textField(parsed.summary), sourceText);
  const customer = textField(parsed.customer);
  const problem = textField(parsed.problem);
  const value = textField(parsed.value);
  const operatingModel = textField(parsed.operatingModel);
  const payer = markUnsourcedClaims(textField(parsed.payer), sourceText);
  const revenueModel = markUnsourcedClaims(textField(parsed.revenueModel), sourceText);
  const alternatives = textField(parsed.alternatives) ?? '';
  const differentiation = textField(parsed.differentiation) ?? '';
  const market = scrubFigures(textField(parsed.market), sourceText);
  const competition = scrubFigures(textField(parsed.competition), sourceText);
  const operations = textField(parsed.operations);
  const profitability = scrubFigures(textField(parsed.profitability), sourceText);
  const judgmentDetail = scrubFigures(textField(parsed.judgment), sourceText);
  const nextQuestion = textField(parsed.nextQuestion);
  const nextQuestionReason = textField(parsed.nextQuestionReason);
  const strengths = stringList(parsed.strengths);
  const risks = stringList(parsed.risks);
  const assumptions = stringList(parsed.assumptions);
  const evidenceToChange = stringList(parsed.evidenceToChange);
  const choices = readChoices(parsed.choices);
  if (!summary || !customer || !problem || !value || !operatingModel || !payer || !revenueModel) return null;
  if (!market || !competition || !operations || !profitability || !judgmentDetail) return null;
  if (!nextQuestion || !nextQuestionReason || !strengths || !risks || !assumptions || !evidenceToChange) return null;
  if (!choices) return null;
  if (nextQuestion === FIXED_RULE_QUESTION || choices.some((choice) => choice.label === FIXED_RULE_QUESTION)) return null;
  const analysis: BusinessAnalysis = {
    summary,
    value,
    operatingModel,
    payer,
    competition,
    operations,
    profitability,
    strengths,
    assumptions,
    evidenceToChange,
    founderFacts: stringList(parsed.founderFacts) ?? [],
    inferences: (stringList(parsed.inferences) ?? []).map((item) => scrubFigures(item, sourceText) ?? item),
    judgmentDetail,
    choices,
    alternatives,
    differentiation,
    nextVerification:
      textField(parsed.nextVerification) ??
      (assumptions[0] ? `적은 비용으로 먼저 확인할 가정: ${assumptions[0]}` : ''),
  };
  return {
    customer,
    problem,
    market,
    revenueModel,
    execution: operatingModel,
    risks,
    uncertain: assumptions,
    hypotheses: assumptions,
    judgment: summary,
    nextQuestion,
    nextQuestionReason,
    answerHint: '선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.',
    claimConfirmation: null,
    analysis,
  };
}

function ensureUnknownChoice(labels: string[]): string[] {
  if (labels.some((label) => /아직|정하지 못|모르|미확인/.test(label))) return labels;
  const unknown = '아직 핵심을 정하지 못했다';
  const otherAt = labels.findIndex((label) => /기타|직접 입력/.test(label));
  if (otherAt < 0) return [...labels, unknown];
  return [...labels.slice(0, otherAt), unknown, ...labels.slice(otherAt)];
}

function markUnsourcedClaims(value: string | null, sourceText: string): string | null {
  if (!value) return null;
  const leaked = ['수수료', '참가비', '이용료', '구독료'].filter((term) => value.includes(term) && !sourceText.includes(term));
  if (leaked.length === 0 || /가설|확인되지|원문에 없/.test(value)) return value;
  return `가설이며 원문에서 확인되지 않았다(${leaked.join(', ')}). ${value}`;
}

function mergeDirectChoice(labels: string[]): string[] {
  const merged: string[] = [];
  for (const label of labels) {
    const previous = merged.at(-1);
    if (previous && /^기타$/.test(previous) && /직접/.test(label)) {
      merged[merged.length - 1] = '기타 / 직접 입력';
      continue;
    }
    merged.push(label);
  }
  return merged;
}

function readChoices(value: unknown): BusinessAnalysis['choices'] | null {
  if (!Array.isArray(value)) return null;
  const labels = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 6);
  if (labels.length < 2) return null;
  const merged = mergeDirectChoice(labels);
  const withOther = ensureUnknownChoice(
    merged.some((label) => /기타|직접 입력/.test(label)) ? merged : [...merged, '기타 / 직접 입력'],
  );
  const otherIndex = withOther.reduce((found, label, index) => (/기타|직접 입력/.test(label) ? index : found), -1);
  return withOther.map((label, index) => ({
    id: index === otherIndex ? 'other' : `c${index + 1}`,
    label,
  }));
}

/** Drops a count the business text does not contain, so a model figure is not stored as a fact. */
function scrubFigures(value: string | null, sourceText: string): string | null {
  if (!value) return null;
  return value.replace(/\d[\d,.]*(?:\s*)(?:억|만|%|원|명)/g, (match) => {
    const digits = match.replace(/[^\d]/g, '');
    return digits && sourceText.includes(digits) ? match : '원문에 없는 수치';
  });
}

const CONFIRMATION_STATES = ['unconfirmed', 'confirmed'] as const;

function readConfirmation(value: unknown): ReviewSections['claimConfirmation'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    problem: oneOf(record.problem, CONFIRMATION_STATES),
    customer: oneOf(record.target_customer, CONFIRMATION_STATES),
    revenue: oneOf(record.business_model, CONFIRMATION_STATES),
  };
}

function textField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] | null {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

/** A stored model payload can be shown once the parser accepts it. This does not call the model. */
function repairUnstructured(record: StoredReview): StoredReview {
  if (record.status !== 'failed' || record.error !== 'unstructured_response' || !record.rawContent) return record;
  const sections = parseSections(record.rawContent, record.inputText);
  if (!sections?.analysis) return record;
  return { ...record, status: 'succeeded', sections, error: null };
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : null;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
