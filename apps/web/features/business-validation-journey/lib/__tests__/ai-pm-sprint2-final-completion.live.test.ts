import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import { requestCarriesAnswer } from '../ai-pm-decision-contract';
import { runDecisionContractFollowUp, type ContractQuality, type DecisionContractResult } from '../ai-pm-decision-contract-run';
import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, runFirstReview, type ReviewChat } from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections, type StoredReview } from '../ai-pm-review-store';

/**
 * One gpt-4o chain for Sprint 2 final completion.
 * Skipped unless AI_PM_SPRINT2_FINAL=1. A second process must not replay a capture that already called the model.
 * Product prompts, the experiment B harness, and Supabase are not used.
 */
const enabled = process.env.AI_PM_SPRINT2_FINAL === '1';
const MODEL = 'gpt-4o';
const USER_ID = 'sprint2-final-completion';
const PROJECT_ID = 'sprint2-final-local-sqlite';
const CAPTURE_PATH = process.env.SPRINT2_CAPTURE_PATH ?? '/tmp/sprint2-final-completion-capture.json';
const SIMULATION_ANSWERS = [
  'SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 실제 예약과 지불은 없다. 누가 비용을 낼지는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 알릴 채널과 운영 책임자는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
] as const;

type Gate = 'PASS' | 'FAIL' | 'NOT RUN';

type PublicRequest = {
  model: string;
  temperature: number | undefined;
  maxTokens: number | undefined;
  responseFormat: ChatRequest['responseFormat'];
  messages: Array<{ role: string; content: string }>;
};

type PublicResponse = {
  id: string;
  model: string;
  provider: string;
  finishReason: string;
  content: string;
  usageKnown: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
};

type TranscriptCall = {
  sent: boolean;
  request: PublicRequest;
  response: PublicResponse | null;
  error: string | null;
  currentAnswerPresent: boolean;
};

type RoundRecord = {
  round: number;
  status: 'PASS' | 'FAIL' | 'NOT RUN';
  reason: string | null;
  answer: string | null;
  answerSource: 'simulation' | null;
  productModel: string | null;
  sentModel: string | null;
  responseModel: string | null;
  reviewId: string | null;
  parentReviewId: string | null;
  rowStatus: string | null;
  rowError: string | null;
  evidence: string | null;
  confirmedFacts: string[] | null;
  judgment: string | null;
  nextQuestion: string | null;
  questions: string[];
  gates: {
    answerGrounding: Gate;
    unknownPreservation: Gate;
    judgmentDelta: Gate;
    prioritySelection: Gate;
  };
  failures: string[];
  qualityPass: boolean | null;
  chainContinues: boolean | null;
  sections: ReviewSections | null;
  ledger: DecisionContractResult['ledger'];
  selection: DecisionContractResult['selection'];
  calls: TranscriptCall[];
};

describe.skipIf(!enabled)('sprint 2 final completion chain', () => {
  it(
    'runs one gpt-4o chain and writes a redacted capture',
    async () => {
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!apiKey) throw new Error('GPT_API_KEY MISSING');
      refuseSecondChain();
      const startedAt = new Date().toISOString();
      const capture = emptyCapture(startedAt);
      const store = openAiPmReviewStore(join(capture.repoRoot, '.data/alabom-sprint2-final-completion/reviews.sqlite'));
      let activeAnswer = '';
      const transcripts: TranscriptCall[] = [];
      const adapter = new OpenAIProviderAdapter({ apiKey });
      const live = async (request: ChatRequest): Promise<ChatResponse> => {
        const sent: ChatRequest = { ...request, model: MODEL };
        const carries = activeAnswer.length > 0 && requestCarriesAnswer(sent, activeAnswer);
        const call: TranscriptCall = {
          sent: false,
          request: publicRequest(sent),
          response: null,
          error: null,
          currentAnswerPresent: carries,
        };
        transcripts.push(call);
        if (activeAnswer.length > 0 && !carries) {
          call.error = 'current_answer_omitted';
          throw new Error('current_answer_omitted');
        }
        call.sent = true;
        capture.gptCallMade = true;
        try {
          const response = await adapter.chat(sent);
          call.response = publicResponse(response);
          return response;
        } catch (error) {
          call.error = safeError(error);
          throw error;
        }
      };
      try {
        activeAnswer = '';
        const firstTranscripts = transcripts.length;
        const first = await runFirstReview({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          text: COMPARE_BUSINESS_BODY,
          origin: 'typed',
          fileName: null,
          now: startedAt,
          chat: watchFirst(live, capture),
          evidence: 'live_network',
        });
        const firstCalls = transcripts.slice(firstTranscripts);
        const firstRound = roundFromFirst(first.record, firstCalls);
        firstRound.productModel = capture.productModel;
        capture.rounds[0] = firstRound;
        save(capture);
        if (firstRound.status !== 'PASS' || !first.record.sections) {
          markLaterNotRun(capture, firstRound.reason ?? 'first_review_rejected');
          return;
        }
        let parent = first.record;
        let priorAnswers: string[] = [];
        let closedQuestions = consultingQuestions(parent.sections).map((question) => question.text);
        let priorChoiceLabels = consultingQuestions(parent.sections).map((question) =>
          (question.choices ?? []).map((choice) => choice.label).filter((label) => label.length > 0),
        );
        let priorJudgment = parent.sections.analysis?.judgmentDetail || parent.sections.judgment;
        let priorRisks = [...parent.sections.risks];
        let openUncertainties = [...parent.sections.uncertain];
        for (let index = 0; index < SIMULATION_ANSWERS.length; index += 1) {
          const roundNumber = index + 2;
          const answer = SIMULATION_ANSWERS[index] ?? '';
          const before = transcripts.length;
          activeAnswer = answer;
          let followed: DecisionContractResult;
          try {
            followed = await runDecisionContractFollowUp({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              parent,
              now: new Date(Date.parse(startedAt) + roundNumber * 60_000).toISOString(),
              chat: live,
              sourceFeedbackId: null,
              currentAnswer: answer,
              originalIdea: COMPARE_BUSINESS_BODY,
              priorAnswers,
              priorJudgment,
              closedQuestions,
              priorChoiceLabels,
              openUncertainties,
              unresolvedMarks: unresolvedMarks(parent.sections, [...priorAnswers, answer]),
              answerSource: 'simulation',
              priorRisks,
            });
          } catch (error) {
            const failed = failedRound(roundNumber, answer, transcripts.slice(before), safeError(error));
            capture.rounds[index + 1] = failed;
            markLaterNotRun(capture, failed.reason);
            return;
          }
          const round = roundFromFollowUp(roundNumber, answer, followed, transcripts.slice(before));
          capture.rounds[index + 1] = round;
          save(capture);
          if (round.status !== 'PASS' || !followed.quality.chainContinues || !followed.record.sections) {
            markLaterNotRun(capture, round.reason ?? 'contract_failed');
            return;
          }
          parent = followed.record;
          priorAnswers = [...priorAnswers, answer];
          const asked = consultingQuestions(parent.sections);
          closedQuestions = [...closedQuestions, ...asked.map((question) => question.text)];
          priorChoiceLabels = [
            ...priorChoiceLabels,
            ...asked.map((question) => (question.choices ?? []).map((choice) => choice.label).filter((label) => label.length > 0)),
          ];
          priorJudgment = parent.sections.judgment;
          priorRisks = [...parent.sections.risks];
          openUncertainties = [...parent.sections.uncertain];
        }
        capture.chainFinished = capture.rounds.every((round) => round.status === 'PASS');
      } finally {
        capture.finishedAt = new Date().toISOString();
        capture.storageIds = (await store.listReviews(USER_ID, PROJECT_ID)).map((record) => ({
          reviewId: record.reviewId,
          parentReviewId: record.parentReviewId,
          status: record.status,
          error: record.error,
          callCount: record.callCount,
          evidence: record.evidence,
          model: record.model,
        }));
        store.close();
        capture.repeatedQuestionCheck = repeatedQuestionCheck(capture.rounds);
        capture.businessJudgmentChange = judgmentChange(capture.rounds);
        capture.totals = totalsOf(capture.rounds);
        save(capture);
        const written = readFileSync(CAPTURE_PATH, 'utf8');
        expect(written.includes('sk-')).toBe(false);
        expect(capture.supabaseTouched).toBe(false);
        expect(capture.store.productionDatabase).toBe(false);
        const ran = capture.rounds.findIndex((round) => round.status === 'FAIL');
        if (ran >= 0) {
          expect(capture.rounds.slice(ran + 1).every((round) => round.status === 'NOT RUN')).toBe(true);
        }
      }
    },
    600_000,
  );
});

function watchFirst(live: ReviewChat, capture: Capture): ReviewChat {
  return async (request) => {
    capture.productModel = request.model;
    return live({ ...request, model: MODEL });
  };
}

function roundFromFirst(record: StoredReview, calls: TranscriptCall[]): RoundRecord {
  const response = calls.find((call) => call.response)?.response ?? null;
  const modelOk = response ? modelIsGpt4o(response.model) : false;
  const sentOk = calls.every((call) => !call.sent || call.request.model === MODEL);
  const passed = record.status === 'succeeded' && Boolean(record.sections) && modelOk && sentOk && calls.some((call) => call.sent);
  const reason = passed
    ? null
    : !modelOk
      ? 'response_model_rejected'
      : record.status !== 'succeeded'
        ? (record.error ?? 'first_review_rejected')
        : 'first_review_rejected';
  return {
    round: 1,
    status: passed ? 'PASS' : 'FAIL',
    reason,
    answer: null,
    answerSource: null,
    productModel: null,
    sentModel: calls[0]?.request.model ?? null,
    responseModel: response?.model ?? record.model,
    reviewId: record.reviewId,
    parentReviewId: record.parentReviewId,
    rowStatus: record.status,
    rowError: record.error,
    evidence: record.evidence,
    confirmedFacts: record.sections?.analysis?.founderFacts ?? null,
    judgment: record.sections?.analysis?.judgmentDetail || record.sections?.judgment || null,
    nextQuestion: record.sections?.nextQuestion || null,
    questions: consultingQuestions(record.sections).map((question) => question.text),
    gates: { answerGrounding: 'NOT RUN', unknownPreservation: 'NOT RUN', judgmentDelta: 'NOT RUN', prioritySelection: 'NOT RUN' },
    failures: passed ? [] : [reason ?? 'first_review_rejected'],
    qualityPass: passed,
    chainContinues: passed,
    sections: record.sections,
    ledger: null,
    selection: null,
    calls,
  };
}

function roundFromFollowUp(round: number, answer: string, followed: DecisionContractResult, calls: TranscriptCall[]): RoundRecord {
  const omitted = calls.some((call) => call.error === 'current_answer_omitted' || (call.sent && !call.currentAnswerPresent));
  const quality = followed.quality;
  const passed = !omitted && quality.qualityPass && followed.record.status === 'succeeded' && calls.every((call) => call.request.model === MODEL);
  const reason = omitted ? 'current_answer_omitted' : passed ? null : (followed.record.error ?? quality.failures[0] ?? 'contract_failed');
  return {
    round,
    status: passed ? 'PASS' : 'FAIL',
    reason,
    answer,
    answerSource: 'simulation',
    productModel: null,
    sentModel: calls[0]?.request.model ?? null,
    responseModel: calls.map((call) => call.response?.model).find((model) => model) ?? followed.record.model,
    reviewId: followed.record.reviewId,
    parentReviewId: followed.record.parentReviewId,
    rowStatus: followed.record.status,
    rowError: followed.record.error,
    evidence: followed.record.evidence,
    confirmedFacts: followed.ledger?.confirmedFacts ?? null,
    judgment: followed.ledger?.judgmentText ?? followed.record.sections?.judgment ?? null,
    nextQuestion: followed.selection?.nextQuestions[0]?.text ?? followed.record.sections?.nextQuestion ?? null,
    questions: (followed.selection?.nextQuestions ?? []).map((question) => question.text),
    gates: gatesOf(quality, calls.some((call) => call.sent)),
    failures: quality.failures,
    qualityPass: quality.qualityPass,
    chainContinues: quality.chainContinues,
    sections: followed.record.sections,
    ledger: followed.ledger,
    selection: followed.selection,
    calls,
  };
}

function failedRound(round: number, answer: string, calls: TranscriptCall[], reason: string): RoundRecord {
  const sent = calls.some((call) => call.sent);
  return {
    round,
    status: 'FAIL',
    reason,
    answer,
    answerSource: 'simulation',
    productModel: null,
    sentModel: calls[0]?.request.model ?? null,
    responseModel: calls.map((call) => call.response?.model).find((model) => model) ?? null,
    reviewId: null,
    parentReviewId: null,
    rowStatus: null,
    rowError: reason,
    evidence: sent ? 'live_network' : 'not_run',
    confirmedFacts: null,
    judgment: null,
    nextQuestion: null,
    questions: [],
    gates: {
      answerGrounding: sent ? 'FAIL' : 'NOT RUN',
      unknownPreservation: sent ? 'FAIL' : 'NOT RUN',
      judgmentDelta: sent ? 'FAIL' : 'NOT RUN',
      prioritySelection: 'NOT RUN',
    },
    failures: [reason],
    qualityPass: false,
    chainContinues: false,
    sections: null,
    ledger: null,
    selection: null,
    calls,
  };
}

function gatesOf(quality: ContractQuality, sent: boolean): RoundRecord['gates'] {
  if (!sent) {
    return { answerGrounding: 'NOT RUN', unknownPreservation: 'NOT RUN', judgmentDelta: 'NOT RUN', prioritySelection: 'NOT RUN' };
  }
  return {
    answerGrounding: quality.groundingPass ? 'PASS' : 'FAIL',
    unknownPreservation: quality.unknownPass ? 'PASS' : 'FAIL',
    judgmentDelta: quality.deltaPass ? 'PASS' : 'FAIL',
    prioritySelection: quality.call2Ran ? (quality.call2Pass ? 'PASS' : 'FAIL') : 'NOT RUN',
  };
}

function markLaterNotRun(capture: Capture, reason: string | null): void {
  for (let round = 1; round <= 4; round += 1) {
    const existing = capture.rounds[round - 1];
    if (existing) continue;
    capture.rounds[round - 1] = {
      round,
      status: 'NOT RUN',
      reason,
      answer: round === 1 ? null : (SIMULATION_ANSWERS[round - 2] ?? null),
      answerSource: round === 1 ? null : 'simulation',
      productModel: null,
      sentModel: null,
      responseModel: null,
      reviewId: null,
      parentReviewId: null,
      rowStatus: null,
      rowError: null,
      evidence: null,
      confirmedFacts: null,
      judgment: null,
      nextQuestion: null,
      questions: [],
      gates: { answerGrounding: 'NOT RUN', unknownPreservation: 'NOT RUN', judgmentDelta: 'NOT RUN', prioritySelection: 'NOT RUN' },
      failures: [],
      qualityPass: null,
      chainContinues: null,
      sections: null,
      ledger: null,
      selection: null,
      calls: [],
    };
  }
  capture.chainFinished = false;
  save(capture);
}

function unresolvedMarks(sections: ReviewSections | null, answers: string[]) {
  if (!sections) return [];
  const texts = [
    ...sections.uncertain,
    ...sections.risks,
    ...sections.hypotheses,
    ...(sections.analysis?.assumptions ?? []),
    ...(sections.analysis?.evidenceToChange ?? []),
  ];
  const seen = new Set<string>();
  const marks: Array<{ text: string; presentInAnswers: boolean }> = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    marks.push({ text: trimmed, presentInAnswers: answers.some((answer) => answer.includes(trimmed)) });
  }
  return marks;
}

function repeatedQuestionCheck(rounds: RoundRecord[]) {
  const asked: Array<{ round: number; text: string }> = [];
  const repeats: Array<{ round: number; text: string; earlierRound: number }> = [];
  for (const round of rounds) {
    for (const text of round.questions) {
      const key = compact(text);
      const earlier = asked.find((item) => compact(item.text) === key);
      if (earlier) repeats.push({ round: round.round, text, earlierRound: earlier.round });
      else if (key) asked.push({ round: round.round, text });
    }
  }
  return { exactCompactRepeats: repeats, questions: asked };
}

function judgmentChange(rounds: RoundRecord[]) {
  const judgments = rounds
    .filter((round) => round.status !== 'NOT RUN')
    .map((round) => ({ round: round.round, judgment: round.judgment }));
  const texts = judgments.map((item) => item.judgment ?? '');
  return {
    judgments,
    changedFromPrevious: texts.slice(1).map((text, index) => text.length > 0 && text !== texts[index]),
  };
}

function totalsOf(rounds: RoundRecord[]) {
  let prompt = 0;
  let completion = 0;
  let known = true;
  let callCount = 0;
  const openaiResponseIds: string[] = [];
  for (const round of rounds) {
    for (const call of round.calls) {
      if (!call.sent || !call.response) continue;
      callCount += 1;
      openaiResponseIds.push(call.response.id);
      if (!call.response.usageKnown || call.response.promptTokens === null || call.response.completionTokens === null) {
        known = false;
        continue;
      }
      prompt += call.response.promptTokens;
      completion += call.response.completionTokens;
    }
  }
  return {
    callCount,
    openaiResponseIds,
    promptTokens: known ? prompt : null,
    completionTokens: known ? completion : null,
    repositoryCostUsd: known ? (prompt * 2.5 + completion * 10) / 1_000_000 : null,
    rateLabel: 'repository rate, not an invoice',
  };
}

function publicRequest(request: ChatRequest): PublicRequest {
  return {
    model: request.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
    responseFormat: request.responseFormat,
    messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
  };
}

function publicResponse(response: ChatResponse): PublicResponse {
  return {
    id: response.id,
    model: response.model,
    provider: response.provider,
    finishReason: response.finishReason,
    content: response.content,
    usageKnown: response.usageKnown === true,
    promptTokens: response.usageKnown ? response.usage.inputTokens : null,
    completionTokens: response.usageKnown ? response.usage.outputTokens : null,
    totalTokens: response.usageKnown ? response.usage.totalTokens : null,
    latencyMs: response.latencyMs ?? null,
  };
}

function modelIsGpt4o(model: string): boolean {
  return model === MODEL || (model.startsWith('gpt-4o-') && !model.includes('mini'));
}

function compact(text: string): string {
  return text.replace(/\s+/gu, '').replace(/[?？!！。.,]/gu, '');
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'live_gpt_error';
  return message.slice(0, 500);
}

function refuseSecondChain(): void {
  if (!existsSync(CAPTURE_PATH)) return;
  const prior = JSON.parse(readFileSync(CAPTURE_PATH, 'utf8')) as { gptCallMade?: boolean };
  if (prior.gptCallMade) throw new Error('capture_exists_refusing_second_chain');
}

type Capture = ReturnType<typeof emptyCapture>;

function emptyCapture(startedAt: string) {
  const repoRoot = execSync('git rev-parse --show-toplevel', { cwd: process.cwd() }).toString().trim();
  const head = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
  return {
    repoRoot,
    kind: 'sprint2_final_completion_capture',
    gptApiKey: 'PRESENT' as const,
    vercelEnv: vercelEnv(),
    gptCallMade: false,
    supabaseTouched: false,
    productionDeployed: false,
    founderProjectTouched: false,
    productFilesEdited: false,
    experimentBHarnessEdited: false,
    decisionContractPromptsEdited: false,
    runStageReanalysisCalled: false,
    modelRequested: MODEL,
    rate: {
      model: MODEL,
      inputPer1MUsd: 2.5,
      outputPer1MUsd: 10,
      label: 'repository rate, not an invoice',
      source: 'packages/ai/src/token/manager.ts',
    },
    commit: head,
    branch: 'cursor/sprint2-final-completion-4b88',
    startedAt,
    finishedAt: null as string | null,
    businessInput: 'COMPARE_BUSINESS_BODY',
    simulationAnswers: [...SIMULATION_ANSWERS],
    store: {
      kind: 'local_sqlite' as const,
      path: '.data/alabom-sprint2-final-completion/reviews.sqlite',
      productionDatabase: false,
      durable: false,
    },
    productModel: null as string | null,
    chainFinished: false,
    rounds: [] as RoundRecord[],
    storageIds: [] as Array<Record<string, unknown>>,
    repeatedQuestionCheck: null as ReturnType<typeof repeatedQuestionCheck> | null,
    businessJudgmentChange: null as ReturnType<typeof judgmentChange> | null,
    totals: null as {
      callCount: number;
      openaiResponseIds: string[];
      promptTokens: number | null;
      completionTokens: number | null;
      repositoryCostUsd: number | null;
      rateLabel: string;
    } | null,
  };
}

function vercelEnv(): 'preview' | 'production' | 'unset' {
  const value = process.env.VERCEL_ENV;
  if (value === 'preview' || value === 'production') return value;
  return 'unset';
}

function save(capture: Capture): void {
  mkdirSync(dirname(CAPTURE_PATH), { recursive: true });
  writeFileSync(CAPTURE_PATH, redact(JSON.stringify(capture, null, 2)));
}

function redact(value: string): string {
  let text = value;
  for (const [name, raw] of Object.entries(process.env)) {
    if (!raw || raw.length < 8) continue;
    if (!/(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name)) continue;
    if (!text.includes(raw)) continue;
    text = text.split(raw).join('[redacted]');
  }
  return text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}
