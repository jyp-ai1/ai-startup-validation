import { createHash, randomUUID } from 'node:crypto';

import { googleChat, OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import { feedbackFromMarks, normalizeMarks, UNCONFIRMED_CLAIM } from './ai-pm-review-marks';
import type {
  Accuracy,
  Agreement,
  AiPmReviewStore,
  BusinessAnalysis,
  ChoiceAnswer,
  NextAction,
  ReviewMark,
  ReviewSections,
  RevisionArea,
  RevisionGate,
  StoredFeedback,
  StoredReview,
} from './ai-pm-review-store';

export const AI_PM_REVIEW_MODEL = 'gpt-4o-mini';
/** First-review prompt generation. Logged by the quality harness. Not a runtime SHA. */
export const AI_PM_FIRST_PROMPT_VERSION = 'quality-2';
export const AI_PM_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
export const AI_PM_REVIEW_MAX_TOKENS = 800;
export const AI_PM_REVIEW_FIRST_MAX_TOKENS = 2400;
export const AI_PM_REVIEW_INPUT_TOKEN_BUDGET = 3_000;
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
  const systemTokens = estimateReviewTokens(
    messages
      .filter((message) => message.role !== 'user')
      .map((message) => message.content)
      .join('\n'),
  );
  const room = AI_PM_REVIEW_INPUT_TOKEN_BUDGET - systemTokens;
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
        if (openAICalls >= 1) throw new Error('review_retry_blocked');
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
  };
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

export function buildFollowUpRequest(input: {
  originalInput: string;
  sections: ReviewSections;
  feedback: StoredFeedback | null;
  supplement: string;
}): ChatRequest {
  const marks = normalizeMarks(input.feedback?.marks);
  const revision = revisionPayload(input.sections, marks);
  const payload = {
    ...(revision ? { revision } : {}),
    feedback: input.feedback
      ? {
          agreement: input.feedback.agreement,
          accuracy: input.feedback.accuracy,
          revisionAreas: input.feedback.revisionAreas,
          comment: input.feedback.comment,
          nextAction: input.feedback.nextAction,
          marks,
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
    originalInput: input.originalInput,
    supplement: input.supplement,
  };
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: fitReviewMessages([
      { role: 'system', content: revision ? gatedFollowUpPrompt() : reviewSystemPrompt() },
      { role: 'user', content: JSON.stringify(payload) },
    ]),
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
  if (prior && reuseFollowUp(prior, marks)) {
    return {
      ok: true,
      called: false,
      record: prior,
      view: toAiPmReviewView(prior, await input.store.listFeedback(input.userId, prior.reviewId)),
    };
  }
  if (!input.chat) return { ok: false, error: input.notRunReason === 'gpt_api_key_missing' ? 'gpt_api_key_missing' : 'engine_unconfigured' };
  const latest = await input.store.latestForInput(input.userId, parent.inputSha, input.projectId);
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
    request: buildFollowUpRequest({
      originalInput: parent.inputText,
      sections: parent.sections,
      feedback,
      supplement,
    }),
    chat: input.chat,
    gate: needsRevisionGate(marks) ? { previous: parent.sections, marks } : null,
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

function gatedFollowUpPrompt(): string {
  return [
    reviewSystemPrompt(),
    '응답 JSON에 confirmation을 넣는다.',
    'confirmation.problem, confirmation.target_customer, confirmation.business_model은 unconfirmed다.',
    '그 세 문장은 확인 전이며 확정된 사실로 쓰지 않는다.',
    'doNotDeleteUnrelated이면 solution과 validation_metric을 비우지 않는다.',
    'requiredMeaning이 ask_what_core_is_missing이면 nextQuestion은 누락된 핵심이 무엇인지 묻는다.',
    '파트너십이나 계획 질문으로 바꾸지 않는다.',
  ].join(' ');
}

function reviewSystemPrompt(): string {
  return [
    '당신은 ALABOM의 AI PM이다.',
    '입력에 없는 가격, 인원, 매출, 시장 규모는 만들지 않는다.',
    'JSON 객체만 반환한다.',
    '키는 problem, target_customer, solution, business_model, validation_metric, nextQuestion 이다.',
    'nextQuestion은 이 입력에서 창업자가 답해야 판단이 바뀌는 질문 하나다.',
    '질문 목록의 문장을 복사하지 않는다.',
    '모델 이름이나 공급사 이름은 쓰지 않는다.',
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
}): Promise<{ called: boolean; record: StoredReview; view: AiPmReviewView }> {
  const started = Date.now();
  try {
    const response = await input.chat(input.request);
    const sections = parseSections(response.content, input.input.text);
    const revisionGate =
      sections && input.gate && needsRevisionGate(input.gate.marks)
        ? assessFollowUpRevision({ previous: input.gate.previous, next: sections, marks: input.gate.marks })
        : null;
    const accepted = Boolean(sections) && revisionGate?.pass !== false;
    const usageKnown = response.usageKnown === true;
    const record = baseRecord({
      input: input.input,
      sha: input.sha,
      version: input.version,
      parentReviewId: input.parentReviewId,
      sourceFeedbackId: input.sourceFeedbackId,
      supplementSha: input.supplementSha,
      status: accepted ? 'succeeded' : 'failed',
      evidence: input.input.evidence,
      callCount: 1,
      error: sections ? (revisionGate && !revisionGate.pass ? 'revision_gate' : null) : 'unstructured_response',
      provider: response.provider === 'google' ? 'google' : response.provider === 'openai' ? 'openai' : null,
      model: response.model,
      sections,
      revisionGate,
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

export function parseSections(content: string, sourceText = ''): ReviewSections | null {
  const stripped = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    const analysis = readBusinessAnalysis(parsed, sourceText);
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
