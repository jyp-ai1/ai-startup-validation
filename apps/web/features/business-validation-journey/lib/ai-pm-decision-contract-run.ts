import { createHash, randomUUID } from 'node:crypto';

import type { ChatRequest, ChatResponse } from '@repo/ai';

import {
  buildSelectionRequest,
  buildStateRequest,
  evaluateDecisionContract,
  parseLedger,
  parseSelection,
  requestCarriesAnswer,
  scoreSelection,
  type ContractContext,
  type ContractSelection,
  type DecisionLedger,
} from './ai-pm-decision-contract';
import type { ReviewSections, StoredReview } from './ai-pm-review-store';

/**
 * Runs the decision contract outside the product review path.
 * A missing answer never calls the model. A failed ledger never calls selection.
 */

export type ContractChat = (request: ChatRequest) => Promise<ChatResponse>;

export type ContractCallLog = {
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

export type ContractQuality = {
  groundingPass: boolean;
  unknownPass: boolean;
  deltaPass: boolean;
  selectionAllowed: boolean;
  call2Pass: boolean | null;
  call2Ran: boolean;
  failures: string[];
  qualityPass: boolean;
  chainContinues: boolean;
};

export type DecisionContractResult = {
  called: boolean;
  record: StoredReview;
  quality: ContractQuality;
  calls: ContractCallLog[];
  ledger: DecisionLedger | null;
  selection: ContractSelection | null;
};

type StoreLike = {
  listReviews: (userId: string, projectId: string) => Promise<StoredReview[]>;
  insertReview: (record: StoredReview) => Promise<{ wrote: boolean }>;
};

export type DecisionContractInput = ContractContext & {
  store: StoreLike;
  userId: string;
  projectId: string;
  parent: StoredReview;
  now: string;
  chat: ContractChat;
  sourceFeedbackId: string | null;
  priorRisks: string[];
  currentAnswer: string | null | undefined;
};

export async function runDecisionContractFollowUp(input: DecisionContractInput): Promise<DecisionContractResult> {
  const answer = typeof input.currentAnswer === 'string' ? input.currentAnswer : '';
  const supplementSha = sha256(answer.length > 0 ? answer : '__missing_answer__');
  const existing = (await input.store.listReviews(input.userId, input.projectId))
    .filter((record) => record.parentReviewId === input.parent.reviewId && record.supplementSha === supplementSha)
    .at(-1);
  if (existing) return { called: false, record: existing, quality: qualityFromRecord(existing), calls: [], ledger: null, selection: null };
  if (answer.trim().length === 0) {
    const quality = blockedQuality(['answer_missing']);
    const record = await persist(input, supplementSha, [], null, null, quality);
    return { called: true, record, quality, calls: [], ledger: null, selection: null };
  }
  const context: ContractContext = { ...input, currentAnswer: answer };
  const stateRequest = buildStateRequest({ ...context, priorRisks: input.priorRisks });
  if (!requestCarriesAnswer(stateRequest, answer)) {
    const quality = blockedQuality(['answer_missing']);
    const record = await persist(input, supplementSha, [], null, null, quality);
    return { called: true, record, quality, calls: [], ledger: null, selection: null };
  }
  const stateResponse = await input.chat(stateRequest);
  const stateLog = callLog('state', stateRequest, stateResponse);
  if (!usableModel(stateResponse)) {
    const quality = blockedQuality(['model_rejected']);
    const record = await persist(input, supplementSha, [stateLog], null, null, quality);
    return { called: true, record, quality, calls: [stateLog], ledger: null, selection: null };
  }
  const ledger = parseLedger(stateResponse.content);
  const stateVerdict = evaluateDecisionContract(context, ledger);
  if (!ledger || !stateVerdict.selectionAllowed) {
    const quality: ContractQuality = {
      groundingPass: stateVerdict.groundingPass,
      unknownPass: stateVerdict.unknownPass,
      deltaPass: stateVerdict.deltaPass,
      selectionAllowed: false,
      call2Pass: null,
      call2Ran: false,
      failures: stateVerdict.failures,
      qualityPass: false,
      chainContinues: false,
    };
    const record = await persist(input, supplementSha, [stateLog], ledger, null, quality);
    return { called: true, record, quality, calls: [stateLog], ledger, selection: null };
  }
  const selectionRequest = buildSelectionRequest({
    ledger,
    currentAnswer: answer,
    priorRisks: input.priorRisks,
    closedQuestions: input.closedQuestions,
    priorChoiceLabels: input.priorChoiceLabels,
  });
  const selectionResponse = await input.chat(selectionRequest);
  const selectionLog = callLog('selection', selectionRequest, selectionResponse);
  const selection = usableModel(selectionResponse) ? parseSelection(selectionResponse.content) : null;
  const selectionFailures = scoreSelection(selection, [...stateVerdict.groundedChangeIds, ...stateVerdict.unknownIds], input.closedQuestions, input.priorChoiceLabels);
  const quality: ContractQuality = {
    groundingPass: true,
    unknownPass: true,
    deltaPass: true,
    selectionAllowed: true,
    call2Pass: selectionFailures.length === 0,
    call2Ran: true,
    failures: selectionFailures,
    qualityPass: selectionFailures.length === 0,
    chainContinues: selectionFailures.length === 0,
  };
  const record = await persist(input, supplementSha, [stateLog, selectionLog], ledger, selection, quality);
  return { called: true, record, quality, calls: [stateLog, selectionLog], ledger, selection };
}

function blockedQuality(failures: string[]): ContractQuality {
  return {
    groundingPass: false,
    unknownPass: false,
    deltaPass: false,
    selectionAllowed: false,
    call2Pass: null,
    call2Ran: false,
    failures,
    qualityPass: false,
    chainContinues: false,
  };
}

async function persist(
  input: DecisionContractInput,
  supplementSha: string,
  calls: ContractCallLog[],
  ledger: DecisionLedger | null,
  selection: ContractSelection | null,
  quality: ContractQuality,
): Promise<StoredReview> {
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
    evidence: calls.length > 0 ? 'injected_http' : 'not_run',
    provider: calls.length > 0 ? 'openai' : null,
    model: calls.at(-1)?.responseModel ?? null,
    sections: quality.qualityPass && ledger && selection ? sectionsFrom(ledger, selection) : null,
    rawContent: JSON.stringify({ kind: 'decision_contract_stage', quality, ledger, selection }),
    firstRawContent: calls[0]?.raw ?? null,
    callLedger: calls.map((call, index) => ({
      index: index + 1,
      promptTokens: call.promptTokens,
      completionTokens: call.completionTokens,
      totalTokens: call.totalTokens,
      readingIssues: [],
    })),
    stageReading: null,
    promptTokens: sum(calls, (call) => call.promptTokens),
    completionTokens: sum(calls, (call) => call.completionTokens),
    totalTokens: sum(calls, (call) => call.totalTokens),
    usageKnown: calls.length > 0 && calls.every((call) => call.usageKnown),
    callCount: calls.length,
    latencyMs: calls.reduce<number>((total, call) => total + (call.latencyMs ?? 0), 0),
    error: quality.qualityPass ? null : 'decision_contract',
    requestedAt: input.now,
    finishedAt: input.now,
  };
  await input.store.insertReview(record);
  return record;
}

function sectionsFrom(ledger: DecisionLedger, selection: ContractSelection): ReviewSections {
  const questions = selection.nextQuestions.map((question, index) => ({
    questionId: `q${index + 1}`,
    text: question.text,
    choices: question.choices.map((label, choiceIndex) => ({ id: `c${choiceIndex + 1}`, label })),
    verificationPurpose: question.verificationPurpose,
  }));
  return {
    customer: ledger.answerImpact,
    problem: ledger.judgmentText,
    market: ledger.judgmentText,
    revenueModel: selection.selectionReason,
    execution: ledger.changes.map((change) => change.statement).join(' '),
    risks: ledger.unconfirmed.map((item) => item.text),
    uncertain: ledger.unansweredQuestions.map((item) => item.question),
    hypotheses: ledger.changes.map((change) => change.statement),
    judgment: ledger.judgmentText,
    nextQuestion: questions[0]?.text ?? '',
    nextQuestionReason: selection.selectionReason,
    answerHint: ledger.answerImpact,
    claimConfirmation: null,
    analysis: {
      summary: ledger.answerImpact,
      value: ledger.judgmentText,
      operatingModel: ledger.judgmentText,
      payer: ledger.answerImpact,
      competition: ledger.answerImpact,
      operations: ledger.answerImpact,
      profitability: ledger.judgmentText,
      strengths: [],
      assumptions: [],
      evidenceToChange: ledger.unconfirmed.map((item) => item.text),
      founderFacts: ledger.confirmedFacts,
      inferences: [],
      judgmentDetail: ledger.judgmentText,
      choices: questions[0]?.choices ?? [],
      nextVerification: selection.selectionReason,
      questions,
    },
  };
}

function qualityFromRecord(record: StoredReview): ContractQuality {
  try {
    const parsed = JSON.parse(record.rawContent ?? '') as { quality?: ContractQuality };
    if (parsed.quality && Array.isArray(parsed.quality.failures)) return parsed.quality;
  } catch {
    /* The stored row stays in place. */
  }
  return blockedQuality(['stored_quality_unreadable']);
}

function callLog(role: 'state' | 'selection', request: ChatRequest, response: ChatResponse): ContractCallLog {
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
  return response.finishReason === 'stop' && (response.model === 'gpt-4o' || (response.model.startsWith('gpt-4o-') && !response.model.includes('mini')));
}

function sum(calls: ContractCallLog[], read: (call: ContractCallLog) => number | null): number | null {
  if (calls.length === 0 || calls.some((call) => read(call) === null)) return null;
  return calls.reduce((total, call) => total + (read(call) ?? 0), 0);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
