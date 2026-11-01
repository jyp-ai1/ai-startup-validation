import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPARE_BUSINESS_BODY } from '../ai-pm-quality-compare';
import { consultingQuestions, openReviewChat, runFirstReview, runStageReanalysis, saveReviewFeedback } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

/**
 * Preview build only. Replays the stored first analysis, then runs three live follow-ups.
 * Answers are SIMULATION. A duplicate reanalysis reuses the stored row. A fifth round is not called.
 */
const enabled = process.env.AI_PM_REAL_GPT_CONSULTING_LOOP === '1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'sprint-2-consulting-loop-2026-11-01.json';
const USER_ID = 'gpt-consulting-loop-sim';
const PROJECT_ID = 'gpt-consulting-loop-project';
const STORED_FIRST_EXECUTION = 'chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde';
const ROUND_NOTES = [
  'SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다.',
  'SIMULATION. 양조장 공급 조건은 아직 불확실하다. 체험 시간과 인원, 가격은 정하지 못했다.',
  'SIMULATION. 가격과 수익 배분은 정하지 못했다. 고객을 모으는 방법, 운영 비용, 책임 소재도 합의되지 않았다.',
];

describe.skipIf(!enabled)('real gpt consulting loop', () => {
  it(
    'carries the business through three live follow-ups on a separate project',
    async () => {
      const preview = process.env.VERCEL_ENV === 'preview' && Boolean(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
      const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
      if (!preview || !apiKey) {
        console.log(`real-gpt-consulting-loop hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
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
        console.log(`real-gpt-consulting-loop skip status=${String(existing?.status ?? 'present')}`);
        return;
      }
      const startedAt = new Date().toISOString();
      await writeMarker(config, { status: 'started', startedAt, provenance: 'SIMULATION', answerProvenance: 'SIMULATION' });
      const firstFile = JSON.parse(
        readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json', import.meta.url), 'utf8'),
      ) as { rounds: Array<{ raw: string; responseModel?: string }> };
      const firstRaw = firstFile.rounds[0]?.raw ?? '';
      const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'gpt-consulting-loop-')), 'reviews.sqlite'));
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
        rounds.push({
          live: false,
          round: 1,
          provenance: 'replay_stored_raw',
          executionId: STORED_FIRST_EXECUTION,
          reviewId: first.record.reviewId,
          parentReviewId: first.record.parentReviewId,
          rowStatus: first.record.status,
          rowError: first.record.error,
          storedCallCount: first.record.callCount,
          questions: consultingQuestions(first.record.sections).map((question) => question.text),
          inputText: first.record.inputText,
        });
        if (first.record.status !== 'succeeded' || !first.record.sections) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'stored_first_analysis_rejected', rounds));
          return;
        }
        const live = openReviewChat();
        if (!live) {
          await writeMarker(config, baseMarker(startedAt, 'not_run', 'review_chat_unavailable', rounds));
          return;
        }
        let parent = first.record;
        for (let roundIndex = 0; roundIndex < ROUND_NOTES.length; roundIndex += 1) {
          const questions = consultingQuestions(parent.sections);
          if (questions.length === 0) {
            rounds.push({ live: false, round: roundIndex + 2, provenance: 'SIMULATION', error: 'stage_questions_missing', callCount: 0, raw: null });
            break;
          }
          const answers = questions.map((question) => ({
            questionId: question.questionId,
            question: question.text,
            comment: `${ROUND_NOTES[roundIndex]} 이 답은 연습 입력이고 확인된 기록이 아니다. 대상 질문: ${question.text}`,
          }));
          let saveCalls = 0;
          if (questions.length > 1) {
            const saved = await saveReviewFeedback({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              now: new Date(Date.parse(startedAt) + (roundIndex + 1) * 60_000).toISOString(),
              body: { reviewId: parent.reviewId, questionId: answers[0]?.questionId, comment: answers[0]?.comment },
            });
            const early = await runStageReanalysis({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              reviewId: parent.reviewId,
              now: new Date(Date.parse(startedAt) + (roundIndex + 1) * 60_000 + 1_000).toISOString(),
              chat: async () => {
                saveCalls += 1;
                throw new Error('incomplete_stage_called_model');
              },
              evidence: 'live_network',
            });
            if (early.ok || early.error !== 'feedback_required' || saveCalls !== 0) {
              rounds.push({
                live: false,
                round: roundIndex + 2,
                provenance: 'SIMULATION',
                error: early.ok ? 'incomplete_stage_called' : early.error,
                incompleteCallCount: saveCalls,
                callCount: 0,
                raw: null,
              });
              break;
            }
          }
          for (const answer of answers) {
            await saveReviewFeedback({
              store,
              userId: USER_ID,
              projectId: PROJECT_ID,
              now: new Date(Date.parse(startedAt) + (roundIndex + 1) * 60_000 + 2_000).toISOString(),
              body: { reviewId: parent.reviewId, questionId: answer.questionId, comment: answer.comment },
            });
          }
          const chat: typeof live = async (request) => {
            const response = await live(request);
            const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
            rounds.push({
              live: true,
              round: roundIndex + 2,
              provenance: 'SIMULATION',
              executionId: response.id,
              requestedModel: request.model,
              responseModel: response.model,
              callCount: 1,
              promptTokens: response.usageKnown ? response.usage.inputTokens : null,
              completionTokens: response.usageKnown ? response.usage.outputTokens : null,
              totalTokens: response.usageKnown ? response.usage.totalTokens : null,
              usageKnown: response.usageKnown === true,
              answers,
              requestHasOriginalIdea: user.includes('전통주'),
              requestHasSimulationAnswer: user.includes('SIMULATION'),
              requestHasPreviousSimulation: roundIndex === 0 ? false : user.includes(ROUND_NOTES[roundIndex - 1] ?? ''),
              requestHasPriorJudgment: user.includes('priorJudgmentText'),
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
            reviewId: parent.reviewId,
            now: new Date(Date.parse(startedAt) + (roundIndex + 1) * 60_000 + 3_000).toISOString(),
            chat,
            evidence: 'live_network',
          });
          if (!analyzed.ok) {
            rounds.push({ live: false, round: roundIndex + 2, provenance: 'SIMULATION', error: analyzed.error, callCount: 0, raw: null, answers });
            break;
          }
          attach(rounds, analyzed.record);
          const reread = await store.readReview(USER_ID, analyzed.record.reviewId);
          const round = rounds.at(-1);
          if (round && reread) {
            round.reread = {
              status: reread.status,
              error: reread.error,
              updatedJudgment: reread.stageReading?.updatedJudgment ?? reread.sections?.judgment ?? null,
              verifiedFacts: reread.stageReading?.verifiedFacts ?? null,
              unresolvedIssues: reread.stageReading?.unresolvedIssues ?? null,
              resolvedIssues: reread.stageReading?.resolvedIssues ?? null,
              nextQuestion: reread.sections?.nextQuestion ?? null,
              questions: consultingQuestions(reread.sections).map((question) => question.text),
            };
          }
          const duplicate = await runStageReanalysis({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: parent.reviewId,
            now: new Date(Date.parse(startedAt) + (roundIndex + 1) * 60_000 + 4_000).toISOString(),
            chat: async () => {
              throw new Error('duplicate_stage_called_model');
            },
            evidence: 'live_network',
          });
          if (round) round.duplicateReused = duplicate.ok && duplicate.called === false;
          if (analyzed.record.status !== 'succeeded' || !analyzed.record.sections) break;
          parent = analyzed.record;
        }
        await writeMarker(config, {
          ...baseMarker(startedAt, rounds.some((round) => round.live === true && round.raw) ? 'stored' : 'not_run', null, rounds),
          finishedAt: new Date().toISOString(),
          gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
          founderProjectTouched: false,
          fifthRound: 'NOT RUN',
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
    300_000,
  );
});

function baseMarker(startedAt: string, status: string, reason: string | null, rounds: Array<Record<string, unknown>>) {
  return {
    kind: 'live_gpt_consulting_loop',
    provenance: 'SIMULATION',
    answerProvenance: 'SIMULATION',
    status,
    ...(reason ? { reason } : {}),
    startedAt,
    finishedAt: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    founderProjectTouched: false,
    liveCallCount: rounds.filter((round) => round.live === true).length,
    fifthRound: 'NOT RUN',
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
