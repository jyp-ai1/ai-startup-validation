import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, submitConsultingStage } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. Four live GPT calls on a throwaway sqlite project.
 * Founder answers in this file are synthetic test data. The model responses are live.
 * The founder project is not read or written.
 */
const enabled = process.env.AI_PM_REAL_GPT_CONTINUITY === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-real-gpt-continuity-2026-11-01.json';
const USER_ID = 'gpt-continuity-sim';
const PROJECT_ID = 'gpt-continuity-project';

const ANSWERS = [
  '양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.',
  '구체적인 양조장 후보는 아직 선정하지 않았다. 실제 협의도 아직 진행하지 않았다.',
  '특정 지역에서 체험형 양조장 후보를 조사하겠다. 후보를 선정한 후 실제 협의 여부를 확인하겠다.',
];

describe.skipIf(!enabled)('real gpt context continuity', () => {
  it(
    'runs three follow-up analyses on one brewery idea and stores the live payloads',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-continuity hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-continuity skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      await writeMarker(config, { status: 'started', startedAt, provenance: 'live_gpt', answerProvenance: 'synthetic-test-data' });
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-continuity-')), 'reviews.sqlite'));
      const live = openReviewChat();
      expect(live).toBeTruthy();
      if (!live) return;
      const rounds: Array<Record<string, unknown>> = [];
      const chat: typeof live = async (request) => {
        const response = await live(request);
        rounds.push({
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
      try {
        const first = await runFirstReview({
          store,
          userId: USER_ID,
          projectId: PROJECT_ID,
          text: COMPARE_BUSINESS_BODY,
          origin: 'typed',
          fileName: null,
          now: startedAt,
          chat,
          evidence: 'live_network',
        });
        attach(rounds, first.record);
        let parent = first.record;
        for (const [index, answer] of ANSWERS.entries()) {
          if (parent.status !== 'succeeded' || !parent.sections) break;
          const questions = consultingQuestions(parent.sections);
          if (questions.length < 1) break;
          const analyzed = await submitConsultingStage({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: parent.reviewId,
            now: new Date(Date.parse(startedAt) + (index + 1) * 60_000).toISOString(),
            answers: questions.map((question, questionIndex) => ({
              questionId: question.questionId,
              comment: questionIndex === 0 ? answer : '추가 사실은 없다. 앞의 답과 같은 사업이다.',
            })),
            chat,
            evidence: 'live_network',
          });
          if (!analyzed.ok) {
            rounds.push({ error: analyzed.error, callCount: 0, raw: null });
            break;
          }
          attach(rounds, analyzed.record);
          parent = analyzed.record;
          if (!analyzed.called) break;
        }
        const followed = rounds.filter((round) => round.raw && round.parentReviewId).length;
        await writeMarker(config, {
          kind: 'live_gpt_context_continuity',
          provenance: 'live_gpt',
          answerProvenance: 'synthetic-test-data',
          status: followed >= 3 ? 'RECORDED' : 'partial',
          startedAt,
          finishedAt: new Date().toISOString(),
          gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          founderProjectTouched: false,
          roundCount: rounds.length,
          followUpCount: followed,
          rounds,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'live_gpt_error';
        await writeMarker(config, {
          kind: 'live_gpt_context_continuity',
          provenance: 'live_gpt',
          answerProvenance: 'synthetic-test-data',
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
          error: message.slice(0, 300),
          founderProjectTouched: false,
          rounds,
        });
        throw error;
      }
    },
    180_000,
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
