import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, runStageReanalysis, saveReviewFeedback } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. Experiment A sends the current review requests to gpt-4o.
 * The business text, SIMULATION answers, prompt, schema, and storage rules stay as they are.
 * A repeated-purpose failure stops the chain. Experiment B is not started.
 */
const enabled = process.env.AI_PM_REAL_GPT_EXPERIMENT_A === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-experiment-a-2026-11-01.json';
const USER_ID = 'gpt-experiment-a-sim';
const PROJECT_ID = 'gpt-experiment-a-project';
const EXPERIMENT_MODEL = 'gpt-4o';
const SIMULATION_ANSWERS = [
  'SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 실제 예약과 지불은 없다. 누가 비용을 낼지는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 알릴 채널과 운영 책임자는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
];

describe.skipIf(!enabled)('real gpt experiment A', () => {
  it(
    'runs the current consulting chain on gpt-4o through four rounds',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-experiment-a hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
        return;
      }
      const config = supabaseConfig();
      expect(config).not.toBeNull();
      if (!config) return;
      const existing = await readMarker(config);
      const existingRounds = Array.isArray(existing?.rounds) ? existing.rounds : [];
      const startedAge = Date.now() - Date.parse(String(existing?.startedAt ?? ''));
      const startedFresh = existing?.status === 'started' && Number.isFinite(startedAge) && startedAge < 20 * 60 * 1000;
      if (existingRounds.length > 0 || startedFresh) {
        console.log(`real-gpt-experiment-a skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      const rounds: Array<Record<string, unknown>> = [];
      await writeMarker(config, baseMarker(startedAt, 'started', null, rounds));
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-experiment-a-')), 'reviews.sqlite'));
      let parentId: string | null = null;
      let priorQuestion = '';
      const persist = async (status: string, reason: string | null) => {
        const listed = await store.listReviews(USER_ID, PROJECT_ID);
        await writeMarker(config, {
          ...baseMarker(startedAt, status, reason, rounds),
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          rereadCount: listed.length,
          rereadStatuses: listed.map((record) => ({
            reviewId: record.reviewId,
            status: record.status,
            error: record.error,
            parentReviewId: record.parentReviewId,
          })),
          experimentB: 'NOT RUN',
          doesNotRetry: [
            'chatcmpl-EfLnSgFokSDcF9RHGzYxAAfqCMg9w',
            'chatcmpl-EfLOkyOcJrd5Z6jdlZi72ayH6tI73',
            'chatcmpl-EfL634bsKmQI3rCHAF4p4G6vloZMf',
            'chatcmpl-EfKuXRvp8EvzqhOx1oHKq94a4RQch',
          ],
        });
      };
      try {
        const firstLive = openReviewChat();
        if (!firstLive) {
          await persist('not_run', 'review_chat_unavailable');
          return;
        }
        const first = await runFirstReview({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          text: COMPARE_BUSINESS_BODY,
          origin: 'typed',
          fileName: null,
          now: startedAt,
          chat: watch(firstLive, rounds, 1, null),
          evidence: 'live_network',
        });
        attach(rounds, 1, first.record);
        const asked = consultingQuestions(first.record.sections);
        const firstRound = rounds.filter((round) => round.round === 1).at(-1);
        if (firstRound) {
          firstRound.questions = asked.map((question) => question.text);
          firstRound.choices = asked.map((question) => question.choices?.map((choice) => choice.label) ?? []);
        }
        parentId = first.record.reviewId;
        priorQuestion = asked[0]?.text ?? first.record.sections?.nextQuestion ?? '';
        if (!modelIsGpt4o(String(firstRound?.responseModel ?? ''))) {
          await persist('stored', 'response_model_mismatch');
          return;
        }
        if (first.record.status !== 'succeeded' || !first.record.sections || asked.length === 0) {
          await persist('stored', 'first_review_rejected');
          return;
        }
        let duplicateChecked = false;
        for (let index = 0; index < SIMULATION_ANSWERS.length; index += 1) {
          const roundNumber = index + 2;
          const answer = SIMULATION_ANSWERS[index] ?? '';
          const parent = await store.readReview(USER_ID, parentId);
          const questions = consultingQuestions(parent?.sections);
          if (!parent || parent.status !== 'succeeded' || questions.length === 0) {
            rounds.push({ live: false, round: roundNumber, provenance: 'SIMULATION', error: 'parent_not_ready', callCount: 0, raw: null });
            break;
          }
          const answerSaves: Array<Record<string, unknown>> = [];
          for (const question of questions) {
            const saved = await saveReviewFeedback({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              now: new Date(Date.parse(startedAt) + roundNumber * 60_000).toISOString(),
              body: { reviewId: parent.reviewId, questionId: question.questionId, comment: answer },
            });
            answerSaves.push({
              questionId: question.questionId,
              ok: saved.ok,
              modelCalls: saved.ok ? saved.feedback.modelCalls : null,
              error: saved.ok ? null : saved.error,
            });
          }
          if (answerSaves.some((item) => item.ok !== true)) {
            rounds.push({ live: false, round: roundNumber, provenance: 'SIMULATION', error: 'answer_save_failed', answerSaves, callCount: 0, raw: null });
            break;
          }
          const live = openReviewChat();
          if (!live) {
            rounds.push({ live: false, round: roundNumber, provenance: 'SIMULATION', error: 'review_chat_unavailable', answerSaves, callCount: 0, raw: null });
            break;
          }
          const analyzed = await runStageReanalysis({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: parent.reviewId,
            now: new Date(Date.parse(startedAt) + roundNumber * 60_000 + 30_000).toISOString(),
            chat: watch(live, rounds, roundNumber, { priorQuestion, simulationAnswer: answer, answerSaves }),
            evidence: 'live_network',
          });
          const round = rounds.filter((item) => item.round === roundNumber).at(-1);
          if (!analyzed.ok) {
            if (round) round.stageError = analyzed.error;
            else rounds.push({ live: false, round: roundNumber, provenance: 'SIMULATION', error: analyzed.error, answerSaves, callCount: 0, raw: null });
            break;
          }
          attach(rounds, roundNumber, analyzed.record);
          const current = rounds.filter((item) => item.round === roundNumber).at(-1);
          if (current) {
            const parsed = readModel(String(current.raw ?? ''));
            current.objectiveCandidates = parsed.candidates;
            current.selectedCandidateId = parsed.selectedCandidateId;
            current.selectionReason = parsed.selectionReason;
            current.selectedInCandidates = parsed.selectedInCandidates;
            current.selectedOverlapsReviewedObjective = parsed.selectedOverlaps;
            current.selectedObjective = parsed.selectedObjective;
            current.nextQuestionFromRaw = parsed.question;
            current.questions = parsed.questions;
            current.choices = parsed.choices;
            current.verificationPurpose = parsed.verificationPurpose;
            current.samePurposeAsPrior = samePurpose(priorQuestion, parsed.question ?? '');
            current.updatedJudgmentFromRaw = parsed.updatedJudgment;
            const reread = await store.readReview(USER_ID, analyzed.record.reviewId);
            if (reread) {
              current.reread = {
                status: reread.status,
                error: reread.error,
                updatedJudgment: reread.stageReading?.updatedJudgment ?? reread.sections?.judgment ?? null,
                verifiedFacts: reread.stageReading?.verifiedFacts ?? null,
                unresolvedIssues: reread.stageReading?.unresolvedIssues ?? null,
                resolvedIssues: reread.stageReading?.resolvedIssues ?? null,
                unverifiedClaims: reread.stageReading?.unverifiedClaims ?? null,
                nextQuestion: reread.sections?.nextQuestion ?? null,
                questions: reread.sections?.analysis?.questions?.map((question) => question.text) ?? [],
              };
            }
          }
          if (!duplicateChecked) {
            duplicateChecked = true;
            const duplicate = await runStageReanalysis({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              reviewId: parent.reviewId,
              now: new Date(Date.parse(startedAt) + roundNumber * 60_000 + 45_000).toISOString(),
              chat: async () => {
                throw new Error('duplicate_stage_called_model');
              },
              evidence: 'live_network',
            });
            if (current) current.duplicateReused = duplicate.ok && duplicate.called === false && duplicate.record.reviewId === analyzed.record.reviewId;
          }
          if (!modelIsGpt4o(String(current?.responseModel ?? ''))) break;
          const storedQuestions = consultingQuestions(analyzed.record.sections);
          if (analyzed.record.status !== 'succeeded' || !analyzed.record.sections || storedQuestions.length === 0) break;
          parentId = analyzed.record.reviewId;
          priorQuestion = storedQuestions[0]?.text ?? analyzed.record.sections.nextQuestion ?? priorQuestion;
          await persist('started', null);
        }
        await persist('stored', null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'live_gpt_error';
        rounds.push({ live: false, error: message.slice(0, 300) });
        await persist('failed', null);
        throw error;
      }
    },
    480_000,
  );
});

function watch(
  live: NonNullable<ReturnType<typeof openReviewChat>>,
  rounds: Array<Record<string, unknown>>,
  round: number,
  extra: { priorQuestion: string; simulationAnswer: string; answerSaves: Array<Record<string, unknown>> } | null,
): NonNullable<ReturnType<typeof openReviewChat>> {
  let callIndex = 0;
  return async (request) => {
    const sent = { ...request, model: EXPERIMENT_MODEL };
    const response = await live(sent);
    callIndex += 1;
    const user = sent.messages.find((message) => message.role === 'user')?.content ?? '';
    const system = sent.messages.find((message) => message.role === 'system')?.content ?? '';
    let userJson: Record<string, unknown> = {};
    try {
      userJson = JSON.parse(user) as Record<string, unknown>;
    } catch {
      userJson = {};
    }
    const businessState = userJson.businessState as
      | {
          areaOrderIsNotPriority?: boolean;
          statedRecord?: { originalIdea?: string; answers?: unknown[]; confirmed?: unknown };
          areaStatus?: unknown;
          priorReview?: { judgment?: string; reviewedObjectives?: unknown; hypotheses?: unknown; unresolved?: unknown; resolved?: unknown };
        }
      | undefined;
    const statedAnswers = businessState?.statedRecord?.answers;
    const required =
      sent.responseFormat?.type === 'json_schema' && Array.isArray(sent.responseFormat.schema.required)
        ? sent.responseFormat.schema.required.filter((item): item is string => typeof item === 'string')
        : [];
    rounds.push({
      live: true,
      round,
      callIndex,
      provenance: round === 1 ? 'live_first_review' : 'SIMULATION',
      executionId: response.id,
      productModel: request.model,
      sentModel: sent.model,
      responseModel: response.model,
      modelIsGpt4o: modelIsGpt4o(response.model),
      finishReason: response.finishReason,
      callCount: 1,
      promptTokens: response.usageKnown ? response.usage.inputTokens : null,
      completionTokens: response.usageKnown ? response.usage.outputTokens : null,
      totalTokens: response.usageKnown ? response.usage.totalTokens : null,
      usageKnown: response.usageKnown === true,
      priorQuestion: extra?.priorQuestion ?? null,
      simulationAnswer: extra?.simulationAnswer ?? null,
      answerSaves: extra?.answerSaves ?? [],
      requestHasOriginalIdea: user.includes('전통주') || user.includes(COMPARE_BUSINESS_BODY.slice(0, 24)),
      requestHasSimulationAnswer: extra ? user.includes('SIMULATION') : false,
      requestHasQuality2: system.includes('프롬프트 버전 quality-2'),
      requestHasStatedRecord: Boolean(businessState?.statedRecord?.originalIdea),
      requestHasAreaStatus: Array.isArray(businessState?.areaStatus),
      requestHasPriorReview: Boolean(businessState?.priorReview),
      areaOrderIsNotPriority: businessState?.areaOrderIsNotPriority === true,
      areaStatus: businessState?.areaStatus ?? null,
      statedOriginalIdea: businessState?.statedRecord?.originalIdea ?? null,
      statedAnswerCount: Array.isArray(statedAnswers) ? statedAnswers.length : 0,
      statedConfirmed: businessState?.statedRecord?.confirmed ?? null,
      reviewedObjectives: businessState?.priorReview?.reviewedObjectives ?? null,
      hypotheses: businessState?.priorReview?.hypotheses ?? null,
      unresolved: businessState?.priorReview?.unresolved ?? null,
      resolved: businessState?.priorReview?.resolved ?? null,
      priorReviewJudgment: businessState?.priorReview?.judgment ?? null,
      schemaHasCandidates: required.includes('objectiveCandidates') && required.includes('selectedCandidateId'),
      request: {
        temperature: sent.temperature,
        maxTokens: sent.maxTokens,
        responseFormat: sent.responseFormat,
        messages: sent.messages.map((message) => ({ role: message.role, content: message.content })),
      },
      systemHasCandidateSelection: system.includes('objectiveCandidates') && system.includes('selectedCandidateId'),
      raw: response.content,
    });
    return response;
  };
}

function modelIsGpt4o(model: string): boolean {
  return model === 'gpt-4o' || (model.startsWith('gpt-4o-') && !model.includes('mini'));
}

function purposeKey(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[?？!！。]/g, '')
    .replace(/구축|구체화/g, '실행')
    .replace(/구체적으로|구체적|정확히|실제로|어떻게|할계획인가|할것인가|계획인가|것인가/g, '');
}

function samePurpose(prior: string, next: string): boolean {
  const left = purposeKey(prior);
  const right = purposeKey(next);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  return shorter.length >= 12 && longer.includes(shorter);
}

function readModel(raw: string): {
  candidates: unknown;
  selectedCandidateId: string | null;
  selectionReason: string | null;
  selectedInCandidates: boolean | null;
  selectedOverlaps: boolean | null;
  selectedObjective: string | null;
  question: string | null;
  questions: string[];
  choices: string[][];
  verificationPurpose: string | null;
  updatedJudgment: string | null;
} {
  const empty = {
    candidates: null,
    selectedCandidateId: null,
    selectionReason: null,
    selectedInCandidates: null,
    selectedOverlaps: null,
    selectedObjective: null,
    question: null,
    questions: [],
    choices: [],
    verificationPurpose: null,
    updatedJudgment: null,
  };
  try {
    const parsed = JSON.parse(raw) as {
      objectiveCandidates?: Array<{ candidateId?: string; objective?: string; overlapsReviewedObjective?: boolean }>;
      selectedCandidateId?: string;
      selectionReason?: string;
      updatedJudgment?: string;
      nextQuestions?: Array<{ text?: string; choices?: string[]; verificationPurpose?: string }>;
    };
    const candidates = Array.isArray(parsed.objectiveCandidates) ? parsed.objectiveCandidates : [];
    const selected = candidates.find((item) => item.candidateId === parsed.selectedCandidateId);
    const questions = (parsed.nextQuestions ?? []).map((item) => item.text ?? '').filter((text) => text.length > 0);
    return {
      candidates: parsed.objectiveCandidates ?? null,
      selectedCandidateId: parsed.selectedCandidateId ?? null,
      selectionReason: parsed.selectionReason ?? null,
      selectedInCandidates: parsed.selectedCandidateId ? candidates.some((item) => item.candidateId === parsed.selectedCandidateId) : false,
      selectedOverlaps: typeof selected?.overlapsReviewedObjective === 'boolean' ? selected.overlapsReviewedObjective : null,
      selectedObjective: selected?.objective ?? null,
      question: questions[0] ?? null,
      questions,
      choices: (parsed.nextQuestions ?? []).map((item) => item.choices ?? []),
      verificationPurpose: parsed.nextQuestions?.[0]?.verificationPurpose ?? null,
      updatedJudgment: parsed.updatedJudgment ?? null,
    };
  } catch {
    return empty;
  }
}

function missingRounds(rounds: Array<Record<string, unknown>>): string {
  const reached = new Set(rounds.filter((round) => round.live === true).map((round) => round.round));
  const missing = [1, 2, 3, 4].filter((round) => !reached.has(round));
  return missing.length === 0 ? '1-4 RUN' : missing.map((round) => `${round} NOT RUN`).join(', ');
}

function baseMarker(startedAt: string, status: string, reason: string | null, rounds: Array<Record<string, unknown>>) {
  return {
    kind: 'live_gpt_experiment_a',
    experiment: 'A',
    experimentModel: EXPERIMENT_MODEL,
    provenance: 'SIMULATION',
    answerProvenance: 'SIMULATION',
    businessInput: 'COMPARE_BUSINESS_BODY',
    status,
    ...(reason ? { reason } : {}),
    startedAt,
    finishedAt: status === 'started' ? null : new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    founderProjectTouched: false,
    experimentB: 'NOT RUN',
    liveCallCount: rounds.filter((round) => round.live === true).length,
    answerSaveModelCalls: rounds.reduce<number>((sum, round) => {
      const saves = Array.isArray(round.answerSaves) ? round.answerSaves : [];
      return (
        sum +
        saves.reduce<number>((inner, item) => {
          const calls = item && typeof item === 'object' && 'modelCalls' in item ? item.modelCalls : 0;
          return inner + (typeof calls === 'number' ? calls : 0);
        }, 0)
      );
    }, 0),
    laterRounds: missingRounds(rounds),
    rounds,
  };
}

function attach(rounds: Array<Record<string, unknown>>, roundNumber: number, record: StoredReview) {
  const round = [...rounds].reverse().find((item) => item.round === roundNumber && item.live === true && !item.reviewId);
  if (!round) return;
  round.reviewId = record.reviewId;
  round.parentReviewId = record.parentReviewId;
  round.rowStatus = record.status;
  round.rowError = record.error;
  round.storedCallCount = record.callCount;
  round.storedPromptTokens = record.promptTokens;
  round.storedCompletionTokens = record.completionTokens;
  round.storedTotalTokens = record.totalTokens;
  round.ledgerCalls = record.callLedger?.length ?? null;
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key.trim()) return null;
  return { url, key };
}

async function readMarker(config: { url: string; key: string }): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${OBJECT}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}

async function writeMarker(config: { url: string; key: string }, payload: Record<string, unknown>): Promise<void> {
  const secrets = [config.key, process.env.GPT_API_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  let text = JSON.stringify(payload);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 8) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${OBJECT}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: text,
  });
  if (!response.ok) throw new Error(`marker_${response.status}`);
}
