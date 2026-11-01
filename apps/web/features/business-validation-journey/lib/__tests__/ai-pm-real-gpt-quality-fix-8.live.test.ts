import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, submitConsultingStage } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. Replays the stored first analysis and the Fix 6 follow-up.
 * One live call answers the contact question. The answer is SIMULATION, not a founder fact.
 * A fourth consulting round is not called.
 */
const enabled = process.env.AI_PM_REAL_GPT_QUALITY_FIX_8 === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-quality-fix-8-2026-11-01.json';
const USER_ID = 'gpt-quality-fix-8-sim';
const PROJECT_ID = 'gpt-quality-fix-8-project';
const SECOND_ANSWER = '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.';
const SIMULATION_ANSWER =
  'SIMULATION. 한 양조장에 문의했다고 말한다. 상대의 반응은 아직 없다. 참여 의향은 확인하지 못했다. 체험과 운영 조건은 합의되지 않았다.';
const STORED_FIRST_EXECUTION = 'chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde';
const STORED_SECOND_EXECUTION = 'chatcmpl-EfIliKvGG2fydxXw2ZlhTjjSlcrGH';

describe.skipIf(!enabled)('real gpt quality fix 8 simulation', () => {
  it(
    'replays the approved second judgment and calls once on a simulation contact answer',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-quality-fix-8 hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-quality-fix-8 skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      await writeMarker(config, { status: 'started', startedAt, provenance: 'SIMULATION', answerProvenance: 'SIMULATION' });
      const firstFile = JSON.parse(
        readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
      ) as { rounds: Array<{ raw: string; responseModel?: string }> };
      const secondFile = JSON.parse(
        readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-6.json', import.meta.url), 'utf8'),
      ) as { rounds: Array<{ raw: string; responseModel?: string }> };
      const firstRaw = firstFile.rounds[0]?.raw ?? '';
      const secondRaw = secondFile.rounds[0]?.raw ?? '';
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-quality-fix-8-')), 'reviews.sqlite'));
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
      const replaySecond = async () => ({
        id: `replay-${STORED_SECOND_EXECUTION}`,
        model: secondFile.rounds[0]?.responseModel ?? 'gpt-4o-mini-2024-07-18',
        provider: 'openai' as const,
        content: secondRaw,
        finishReason: 'stop' as const,
        usage: { inputTokens: 11156, outputTokens: 762, totalTokens: 11918 },
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
        if (first.record.status !== 'succeeded' || !first.record.sections) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'stored_first_analysis_rejected', rounds));
          return;
        }
        const firstQuestions = consultingQuestions(first.record.sections);
        const second = await submitConsultingStage({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          reviewId: first.record.reviewId,
          now: new Date(Date.parse(startedAt) + 60_000).toISOString(),
          answers: firstQuestions.map((question, index) => ({
            questionId: question.questionId,
            comment: index === 0 ? SECOND_ANSWER : 'SIMULATION. 추가 사실은 없다. 앞의 답과 같은 사업이다.',
          })),
          chat: replaySecond,
          evidence: 'injected_http',
        });
        const secondQuestions = second.ok ? consultingQuestions(second.record.sections) : [];
        rounds.push({
          live: false,
          provenance: 'replay_stored_raw',
          executionId: STORED_SECOND_EXECUTION,
          reviewId: second.ok ? second.record.reviewId : null,
          parentReviewId: second.ok ? second.record.parentReviewId : null,
          rowStatus: second.ok ? second.record.status : null,
          rowError: second.ok ? second.record.error : second.error,
          storedCallCount: second.ok ? second.record.callCount : 0,
          nextQuestion: second.ok ? second.record.sections?.nextQuestion ?? null : null,
          updatedJudgment: second.ok ? second.record.stageReading?.updatedJudgment ?? null : null,
        });
        const contactQuestion = secondQuestions.find((question) => question.text.includes('접촉'));
        if (!second.ok || second.record.status !== 'succeeded' || !second.record.sections || !contactQuestion) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'stored_second_analysis_rejected', rounds));
          return;
        }
        const live = openReviewChat();
        if (!live) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'review_chat_unavailable', rounds));
          return;
        }
        const chat: typeof live = async (request) => {
          const response = await live(request);
          rounds.push({
            live: true,
            provenance: 'SIMULATION',
            executionId: response.id,
            requestedModel: request.model,
            responseModel: response.model,
            callCount: 1,
            promptTokens: response.usageKnown ? response.usage.inputTokens : null,
            completionTokens: response.usageKnown ? response.usage.outputTokens : null,
            totalTokens: response.usageKnown ? response.usage.totalTokens : null,
            usageKnown: response.usageKnown === true,
            askedQuestion: contactQuestion.text,
            simulationAnswer: SIMULATION_ANSWER,
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
        const analyzed = await submitConsultingStage({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          reviewId: second.record.reviewId,
          now: new Date(Date.parse(startedAt) + 120_000).toISOString(),
          answers: secondQuestions.map((question) => ({
            questionId: question.questionId,
            comment: question.questionId === contactQuestion.questionId ? SIMULATION_ANSWER : 'SIMULATION. 추가 사실은 없다.',
          })),
          chat,
          evidence: 'live_network',
        });
        if (!analyzed.ok) {
          rounds.push({ live: false, provenance: 'SIMULATION', error: analyzed.error, callCount: 0, raw: null });
        } else {
          attach(rounds, analyzed.record);
          const reread = await store.readReview(USER_ID, analyzed.record.reviewId);
          const round = rounds.at(-1);
          if (round && reread) {
            round.reread = {
              status: reread.status,
              error: reread.error,
              updatedJudgment: reread.stageReading?.updatedJudgment ?? reread.sections?.judgment ?? null,
              judgmentReason: reread.stageReading?.judgmentReason ?? null,
              impactOnPreviousJudgment: reread.stageReading?.impactOnPreviousJudgment ?? null,
              verifiedFacts: reread.stageReading?.verifiedFacts ?? null,
              unverifiedClaims: reread.stageReading?.unverifiedClaims ?? null,
              unresolvedIssues: reread.stageReading?.unresolvedIssues ?? null,
              nextQuestion: reread.sections?.nextQuestion ?? null,
              supply: reread.sections?.analysis?.supply ?? null,
              marketing: reread.sections?.analysis?.marketing ?? null,
            };
          }
        }
        await writeMarker(config, {
          ...baseMarker(startedAt, rounds.some((round) => round.live === true && round.raw) ? 'stored' : 'not_run', null, rounds),
          finishedAt: new Date().toISOString(),
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          firstAnalysis: {
            source: 'replayed_stored_raw',
            executionId: STORED_FIRST_EXECUTION,
            reviewId: first.record.reviewId,
            liveCallCount: 0,
          },
          secondAnalysis: {
            source: 'replayed_stored_raw',
            executionId: STORED_SECOND_EXECUTION,
            reviewId: second.record.reviewId,
            liveCallCount: 0,
            updatedJudgment: second.record.stageReading?.updatedJudgment ?? null,
            nextQuestion: second.record.sections?.nextQuestion ?? null,
          },
          simulationAnswer: SIMULATION_ANSWER,
          askedQuestion: contactQuestion.text,
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

function baseMarker(startedAt: string, status: string, reason: string | null, rounds: Array<Record<string, unknown>>) {
  return {
    kind: 'live_gpt_quality_fix_8_simulation',
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
  round.inputText = record.inputText;
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
