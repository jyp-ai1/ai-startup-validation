import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import {
  EXPERIMENT_B_MODEL,
  EXPERIMENT_B_PRODUCT_MODEL,
  repositoryCostUsd,
  runExperimentBFollowUp,
  type ExperimentCallLog,
} from '../ai-pm-experiment-b';
import { consultingQuestions, openReviewChat, runFirstReview, saveReviewFeedback } from '../ai-pm-review';
import { openAiPmReviewStore } from '../ai-pm-review-store';

/**
 * Preview build only. Experiment B uses two calls for each follow-up.
 * Product runStageReanalysis is not called. A quality failure stops the chain.
 */
const enabled = process.env.AI_PM_REAL_GPT_EXPERIMENT_B === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-experiment-b-2026-11-01.json';
const USER_ID = 'gpt-experiment-b-sim';
const PROJECT_ID = 'gpt-experiment-b-project';
const SIMULATION_ANSWERS = [
  'SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 실제 예약과 지불은 없다. 누가 비용을 낼지는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
  'SIMULATION. 알릴 채널과 운영 책임자는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.',
];

describe.skipIf(!enabled)('real gpt experiment B', () => {
  it(
    'runs a two-call consulting chain on gpt-4o through four rounds',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-experiment-b hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-experiment-b skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      const rounds: Array<Record<string, unknown>> = [];
      await writeMarker(config, baseMarker(startedAt, 'started', null, rounds));
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-experiment-b-')), 'reviews.sqlite'));
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
            callCount: record.callCount,
          })),
          productStageReanalysisCalled: false,
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
          chat: watchFirst(firstLive, rounds),
          evidence: 'live_network',
        });
        const firstRound = rounds.filter((round) => round.round === 1).at(-1);
        if (firstRound) {
          firstRound.reviewId = first.record.reviewId;
          firstRound.rowStatus = first.record.status;
          firstRound.rowError = first.record.error;
          firstRound.questions = consultingQuestions(first.record.sections).map((question) => question.text);
        }
        if (!modelIsGpt4o(String(firstRound?.responseModel ?? '')) || first.record.status !== 'succeeded' || !first.record.sections) {
          await persist('stored', 'first_review_rejected');
          return;
        }
        let parent = first.record;
        const priorAnswers: string[] = [];
        let closedQuestions = consultingQuestions(parent.sections).map((question) => question.text);
        let priorChoiceLabels = consultingQuestions(parent.sections).map((question) => question.choices?.map((choice) => choice.label) ?? []);
        let priorJudgment = parent.sections.analysis?.judgmentDetail || parent.sections.judgment;
        let priorRisks = [...parent.sections.risks];
        let openUncertainties = [...parent.sections.uncertain];
        let unresolved = [...parent.sections.uncertain];
        for (let index = 0; index < SIMULATION_ANSWERS.length; index += 1) {
          const roundNumber = index + 2;
          const answer = SIMULATION_ANSWERS[index] ?? '';
          const questions = consultingQuestions(parent.sections);
          if (parent.status !== 'succeeded' || questions.length === 0) {
            rounds.push({ live: false, round: roundNumber, error: 'parent_not_ready', callCount: 0 });
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
            rounds.push({ live: false, round: roundNumber, error: 'answer_save_failed', answerSaves, callCount: 0 });
            break;
          }
          const live = openReviewChat();
          if (!live) {
            rounds.push({ live: false, round: roundNumber, error: 'review_chat_unavailable', answerSaves, callCount: 0 });
            break;
          }
          const feedback = await store.listFeedback(USER_ID, parent.reviewId);
          const followed = await runExperimentBFollowUp({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            parent,
            answer,
            now: new Date(Date.parse(startedAt) + roundNumber * 60_000 + 30_000).toISOString(),
            chat: live,
            sourceFeedbackId: feedback.at(-1)?.feedbackId ?? null,
            originalIdea: COMPARE_BUSINESS_BODY,
            priorAnswers,
            priorJudgment,
            priorRisks,
            openUncertainties,
            closedQuestions,
            priorChoiceLabels,
            unresolved,
          });
          const round = roundRecord(roundNumber, answer, answerSaves, followed);
          let duplicateThrew = false;
          try {
            const duplicate = await runExperimentBFollowUp({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              parent,
              answer,
              now: new Date(Date.parse(startedAt) + roundNumber * 60_000 + 45_000).toISOString(),
              chat: async () => {
                duplicateThrew = true;
                throw new Error('duplicate_called_model');
              },
              sourceFeedbackId: feedback.at(-1)?.feedbackId ?? null,
              originalIdea: COMPARE_BUSINESS_BODY,
              priorAnswers,
              priorJudgment,
              priorRisks,
              openUncertainties,
              closedQuestions,
              priorChoiceLabels,
              unresolved,
            });
            round.duplicateReused = duplicate.called === false && duplicate.record.reviewId === followed.record.reviewId && !duplicateThrew;
          } catch {
            round.duplicateReused = false;
          }
          const reread = await store.readReview(USER_ID, followed.record.reviewId);
          round.reread = reread
            ? {
                status: reread.status,
                error: reread.error,
                callCount: reread.callCount,
                nextQuestion: reread.sections?.nextQuestion ?? null,
                verifiedFacts: reread.stageReading?.verifiedFacts ?? null,
              }
            : null;
          rounds.push(round);
          if (!followed.quality.chainContinues || followed.record.status !== 'succeeded' || !followed.record.sections) break;
          parent = followed.record;
          priorAnswers.push(answer);
          const asked = consultingQuestions(parent.sections);
          closedQuestions = [...closedQuestions, ...asked.map((question) => question.text)];
          priorChoiceLabels = [...priorChoiceLabels, ...asked.map((question) => question.choices?.map((choice) => choice.label) ?? [])];
          priorJudgment = parent.sections.judgment;
          priorRisks = [...parent.sections.risks];
          openUncertainties = [...parent.sections.uncertain];
          unresolved = parent.stageReading?.unresolvedIssues ?? [];
          await persist('started', null);
        }
        await persist('stored', null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'live_gpt_error';
        rounds.push({ live: false, error: message.slice(0, 300) });
        await persist('failed', null);
        throw error;
      } finally {
        store.close();
      }
    },
    600_000,
  );
});

function watchFirst(
  live: NonNullable<ReturnType<typeof openReviewChat>>,
  rounds: Array<Record<string, unknown>>,
): NonNullable<ReturnType<typeof openReviewChat>> {
  return async (request) => {
    const sent = { ...request, model: EXPERIMENT_B_MODEL };
    const response = await live(sent);
    const system = sent.messages.find((message) => message.role === 'system')?.content ?? '';
    rounds.push({
      live: true,
      round: 1,
      callIndex: 1,
      role: 'first_review',
      provenance: 'live_first_review',
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
      requestHasQuality2: system.includes('프롬프트 버전 quality-2'),
      request: {
        temperature: sent.temperature,
        maxTokens: sent.maxTokens,
        responseFormat: sent.responseFormat,
        messages: sent.messages.map((message) => ({ role: message.role, content: message.content })),
      },
      raw: response.content,
    });
    return response;
  };
}

function roundRecord(
  round: number,
  answer: string,
  answerSaves: Array<Record<string, unknown>>,
  followed: Awaited<ReturnType<typeof runExperimentBFollowUp>>,
): Record<string, unknown> {
  const inputTokens = followed.calls.reduce((sum, call) => sum + (call.promptTokens ?? 0), 0);
  const outputTokens = followed.calls.reduce((sum, call) => sum + (call.completionTokens ?? 0), 0);
  return {
    live: true,
    round,
    provenance: 'SIMULATION',
    simulationAnswer: answer,
    answerSaves,
    called: followed.called,
    callCount: followed.calls.length,
    storedCallCount: followed.record.callCount,
    reviewId: followed.record.reviewId,
    parentReviewId: followed.record.parentReviewId,
    rowStatus: followed.record.status,
    rowError: followed.record.error,
    qualityPass: followed.quality.qualityPass,
    chainContinues: followed.quality.chainContinues,
    failures: followed.quality.failures,
    storageWritten: true,
    promptTokens: followed.record.promptTokens,
    completionTokens: followed.record.completionTokens,
    totalTokens: followed.record.totalTokens,
    repositoryCostUsd: repositoryCostUsd(inputTokens, outputTokens),
    calls: followed.calls.map(publicCall),
  };
}

function publicCall(call: ExperimentCallLog): Record<string, unknown> {
  return {
    role: call.role,
    executionId: call.executionId,
    responseModel: call.responseModel,
    modelIsGpt4o: modelIsGpt4o(call.responseModel),
    finishReason: call.finishReason,
    promptTokens: call.promptTokens,
    completionTokens: call.completionTokens,
    totalTokens: call.totalTokens,
    usageKnown: call.usageKnown,
    repositoryCostUsd:
      call.promptTokens !== null && call.completionTokens !== null ? repositoryCostUsd(call.promptTokens, call.completionTokens) : null,
    request: {
      model: call.request.model,
      temperature: call.request.temperature,
      maxTokens: call.request.maxTokens,
      responseFormat: call.request.responseFormat,
      messages: call.request.messages.map((message) => ({ role: message.role, content: message.content })),
    },
    raw: call.raw,
  };
}

function modelIsGpt4o(model: string): boolean {
  return model === 'gpt-4o' || (model.startsWith('gpt-4o-') && !model.includes('mini'));
}

function missingRounds(rounds: Array<Record<string, unknown>>): string {
  const reached = new Set(rounds.filter((round) => round.live === true).map((round) => round.round));
  const missing = [1, 2, 3, 4].filter((round) => !reached.has(round));
  return missing.length === 0 ? '1-4 RUN' : missing.map((round) => `${round} NOT RUN`).join(', ');
}

function baseMarker(startedAt: string, status: string, reason: string | null, rounds: Array<Record<string, unknown>>) {
  const followUps = rounds.filter((round) => round.round !== 1 && round.live === true);
  const inputTokens = followUps.reduce<number>((sum, round) => sum + (typeof round.promptTokens === 'number' ? round.promptTokens : 0), 0);
  const outputTokens = followUps.reduce<number>((sum, round) => sum + (typeof round.completionTokens === 'number' ? round.completionTokens : 0), 0);
  return {
    kind: 'live_gpt_experiment_b',
    experiment: 'B',
    experimentModel: EXPERIMENT_B_MODEL,
    productModel: EXPERIMENT_B_PRODUCT_MODEL,
    provenance: 'SIMULATION',
    answerProvenance: 'SIMULATION',
    businessInput: 'COMPARE_BUSINESS_BODY',
    status,
    ...(reason ? { reason } : {}),
    startedAt,
    finishedAt: status === 'started' ? null : new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    founderProjectTouched: false,
    productStageReanalysisCalled: false,
    singleCallBaseline: {
      source: 'experiment A round 2',
      promptTokens: 15296,
      completionTokens: 1084,
      repositoryCostUsd: repositoryCostUsd(15296, 1084),
      note: 'repository rate, not an invoice',
    },
    followUpRepositoryCostUsd: repositoryCostUsd(inputTokens, outputTokens),
    liveCallCount: rounds.reduce<number>((sum, round) => sum + (typeof round.callCount === 'number' ? round.callCount : round.live === true ? 1 : 0), 0),
    answerSaveModelCalls: rounds.reduce<number>((sum, round) => {
      const saves = Array.isArray(round.answerSaves) ? round.answerSaves : [];
      return sum + saves.reduce<number>((inner, item) => inner + (item && typeof item === 'object' && 'modelCalls' in item && typeof item.modelCalls === 'number' ? item.modelCalls : 0), 0);
    }, 0),
    laterRounds: missingRounds(rounds),
    rounds,
  };
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
