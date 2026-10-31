import { describe, expect, it } from 'vitest';

import { openReviewBackend } from '../ai-pm-review-backend';
import {
  buildProductReanalysisRequest,
  needsRevisionGate,
  openReviewChat,
  runFollowUpReview,
} from '../ai-pm-review';

/**
 * One product follow-up for the stored brewery review.
 * Preview builds call this once. A recorded or failed marker is not called again.
 * The revision gate on the later mark stays in place. This call does not use that parent.
 */
const enabled = process.env.AI_PM_PRODUCT_REANALYSIS_ONCE === '1';
const PARENT_ID = '0a13c604-9931-40c5-88a5-80f06687fd5a';
const PROJECT_ID = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const ANSWER_ID = '7d2d04e5-93a1-4cd6-aebf-03582eeb003f';
const SUPPLEMENT = '양조장과의 협력 가능성이 높다.';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'product-cumulative-brewery-2026-10-31.json';

describe.skipIf(!enabled)('stored brewery cumulative reanalysis', () => {
  it('reuses the stored answer for one product follow-up', async () => {
    const config = supabaseConfig();
    expect(config).not.toBeNull();
    if (!config) return;
    const parentRow = await restGet(config, `ai_pm_reviews?select=user_id,finished_at,status&review_id=eq.${PARENT_ID}`);
    const parentMeta = parentRow[0] as { user_id?: string; finished_at?: string; status?: string } | undefined;
    expect(parentMeta?.status).toBe('succeeded');
    const userId = parentMeta?.user_id ?? '';
    const backend = openReviewBackend();
    expect(backend.storage.durable).toBe(true);
    const parent = await backend.store.readReview(userId, PARENT_ID);
    expect(parent?.status).toBe('succeeded');
    expect(parent?.projectId).toBe(PROJECT_ID);
    expect(parent?.parentReviewId).toBeNull();
    expect(parent?.inputText.includes('양조장')).toBe(true);
    expect(parent?.sections?.nextQuestion.length).toBeGreaterThan(0);
    const answerRows = await restGet(config, `ai_pm_feedback?select=record_json&feedback_id=eq.${ANSWER_ID}`);
    const answer = (answerRows[0] as { record_json?: { choiceAnswer?: { label?: string }; modelCalls?: number } } | undefined)
      ?.record_json;
    expect(answer?.choiceAnswer?.label).toBe(SUPPLEMENT);
    expect(answer?.modelCalls).toBe(0);
    const parentFeedback = await backend.store.listFeedback(userId, PARENT_ID);
    expect(parentFeedback).toHaveLength(0);
    expect(needsRevisionGate([])).toBe(false);
    const request = buildProductReanalysisRequest({
      originalInput: parent?.inputText ?? '',
      firstAnalysis: parent!.sections!,
      priorTurns: [],
      latestAnalysis: parent!.sections!,
      founderChoice: null,
      founderSupplement: SUPPLEMENT,
      founderFeedback: null,
    });
    const userPayload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<
      string,
      unknown
    >;
    expect(userPayload.originalInput).toBe(parent?.inputText);
    expect(userPayload.founderSupplement).toBe(SUPPLEMENT);
    expect(userPayload).toHaveProperty('firstAnalysis');
    expect(userPayload).toHaveProperty('latestAnalysis');
    expect(userPayload).toHaveProperty('founderFeedback');
    expect(userPayload).toHaveProperty('priorTurns');
    expect(request.responseFormat).toEqual({ type: 'json_object' });
    const preview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
    const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
    if (!preview || !apiKey) {
      console.log(`preview-product-reanalysis hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
      return;
    }
    const existing = await readMarker(config);
    if (existing && ['RECORDED', 'failed', 'limited'].includes(String(existing.status))) {
      console.log(`preview-product-reanalysis skip status=${existing.status}`);
      return;
    }
    if (existing?.status === 'started') {
      const ageMs = Date.now() - Date.parse(String(existing.startedAt ?? ''));
      if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
        console.log('preview-product-reanalysis skip status=started');
        return;
      }
    }
    const startedAt = new Date().toISOString();
    await writeMarker(config, { status: 'started', startedAt, parentReviewId: PARENT_ID, answerId: ANSWER_ID });
    const before = parent?.finishedAt;
    let marker: Record<string, unknown> = { status: 'failed', startedAt, parentReviewId: PARENT_ID, answerId: ANSWER_ID };
    try {
      const result = await runFollowUpReview({
        store: backend.store,
        userId,
        projectId: PROJECT_ID,
        reviewId: PARENT_ID,
        supplement: SUPPLEMENT,
        now: startedAt,
        chat: openReviewChat(),
        evidence: 'live_network',
      });
      const after = await backend.store.readReview(userId, PARENT_ID);
      expect(after?.status).toBe('succeeded');
      expect(after?.finishedAt).toBe(before);
      expect(after?.sections?.judgment).toBe(parent?.sections?.judgment);
      if (!result.ok) {
        marker = { ...marker, status: 'failed', error: result.error, called: false };
      } else {
        const limited = isLimited(result.record.error);
        marker = {
          status: result.record.status === 'succeeded' && result.record.consultingTurn ? 'RECORDED' : limited ? 'limited' : 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          called: result.called,
          parentReviewId: PARENT_ID,
          answerId: ANSWER_ID,
          reviewId: result.record.reviewId,
          parentOfChild: result.record.parentReviewId,
          sourceFeedbackId: result.record.sourceFeedbackId,
          model: result.record.model,
          promptTokens: result.record.promptTokens,
          completionTokens: result.record.completionTokens,
          totalTokens: result.record.totalTokens,
          usageKnown: result.record.usageKnown,
          callCount: result.record.callCount,
          error: result.record.error,
          consultingTurn: result.record.consultingTurn ?? null,
          judgment: result.record.sections?.judgment ?? null,
          nextQuestion: result.record.sections?.nextQuestion ?? null,
          nextQuestionReason: result.record.sections?.nextQuestionReason ?? null,
          analysisPresent: Boolean(result.record.sections?.analysis),
          firstJudgment: parent?.sections?.judgment ?? null,
          firstQuestion: parent?.sections?.nextQuestion ?? null,
          contextKeys: Object.keys(userPayload),
        };
      }
    } finally {
      await writeMarker(config, marker);
      console.log(`preview-product-reanalysis stored status=${marker.status}`);
    }
    expect(marker.status === 'RECORDED' || marker.status === 'limited' || marker.called === false).toBe(true);
  }, 180_000);
});

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key.trim()) return null;
  return { url, key };
}

async function restGet(config: { url: string; key: string }, query: string): Promise<unknown[]> {
  const response = await fetch(`${config.url}/rest/v1/${query}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) throw new Error(`read_${response.status}`);
  const body = (await response.json()) as unknown;
  return Array.isArray(body) ? body : [];
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

function isLimited(error: string | null): boolean {
  if (!error) return false;
  return /rate limit exceeded|credit_balance_exhausted|insufficient_quota|review_retry_blocked/i.test(error);
}
