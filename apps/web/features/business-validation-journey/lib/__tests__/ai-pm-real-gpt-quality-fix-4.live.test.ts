import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, submitConsultingStage } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. Replays the stored first analysis and makes one live follow-up call.
 * The founder answer is synthetic test data. The third consulting round is not called.
 */
const enabled = process.env.AI_PM_REAL_GPT_QUALITY_FIX_4 === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-quality-fix-4-2026-11-01.json';
const USER_ID = 'gpt-quality-fix-4-sim';
const PROJECT_ID = 'gpt-quality-fix-4-project';
const SYNTHETIC_ANSWER = '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.';
const STORED_FIRST_EXECUTION = 'chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde';

describe.skipIf(!enabled)('real gpt quality fix 4 follow-up', () => {
  it(
    'replays the stored first analysis and calls one follow-up after the reassessment contract',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-quality-fix-4 hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-quality-fix-4 skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      await writeMarker(config, { status: 'started', startedAt, provenance: 'live_gpt', answerProvenance: 'synthetic-test-data' });
      const stored = JSON.parse(
        readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
      ) as { rounds: Array<{ raw: string; responseModel?: string }> };
      const firstRaw = stored.rounds[0]?.raw ?? '';
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-quality-fix-4-')), 'reviews.sqlite'));
      const rounds: Array<Record<string, unknown>> = [];
      const replay = async () => ({
        id: `replay-${STORED_FIRST_EXECUTION}`,
        model: stored.rounds[0]?.responseModel ?? 'gpt-4o-mini-2024-07-18',
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
          chat: replay,
          evidence: 'injected_http',
        });
        if (first.record.status !== 'succeeded' || !first.record.sections) {
          await writeMarker(config, {
            kind: 'live_gpt_quality_fix_4',
            provenance: 'live_gpt',
            answerProvenance: 'synthetic-test-data',
            status: 'not_run',
            reason: 'stored_first_analysis_rejected',
            startedAt,
            finishedAt: new Date().toISOString(),
            gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
            founderProjectTouched: false,
            liveCallCount: 0,
            rounds,
          });
          return;
        }
        const live = openReviewChat();
        if (!live) {
          await writeMarker(config, {
            kind: 'live_gpt_quality_fix_4',
            provenance: 'live_gpt',
            answerProvenance: 'synthetic-test-data',
            status: 'not_run',
            reason: 'review_chat_unavailable',
            startedAt,
            finishedAt: new Date().toISOString(),
            founderProjectTouched: false,
            liveCallCount: 0,
            rounds,
          });
          return;
        }
        const chat: typeof live = async (request) => {
          const response = await live(request);
          rounds.push({
            live: true,
            executionId: response.id,
            requestedModel: request.model,
            responseModel: response.model,
            callCount: 1,
            promptTokens: response.usageKnown ? response.usage.inputTokens : null,
            completionTokens: response.usageKnown ? response.usage.outputTokens : null,
            totalTokens: response.usageKnown ? response.usage.totalTokens : null,
            usageKnown: response.usageKnown === true,
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
        const questions = consultingQuestions(first.record.sections);
        const analyzed = await submitConsultingStage({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          reviewId: first.record.reviewId,
          now: new Date(Date.parse(startedAt) + 60_000).toISOString(),
          answers: questions.map((question, index) => ({
            questionId: question.questionId,
            comment: index === 0 ? SYNTHETIC_ANSWER : '추가 사실은 없다. 앞의 답과 같은 사업이다.',
          })),
          chat,
          evidence: 'live_network',
        });
        if (!analyzed.ok) {
          rounds.push({ live: false, error: analyzed.error, callCount: 0, raw: null });
        } else {
          attach(rounds, analyzed.record);
        }
        await writeMarker(config, {
          kind: 'live_gpt_quality_fix_4',
          provenance: 'live_gpt',
          answerProvenance: 'synthetic-test-data',
          status: rounds.some((round) => round.live === true && round.raw) ? 'stored' : 'not_run',
          startedAt,
          finishedAt: new Date().toISOString(),
          gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          founderProjectTouched: false,
          firstAnalysis: {
            source: 'replayed_stored_raw',
            executionId: STORED_FIRST_EXECUTION,
            reviewId: first.record.reviewId,
            liveCallCount: 0,
          },
          failedOriginalReviewId: 'a05298c6-db8b-4c84-9671-e38c02236468',
          liveCallCount: rounds.filter((round) => round.live === true).length,
          laterRounds: 'NOT RUN',
          rounds,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'live_gpt_error';
        await writeMarker(config, {
          kind: 'live_gpt_quality_fix_4',
          provenance: 'live_gpt',
          answerProvenance: 'synthetic-test-data',
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          error: message.slice(0, 300),
          founderProjectTouched: false,
          liveCallCount: rounds.filter((round) => round.live === true).length,
          rounds,
        });
        throw error;
      }
    },
    120_000,
  );
});

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
