import { createHash, randomUUID } from 'node:crypto';

import type { ChatRequest, ChatResponse } from '@repo/ai';

import type {
  Accuracy,
  Agreement,
  AiPmReviewStore,
  NextAction,
  ReviewSections,
  RevisionArea,
  StoredFeedback,
  StoredReview,
} from './ai-pm-review-store';

export const AI_PM_REVIEW_MODEL = 'gpt-4o-mini';
export const AI_PM_REVIEW_MAX_TOKENS = 900;
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
  submittedAt: string;
};

export type AiPmReviewView = {
  reviewId: string;
  version: number;
  parentReviewId: string | null;
  status: 'ready' | 'unavailable' | 'failed';
  inputOrigin: StoredReview['inputOrigin'];
  fileName: string | null;
  inputText: string;
  sections: ReviewSections | null;
  finishedAt: string;
  feedback: AiPmFeedbackView[];
};

export function normalizeReviewText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

/** AI PM calls read this name only. OPENAI_API_KEY does not start a review. */
export function readGptApiKey(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.GPT_API_KEY?.trim();
  return value ? value : null;
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
  return {
    reviewId: record.reviewId,
    version: record.version,
    parentReviewId: record.parentReviewId,
    status: record.status === 'succeeded' ? 'ready' : record.status === 'not_run' ? 'unavailable' : 'failed',
    inputOrigin: record.inputOrigin,
    fileName: record.fileName,
    inputText: record.inputText,
    sections: record.sections,
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
        submittedAt: item.submittedAt,
      })),
  };
}

export function buildFirstReviewRequest(text: string): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: reviewSystemPrompt() },
      {
        role: 'user',
        content: `사업 입력:\n${text}\n\n키: customer, problem, market, revenueModel, execution, risks, uncertain, hypotheses, judgment.`,
      },
    ],
  };
}

export function buildFollowUpRequest(input: {
  sections: ReviewSections;
  feedback: StoredFeedback;
  supplement: string;
}): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: reviewSystemPrompt() },
      {
        role: 'user',
        content: [
          '이전 검토와 사용자 피드백, 그리고 아래에 적힌 추가 사실만 반영한다.',
          `이전 검토: ${JSON.stringify(input.sections)}`,
          `피드백: ${JSON.stringify({
            agreement: input.feedback.agreement,
            accuracy: input.feedback.accuracy,
            revisionAreas: input.feedback.revisionAreas,
            comment: input.feedback.comment,
            nextAction: input.feedback.nextAction,
          })}`,
          `추가 사실: ${input.supplement || '(없음)'}`,
        ].join('\n'),
      },
    ],
  };
}

export async function runFirstReview(input: {
  store: AiPmReviewStore;
  userId: string;
  text: string;
  origin: StoredReview['inputOrigin'];
  fileName: string | null;
  now: string;
  chat?: ReviewChat;
  evidence: StoredReview['evidence'];
  notRunReason?: string;
}): Promise<{ called: boolean; record: StoredReview; view: AiPmReviewView }> {
  const sha = sha256(input.text);
  const latest = await input.store.latestForInput(input.userId, sha);
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
  const agreement = oneOf(source.agreement, AGREEMENTS);
  const accuracy = oneOf(source.accuracy, ACCURACY);
  const nextAction = oneOf(source.nextAction, NEXT);
  const revisionAreas = Array.isArray(source.revisionAreas)
    ? [...new Set(source.revisionAreas.filter((item): item is RevisionArea => AREAS.includes(item as RevisionArea)))]
    : null;
  const comment = typeof source.comment === 'string' ? source.comment.trim().slice(0, 4000) : '';
  if (!reviewId || !agreement || !accuracy || !nextAction || !revisionAreas) {
    return { ok: false, error: 'feedback_incomplete' };
  }
  return {
    ok: true,
    value: { reviewId, agreement, accuracy, revisionAreas, comment, nextAction },
  };
}

export async function saveReviewFeedback(input: {
  store: AiPmReviewStore;
  userId: string;
  body: unknown;
  now: string;
}): Promise<{ ok: true; feedback: StoredFeedback; view: AiPmReviewView } | { ok: false; error: 'feedback_incomplete' | 'review_missing' }> {
  const parsed = parseFeedbackBody(input.body);
  if (!parsed.ok) return parsed;
  const review = await input.store.readReview(input.userId, parsed.value.reviewId);
  if (!review || review.status !== 'succeeded') return { ok: false, error: 'review_missing' };
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
  reviewId: string;
  supplement?: string;
  now: string;
  chat?: ReviewChat;
  evidence: StoredReview['evidence'];
  notRunReason?: string;
}): Promise<
  | { ok: true; called: boolean; record: StoredReview; view: AiPmReviewView }
  | { ok: false; error: 'review_missing' | 'feedback_required' | 'engine_unconfigured' | 'gpt_api_key_missing' }
> {
  const parent = await input.store.readReview(input.userId, input.reviewId);
  if (!parent || parent.status !== 'succeeded' || !parent.sections) {
    return { ok: false, error: 'review_missing' };
  }
  const feedback = (await input.store.listFeedback(input.userId, parent.reviewId)).at(-1);
  if (!feedback) return { ok: false, error: 'feedback_required' };
  const supplement = normalizeReviewText(input.supplement ?? '').slice(0, 4000);
  const supplementSha = sha256(supplement);
  const existing = await input.store.succeededChild(input.userId, parent.reviewId, feedback.feedbackId, supplementSha);
  if (existing) {
    return {
      ok: true,
      called: false,
      record: existing,
      view: toAiPmReviewView(existing, await input.store.listFeedback(input.userId, existing.reviewId)),
    };
  }
  if (!input.chat) return { ok: false, error: input.notRunReason === 'gpt_api_key_missing' ? 'gpt_api_key_missing' : 'engine_unconfigured' };
  const latest = await input.store.latestForInput(input.userId, parent.inputSha);
  const finished = await finishCall({
    store: input.store,
    input: {
      userId: input.userId,
      text: parent.inputText,
      origin: parent.inputOrigin,
      fileName: parent.fileName,
      now: input.now,
      evidence: input.evidence,
    },
    sha: parent.inputSha,
    version: (latest?.version ?? parent.version) + 1,
    parentReviewId: parent.reviewId,
    sourceFeedbackId: feedback.feedbackId,
    supplementSha,
    request: buildFollowUpRequest({ sections: parent.sections, feedback, supplement }),
    chat: input.chat,
  });
  return { ok: true, called: finished.called, record: finished.record, view: finished.view };
}

function reviewSystemPrompt(): string {
  return [
    '당신은 ALABOM의 AI PM이다.',
    '고객과 지불자, 문제와 해결책, 시장 근거, 수익모델, 실행 가능성, 주요 위험을 구분한다.',
    '입력에 없는 가격, 고객 수, 매출, 시장 규모는 만들지 않는다.',
    '확인하지 않은 내용은 uncertain에 적는다.',
    '우선 검증할 가설은 hypotheses에 적는다.',
    'judgment는 보류, 진행, 중단 중 하나와 이유 한 문장이다.',
    '모델 이름이나 공급사 이름을 쓰지 않는다.',
    'JSON 객체만 반환한다.',
  ].join(' ');
}

async function finishCall(input: {
  store: AiPmReviewStore;
  input: {
    userId: string;
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
}): Promise<{ called: boolean; record: StoredReview; view: AiPmReviewView }> {
  const started = Date.now();
  try {
    const response = await input.chat(input.request);
    const sections = parseSections(response.content);
    const usageKnown = response.usageKnown === true;
    const record = baseRecord({
      input: input.input,
      sha: input.sha,
      version: input.version,
      parentReviewId: input.parentReviewId,
      sourceFeedbackId: input.sourceFeedbackId,
      supplementSha: input.supplementSha,
      status: sections ? 'succeeded' : 'failed',
      evidence: input.input.evidence,
      callCount: 1,
      error: sections ? null : 'unstructured_response',
      provider: 'openai',
      model: response.model,
      sections,
      rawContent: response.content,
      promptTokens: usageKnown ? response.usage.inputTokens : null,
      completionTokens: usageKnown ? response.usage.outputTokens : null,
      totalTokens: usageKnown ? response.usage.totalTokens : null,
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
  rawContent?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  usageKnown?: boolean;
  latencyMs?: number | null;
}): StoredReview {
  return {
    reviewId: randomUUID(),
    userId: input.input.userId,
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
    rawContent: input.rawContent ?? null,
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

export function parseSections(content: string): ReviewSections | null {
  const stripped = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    const customer = textField(parsed.customer);
    const problem = textField(parsed.problem);
    const market = textField(parsed.market);
    const revenueModel = textField(parsed.revenueModel);
    const execution = textField(parsed.execution);
    const judgment = textField(parsed.judgment);
    const risks = stringList(parsed.risks);
    const uncertain = stringList(parsed.uncertain);
    const hypotheses = stringList(parsed.hypotheses);
    if (!customer || !problem || !market || !revenueModel || !execution || !judgment) return null;
    if (!risks || !uncertain || !hypotheses) return null;
    return { customer, problem, market, revenueModel, execution, risks, uncertain, hypotheses, judgment };
  } catch {
    return null;
  }
}

function textField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : null;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
