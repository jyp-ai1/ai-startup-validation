import { describe, expect, it } from 'vitest';

import { openReviewBackend } from '../ai-pm-review-backend';
import {
  assembleConsultingHistory,
  buildProductReanalysisRequest,
  needsRevisionGate,
  openReviewChat,
  judgmentSeparatesPotential,
  questionAsksForPlan,
  questionRepeatsPrior,
  questionSameContactStage,
  questionVerificationStage,
  runFollowUpReview,
  unverifiedClaimStoredAsFact,
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
const QUALITY_OBJECT = 'product-consulting-quality-2026-10-31-j.json';
const QUALITY_PARENT_ID = '9e169fef-7428-4d21-a6f0-f3034bcc91d1';
const SIBLING_ANALYSIS_ID = '8602a92e-0fbd-4d93-a005-9c9f18410ac6';

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
    expect(request.responseFormat?.type).toBe('json_schema');
    const preview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
    const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
    if (!preview || !apiKey) {
      console.log(`preview-product-reanalysis hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
      return;
    }
    const existing = await readMarker(config, OBJECT);
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
    await writeMarker(config, { status: 'started', startedAt, parentReviewId: PARENT_ID, answerId: ANSWER_ID }, OBJECT);
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
      await writeMarker(config, marker, OBJECT);
      console.log(`preview-product-reanalysis stored status=${marker.status}`);
    }
    expect(marker.status === 'RECORDED' || marker.status === 'limited' || marker.called === false).toBe(true);
  }, 180_000);

  it('rechecks the brewery answer without rewriting the saved reviews', async () => {
    const config = supabaseConfig();
    expect(config).not.toBeNull();
    if (!config) return;
    const preview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
    const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
    if (!preview || !apiKey) {
      console.log(`preview-consulting-quality hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
      return;
    }
    const existing = await readMarker(config, QUALITY_OBJECT);
    if (existing && ['RECORDED', 'failed', 'limited', 'quality_failed'].includes(String(existing.status))) {
      console.log(`preview-consulting-quality skip status=${existing.status}`);
      return;
    }
    const parentRow = await restGet(config, `ai_pm_reviews?select=user_id,finished_at&review_id=eq.${QUALITY_PARENT_ID}`);
    const userId = (parentRow[0] as { user_id?: string } | undefined)?.user_id ?? '';
    const backend = openReviewBackend();
    const parent = await backend.store.readReview(userId, QUALITY_PARENT_ID);
    const preserved = await Promise.all(
      [
        PARENT_ID,
        QUALITY_PARENT_ID,
        '3be5715e-7294-44bd-b163-f3af1dec4259',
        '02dbf55a-eaf4-49fd-ba4c-ab043f16d39c',
        'dac12cd4-9958-405c-900b-deb2a5418c41',
        '17c3d2ea-dfb2-480d-b2cf-47f7fecf7c06',
        'eb645c94-c0eb-4a27-afee-32dca258ee6b',
        '287badc3-444e-4a09-8cd8-3d012671afa9',
        '970b8ce1-3e4b-4840-834f-2c6a87b2ec54',
        'd1a1ed43-b830-46e9-8da6-beaa9afcec74',
        'a67d3b7a-60d7-4c0f-bbcd-32f13660f6b4',
        '3da7d534-2aca-407b-9d77-4cda0c4fa15d',
      ].map((reviewId) => backend.store.readReview(userId, reviewId)),
    );
    const records = await backend.store.listReviews(userId, PROJECT_ID);
    const feedback = (await backend.store.listFeedback(userId)).filter((item) =>
      records.some((record) => record.reviewId === item.reviewId),
    );
    const history = assembleConsultingHistory({
      records,
      parent: parent!,
      supplement: SUPPLEMENT,
      feedback,
    });
    expect(history.priorAnalyses.map((item) => item.reviewId)).toContain(SIBLING_ANALYSIS_ID);
    expect(history.founderAnswerSource).toEqual({ feedbackId: ANSWER_ID, reviewId: '3be5715e-7294-44bd-b163-f3af1dec4259', onThisReview: false });
    expect(history.priorTurns.some((turn) => turn.supplement === SUPPLEMENT)).toBe(false);
    const startedAt = new Date().toISOString();
    await writeMarker(config, { status: 'started', startedAt, parentReviewId: QUALITY_PARENT_ID, answerId: ANSWER_ID }, QUALITY_OBJECT);
    let marker: Record<string, unknown> = { status: 'failed', startedAt, parentReviewId: QUALITY_PARENT_ID, answerId: ANSWER_ID };
    try {
      const result = await runFollowUpReview({
        store: backend.store,
        userId,
        projectId: PROJECT_ID,
        reviewId: QUALITY_PARENT_ID,
        supplement: SUPPLEMENT,
        now: startedAt,
        chat: openReviewChat(),
        evidence: 'live_network',
        forceNew: true,
      });
      for (const before of preserved) {
        if (!before) continue;
        const after = await backend.store.readReview(userId, before.reviewId);
        expect(after?.finishedAt).toBe(before.finishedAt);
        expect(after?.status).toBe(before.status);
        expect(after?.totalTokens).toBe(before.totalTokens);
      }
      const answerRows = await restGet(config, `ai_pm_feedback?select=record_json&feedback_id=eq.${ANSWER_ID}`);
      const answer = (answerRows[0] as { record_json?: { choiceAnswer?: { label?: string }; modelCalls?: number } }).record_json;
      expect(answer?.choiceAnswer?.label).toBe(SUPPLEMENT);
      expect(answer?.modelCalls).toBe(0);
      if (!result.ok) {
        marker = { ...marker, status: 'failed', error: result.error };
      } else if (isLimited(result.record.error)) {
        marker = { ...marker, status: 'limited', reviewId: result.record.reviewId, error: result.record.error };
      } else if (result.record.status !== 'succeeded' || !result.record.consultingTurn || !result.record.sections?.analysis) {
        marker = {
          ...marker,
          status: 'failed',
          reviewId: result.record.reviewId,
          error: result.record.error,
          called: result.called,
        };
      } else {
        const facts = result.record.sections.analysis.founderFacts;
        const judgment = result.record.sections.analysis.judgmentDetail;
        const nextQuestion = result.record.sections.nextQuestion;
        const previousQuestions = history.previousQuestions;
        const claimIsFact = unverifiedClaimStoredAsFact(SUPPLEMENT, facts);
        const repeated = questionRepeatsPrior(previousQuestions, nextQuestion);
        const planQuestion = questionAsksForPlan(nextQuestion);
        const sameContactStage = questionSameContactStage(previousQuestions, nextQuestion);
        const stage = questionVerificationStage(nextQuestion);
        const namedPath = stage === 'named_target_and_path';
        const reasksClaim = nextQuestion.replace(/\s+/g, '').includes(SUPPLEMENT.replace(/\s+/g, ''));
        const consistent = judgmentSeparatesPotential(judgment);
        const advanced = namedPath && !planQuestion && !repeated && !sameContactStage && !reasksClaim;
        const explains = /유지/.test(judgment) && /이유/.test(judgment);
        const parentAssumptions = parent?.sections?.analysis?.assumptions ?? [];
        const assumptions = result.record.sections.analysis.assumptions;
        const assumptionsMoved =
          JSON.stringify(assumptions) !== JSON.stringify(parentAssumptions) &&
          assumptions.some((item) => /검증되지 않은 전제/.test(item));
        const evidenceText = [judgment, ...result.record.sections.analysis.inferences, ...assumptions].join('\n');
        const evidenceLevel = /기대|자체 판단|주장/.test(evidenceText) && /증거|근거/.test(evidenceText);
        const separated = facts.length === 0 && /미확인|확인되지|증거가 없|아직/.test(evidenceText);
        const evidenceMoved = result.record.sections.analysis.evidenceToChange.some(
          (item) => item !== SUPPLEMENT && /실행|가설|영향|가능/.test(item),
        );
        const touched = [judgment, ...result.record.sections.risks, ...assumptions, ...result.record.sections.analysis.inferences, ...result.record.sections.analysis.evidenceToChange].join('\n');
        const reflects = /협력/.test(touched);
        const risksMoved = result.record.sections.risks.some((item) => /접촉|협력 의사|조건/.test(item));
        const oneCall = result.record.callCount === 1;
        const parentJudgment = parent?.sections?.analysis?.judgmentDetail || parent?.sections?.judgment || '';
        const copiedJudgment = judgment.replace(/\s+/g, '') === parentJudgment.replace(/\s+/g, '');
        const qualityPass =
          !claimIsFact &&
          !repeated &&
          !planQuestion &&
          !sameContactStage &&
          namedPath &&
          consistent &&
          !reasksClaim &&
          advanced &&
          explains &&
          reflects &&
          risksMoved &&
          assumptionsMoved &&
          evidenceLevel &&
          separated &&
          evidenceMoved &&
          !copiedJudgment;
        marker = {
          status: qualityPass ? 'RECORDED' : 'quality_failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          called: result.called,
          reviewId: result.record.reviewId,
          parentOfChild: result.record.parentReviewId,
          sourceFeedbackId: result.record.sourceFeedbackId,
          founderAnswerSource: history.founderAnswerSource,
          priorAnalysisIds: history.priorAnalyses.map((item) => item.reviewId),
          model: result.record.model,
          promptTokens: result.record.promptTokens,
          completionTokens: result.record.completionTokens,
          totalTokens: result.record.totalTokens,
          callCount: result.record.callCount,
          consultingTurn: result.record.consultingTurn,
          judgment,
          nextQuestion,
          nextQuestionReason: result.record.sections.nextQuestionReason,
          founderFacts: facts,
          risks: result.record.sections.risks,
          assumptions,
          inferences: result.record.sections.analysis.inferences,
          evidenceToChange: result.record.sections.analysis.evidenceToChange,
          rawContent: result.record.rawContent,
          claimIsFact,
          repeated,
          planQuestion,
          sameContactStage,
          stage,
          namedPath,
          consistent,
          reasksClaim,
          advanced,
          explains,
          reflects,
          risksMoved,
          assumptionsMoved,
          evidenceLevel,
          separated,
          evidenceMoved,
          oneCall,
          copiedJudgment,
        };
      }
    } finally {
      await writeMarker(config, marker, QUALITY_OBJECT);
      console.log(`preview-consulting-quality stored status=${marker.status}`);
    }
    expect(marker.status).toBe('RECORDED');
  }, 240_000);
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

async function readMarker(config: { url: string; key: string }, objectName: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectName}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}

async function writeMarker(config: { url: string; key: string }, payload: Record<string, unknown>, objectName: string): Promise<void> {
  const secrets = [config.key, process.env.GPT_API_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  let text = JSON.stringify(payload);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 8) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectName}`, {
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
