import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, runStageReanalysis, saveReviewFeedback } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. One new live follow-up on a separate project.
 * The stored failure chatcmpl-EfL634bsKmQI3rCHAF4p4G6vloZMf is not called again.
 */
const enabled = process.env.AI_PM_REAL_GPT_NEXT_OBJECTIVE === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-next-objective-2026-11-01.json';
const USER_ID = 'gpt-next-objective-sim';
const PROJECT_ID = 'gpt-next-objective-project';
const STORED_FIRST_EXECUTION = 'chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde';
const SIMULATION_ANSWER =
  'SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.';

describe.skipIf(!enabled)('real gpt next review objective', () => {
  it(
    'asks one live follow-up after reconstructing the business state',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-next-objective hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-next-objective skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      await writeMarker(config, { status: 'started', startedAt, provenance: 'SIMULATION', answerProvenance: 'SIMULATION' });
      const firstFile = JSON.parse(
        readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
      ) as { rounds: Array<{ raw: string; responseModel?: string }> };
      const firstRaw = firstFile.rounds[0]?.raw ?? '';
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-next-objective-')), 'reviews.sqlite'));
      const rounds: Array<Record<string, unknown>> = [];
      const replayFirst = async () => ({
        id: `replay-${STORED_FIRST_EXECUTION}`,
        model: firstFile.rounds[0]?.responseModel ?? 'gpt-4o-mini-2024-07-18',
        provider: 'openai' as const,
        content: firstRaw,
        finishReason: 'stop' as const,
        usage: { inputTokens: 3692, outputTokens: 812, totalTokens: 4504 },
        usageKnown: true,
        latencyMs: 0,
      });
      try {
        const first = await runFirstReview({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          text: COMPARE_BUSINESS_BODY,
          origin: 'typed',
          fileName: null,
          now: startedAt,
          chat: replayFirst,
          evidence: 'injected_http',
        });
        const asked = consultingQuestions(first.record.sections);
        rounds.push({
          live: false,
          round: 1,
          provenance: 'replay_stored_raw',
          executionId: STORED_FIRST_EXECUTION,
          reviewId: first.record.reviewId,
          rowStatus: first.record.status,
          rowError: first.record.error,
          storedCallCount: first.record.callCount,
          questions: asked.map((question) => question.text),
        });
        if (first.record.status !== 'succeeded' || !first.record.sections || asked.length === 0) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'stored_first_analysis_rejected', rounds));
          return;
        }
        const live = openReviewChat();
        if (!live) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'review_chat_unavailable', rounds));
          return;
        }
        for (const question of asked) {
          await saveReviewFeedback({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            now: new Date(Date.parse(startedAt) + 60_000).toISOString(),
            body: { reviewId: first.record.reviewId, questionId: question.questionId, comment: SIMULATION_ANSWER },
          });
        }
        const chat: typeof live = async (request) => {
          const response = await live(request);
          const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
          const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
          const userJson = JSON.parse(user) as { businessState?: unknown; doNotCopy?: { priorJudgmentText?: string } };
          const required =
            request.responseFormat?.type === 'json_schema' && Array.isArray(request.responseFormat.schema.required)
              ? request.responseFormat.schema.required.filter((item): item is string => typeof item === 'string')
              : [];
          const at = (name: string) => required.indexOf(name);
          const priorJudgment = userJson.doNotCopy?.priorJudgmentText ?? '';
          rounds.push({
            live: true,
            round: 2,
            provenance: 'SIMULATION',
            executionId: response.id,
            requestedModel: request.model,
            responseModel: response.model,
            callCount: 1,
            promptTokens: response.usageKnown ? response.usage.inputTokens : null,
            completionTokens: response.usageKnown ? response.usage.outputTokens : null,
            totalTokens: response.usageKnown ? response.usage.totalTokens : null,
            usageKnown: response.usageKnown === true,
            priorQuestion: asked.map((question) => question.text),
            simulationAnswer: SIMULATION_ANSWER,
            requestHasOriginalIdea: user.includes('전통주'),
            requestHasSimulationAnswer: user.includes('SIMULATION'),
            requestHasPriorJudgment: user.includes('priorJudgmentText'),
            requestHasPurposeShift: system.includes('사업 목적은 방금 답한 질문의 목적과 달라야 한다'),
            requestOmitsFixedLadder: !system.includes('후보, 접촉, 상대의 의사, 조건'),
            requestHasBusinessState: Boolean((userJson.businessState as { useForNextObjective?: boolean } | undefined)?.useForNextObjective),
            businessStateOmitsPriorJudgment: priorJudgment.length > 0 && !JSON.stringify(userJson.businessState ?? {}).includes(priorJudgment),
            objectiveBeforeJudgment: at('nextReviewObjective') >= 0 && at('nextReviewObjective') < at('updatedJudgment') && at('nextQuestions') < at('updatedJudgment'),
            request: {
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              responseFormat: request.responseFormat,
              messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
            },
            raw: response.content,
          });
          return response;
        };
        const analyzed = await runStageReanalysis({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          reviewId: first.record.reviewId,
          now: new Date(Date.parse(startedAt) + 90_000).toISOString(),
          chat,
          evidence: 'live_network',
        });
        if (!analyzed.ok) {
          rounds.push({ live: false, round: 2, provenance: 'SIMULATION', error: analyzed.error, callCount: 0, raw: null });
        } else {
          attach(rounds, analyzed.record);
          const reread = await store.readReview(USER_ID, analyzed.record.reviewId);
          const round = rounds.at(-1);
          if (round) {
            round.nextQuestionFromRaw = nextQuestionText(String(round.raw ?? ''));
            round.nextReviewObjective = nextObjectiveText(String(round.raw ?? ''));
            round.openGaps = openGapsText(String(round.raw ?? ''));
            round.choices = nextChoices(String(round.raw ?? ''));
            round.samePurposeAsPrior = samePurpose(asked[0]?.text ?? '', String(round.nextQuestionFromRaw ?? ''));
            if (reread) {
              round.reread = {
                status: reread.status,
                error: reread.error,
                updatedJudgment: reread.stageReading?.updatedJudgment ?? reread.sections?.judgment ?? null,
                verifiedFacts: reread.stageReading?.verifiedFacts ?? null,
                unresolvedIssues: reread.stageReading?.unresolvedIssues ?? null,
                resolvedIssues: reread.stageReading?.resolvedIssues ?? null,
                nextQuestion: reread.sections?.nextQuestion ?? null,
              };
            }
          }
          const duplicate = await runStageReanalysis({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: first.record.reviewId,
            now: new Date(Date.parse(startedAt) + 120_000).toISOString(),
            chat: async () => {
              throw new Error('duplicate_stage_called_model');
            },
            evidence: 'live_network',
          });
          if (round) round.duplicateReused = duplicate.ok && duplicate.called === false;
        }
        await writeMarker(config, {
          ...baseMarker(startedAt, rounds.some((round) => round.live === true && round.raw) ? 'stored' : 'not_run', null, rounds),
          finishedAt: new Date().toISOString(),
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          priorRejectedExecutionId: 'chatcmpl-EfL634bsKmQI3rCHAF4p4G6vloZMf',
          laterRounds: 'NOT RUN',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'live_gpt_error';
        await writeMarker(config, {
          ...baseMarker(startedAt, 'failed', null, rounds),
          finishedAt: new Date().toISOString(),
          error: message.slice(0, 300),
        });
        throw error;
      }
    },
    180_000,
  );
});

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

function nextQuestionText(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { nextQuestions?: Array<{ text?: string }> };
    return parsed.nextQuestions?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

function nextObjectiveText(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { nextReviewObjective?: string };
    return parsed.nextReviewObjective ?? null;
  } catch {
    return null;
  }
}

function openGapsText(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw) as { businessReconstruction?: { openGaps?: string[] } };
    return parsed.businessReconstruction?.openGaps ?? null;
  } catch {
    return null;
  }
}

function nextChoices(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw) as { nextQuestions?: Array<{ choices?: string[] }> };
    return parsed.nextQuestions?.[0]?.choices ?? null;
  } catch {
    return null;
  }
}

function baseMarker(startedAt: string, status: string, reason: string | null, rounds: Array<Record<string, unknown>>) {
  return {
    kind: 'live_gpt_next_objective',
    provenance: 'SIMULATION',
    answerProvenance: 'SIMULATION',
    status,
    ...(reason ? { reason } : {}),
    startedAt,
    finishedAt: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    founderProjectTouched: false,
    liveCallCount: rounds.filter((round) => round.live === true).length,
    laterRounds: 'NOT RUN',
    rounds,
  };
}

function attach(rounds: Array<Record<string, unknown>>, record: StoredReview) {
  const round = rounds.at(-1);
  if (!round || round.reviewId) return;
  round.reviewId = record.reviewId;
  round.parentReviewId = record.parentReviewId;
  round.rowStatus = record.status;
  round.rowError = record.error;
  round.storedCallCount = record.callCount;
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
