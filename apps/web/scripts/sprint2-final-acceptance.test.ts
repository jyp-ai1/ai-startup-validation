import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  consultingQuestions,
  judgeStageContract,
  runFirstReview,
  submitConsultingStage,
  type ReviewChat,
} from '../features/business-validation-journey/lib/ai-pm-review';
import { openReviewBackend } from '../features/business-validation-journey/lib/ai-pm-review-backend';
import type { StoredFeedback, StoredReview } from '../features/business-validation-journey/lib/ai-pm-review-store';

/**
 * Isolated records in the configured product store.
 * Fixture sentences stay in this script. They are not product constants.
 * OpenAI HTTP stays blocked. Founder rows are counted and not updated.
 */

const TEST_USER_ID = 'c0ffee00-1111-4000-8000-0000000002a2';
const TEST_EMAIL = 'sprint2-final-acceptance@example.invalid';
const PROJECT_TITLE = 'SPRINT2 ISOLATED ACCEPTANCE';
const FOUNDER_USER = '37d541c8-fda7-4788-8ac2-1a449b00425c';
const FOUNDER_PROJECT = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const FAILED_ROW = '0e75ff46-88fd-4ce2-b567-bdc3f3048531';
const EVIDENCE_HASH = '6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd';
const IDEA = '격리 검증용 문장이다. 실내 작업 공간을 직장인에게 시간 단위로 제안하는 구상이다. 아직 운영 전이다.';
const R1_JUDGMENT = '수요가 확인되지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.';
const UNLINKED = '질문과 연결되지 않은 추가 의견이다. 주말에는 열지 않는다.';
const PLAN_ANSWER = '100명 대상으로 할 예정';
const RESULT_ANSWER = '안내를 실시했고 응답을 받았다';
const STATED_ANSWER = '실내에서 진행하는 구상이다';
const GAP_ANSWER = '아직 정하지 못했다';
const R2_PLAN = '지역 한 곳을 먼저 볼 계획이다';
const R2_STATED = '채널은 게시판을 염두에 두고 있다';
const WORKPLACE = '직장인';
const Q1 = '누가 이 공간을 쓰는가?';
const Q2 = '모집 규모를 어떻게 둘 것인가?';
const Q3 = '안내 이후 무엇을 확인했는가?';
const Q4 = '공간은 어떤 형태인가?';
const Q5 = '운영 요일은 정했는가?';
const NEXT_A = '공급 장소를 어디서 구할 계획인가?';
const NEXT_B = '알릴 채널을 무엇으로 두는가?';
const NEXT_C = '운영 책임자를 누구로 둘 예정인가?';
const NEXT_D = '예약 방식을 무엇으로 둘 것인가?';
const STATE_PATH = '/tmp/sprint2-final-acceptance-state.json';
const REREAD_PATH = '/tmp/sprint2-final-acceptance-reread.json';

function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error('repo_root_not_found');
}

const REPO = repoRoot();
const EVIDENCE_FILE = join(REPO, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json');
const OUT_FILE = join(REPO, 'docs/evidence/ALABOM/AI-PM/sprint-2-final-acceptance.json');

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function fileSha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function publicText(value: string): string {
  return value.replace(/https?:\/\/\S+/g, '[url]').replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 240);
}

function localReply(content: string): ChatResponse {
  return {
    id: 'local-parser-fixture',
    model: 'local-parser-fixture',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    usageKnown: false,
    latencyMs: 0,
  };
}

function userContent(request: ChatRequest): string {
  return request.messages.find((message) => message.role === 'user')?.content ?? '';
}

function userJson(request: ChatRequest): Record<string, unknown> | null {
  try {
    const value = JSON.parse(userContent(request)) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function redactRequest(request: ChatRequest) {
  const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
  const schema = request.responseFormat?.type === 'json_schema' ? request.responseFormat.schema : null;
  const user = userContent(request);
  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(user) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  const nextItems = schema && typeof schema.properties === 'object' && schema.properties
    ? (schema.properties as { nextQuestions?: { items?: { required?: unknown } } }).nextQuestions?.items?.required
    : null;
  return {
    model: request.model,
    schemaTitle: schema && typeof schema.title === 'string' ? schema.title : null,
    reaskReasonRequired: Array.isArray(nextItems) ? nextItems.includes('reaskReason') : null,
    system: { redacted: true, sha256: sha256(system), chars: system.length },
    user: parsed ?? { json: false, sha256: sha256(user), chars: user.length },
  };
}

function firstFixture(): string {
  return JSON.stringify({
    summary: '실내 작업 공간 구상이다. 운영 전이라 수요는 확인되지 않았다.',
    customer: '직장인',
    problem: '작업 공간 수요가 확인되지 않았다.',
    value: '시간 단위로 쓰는 실내 작업 공간',
    operatingModel: '아직 운영 전인 구상',
    alternatives: '다른 작업 공간',
    differentiation: '차별화는 확인되지 않았다',
    payer: '지불자는 확인되지 않았다.',
    revenueModel: '수익 구조는 가설이며 원문에 없다.',
    market: '수요 조사는 입력에 없다.',
    competition: '경쟁은 확인되지 않았다.',
    operations: '운영은 아직 구상이다.',
    profitability: '수익성은 확인되지 않았다.',
    judgment: R1_JUDGMENT,
    nextVerification: '지불 의사를 확인한다.',
    nextQuestion: Q1,
    nextQuestionReason: '누가 쓰는지가 다음 판단에 필요하다.',
    strengths: ['공간 구상이 있다'],
    risks: ['수요가 확인되지 않았다'],
    assumptions: ['지불은 확인되지 않았다'],
    evidenceToChange: ['지불 의사'],
    founderFacts: [],
    inferences: ['추론: 지불자는 미확인'],
    choices: ['지불 의사를 먼저 확인한다', '장소를 먼저 확인한다'],
    questions: [
      { text: Q1, choices: [WORKPLACE, '학생'] },
      { text: Q2, choices: ['규모를 적는다', '규모는 정하지 않았다'] },
      { text: Q3, choices: ['안내 결과를 적는다', '안내 결과는 없다'] },
      { text: Q4, choices: ['실내', '실외'] },
      { text: Q5, choices: ['요일을 적는다', '요일은 정하지 않았다'] },
    ],
  });
}

function contractReply(request: ChatRequest, judgment: string, questions: string[]): string {
  const payload = userJson(request) ?? {};
  const pairs = (Array.isArray(payload.stagePairs) ? payload.stagePairs : []) as Array<{
    questionId: string;
    choiceId: string | null;
    status: string;
    choiceLabel?: string | null;
    supplement?: string;
  }>;
  const answered = pairs.filter((pair) => pair.status === 'answered');
  const continuesObjectiveId =
    (payload.verificationObjectives as { unresolved?: Array<{ objectiveId?: string }> } | undefined)?.unresolved?.find((row) => row.objectiveId)
      ?.objectiveId ?? '';
  const cites = answered
    .map((pair) => (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim())
    .filter((text) => text.replace(/\s+/g, '').length >= 2);
  const nextQuestions = questions.map((text) => ({
    text,
    choices: [`${text} 쪽을 먼저 본다`, `${text} 쪽은 보류한다`],
    verificationPurpose: `${text}와 다른 불확실성. 아직 확인하지 않은 다음 검증이다`,
    reaskReason: null,
    ...(continuesObjectiveId ? { continuesObjectiveId } : {}),
  }));
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 확인된 사실을 늘리지 않는다`,
      founderBasis: `${pair.questionId}에서 이렇게 말한 이유는 입력에 적힌 계획이다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의는 없다`,
      judgmentEffect: `${pair.questionId} 답은 확인된 사실이 아니다. 성공 가능성은 높아지지 않았다. 이전 판단은 유지되고 검증된 사실은 늘지 않는다.`,
      openRisk: `${pair.questionId}의 지불은 아직 검증되지 않았다`,
    })),
    impactOnPreviousJudgment: '이번 답이 기존 판단에 준 영향이다.',
    updatedJudgment: `유지: 확인 전 위험은 남는다. 이번 답: ${judgment} 변경: 확인된 사실이 아니면 바꾸지 않는다. 남은 위험: 지불이나 공급은 아직 없다.`,
    judgmentReason: `지불 확인이 없어 판단을 유지한다. 이번 답 ${cites.join(' ')}을 확인했다. 남은 불확실성은 지불이다.`,
    answerEvidence: answered.map((pair) => ({
      questionKey: (pair as { questionKey?: string }).questionKey || pair.questionId,
      answerText: (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim(),
      provenance: 'FOUNDER_INPUT',
      epistemicStatus: 'FOUNDER_CLAIM',
    })),
    verifiedFacts: [],
    unverifiedClaims: ['입력된 답은 주장이다'],
    assumptions: ['지불은 아직 가설이다'],
    resolvedIssues: [],
    unresolvedIssues: [`${questions[0] ?? '다음 확인'}는 아직 확인되지 않았다`],
    nextVerification: '지불 의사를 확인한다.',
    customer: '직장인',
    problem: '수요가 확인되지 않았다',
    value: '실내 작업 공간',
    product: '시간 단위 작업 공간',
    market: '수요는 입력에 없다',
    revenueModel: '수익 구조는 가설이며 원문에 없다',
    operations: '운영은 아직 구상이다',
    supply: '장소 공급은 입력에 없다',
    supplyState: 'confirmed',
    marketing: '알림 방법은 아직 확인되지 않았다',
    marketingState: 'confirmed',
    competition: '경쟁은 확인되지 않았다',
    executionNote: '실행은 아직 확인되지 않았다',
    risks: ['수요가 확인되지 않았다'],
    nextQuestions,
    nextQuestionChoices: nextQuestions.map((item) => item.choices),
  });
}

function feedbackSnapshot(rows: StoredFeedback[]) {
  return [...rows]
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.feedbackId.localeCompare(right.feedbackId))
    .map((row) => ({
      feedbackId: row.feedbackId,
      reviewId: row.reviewId,
      questionId: row.questionId ?? null,
      unlinked: row.unlinked === true,
      comment: row.comment,
      choiceLabel: row.choiceAnswer?.label ?? null,
      provenance: row.provenance ?? null,
      epistemicStatus: row.epistemicStatus ?? null,
      modelCalls: row.modelCalls,
    }));
}

function reviewSnapshot(record: StoredReview | null) {
  if (!record) return null;
  return {
    reviewId: record.reviewId,
    parentReviewId: record.parentReviewId,
    status: record.status,
    evidence: record.evidence,
    model: record.model,
    callCount: record.callCount,
    error: record.error,
    inputText: record.inputText,
    finishedAt: record.finishedAt,
    questionTexts: consultingQuestions(record.sections).map((question) => question.text),
    judgment: record.sections?.analysis?.judgmentDetail ?? record.sections?.judgment ?? null,
  };
}

type HeadCount = { count: number | null; code: string | null; message: string | null };

async function headCount(table: string, filters: Record<string, string>): Promise<HeadCount> {
  const { getServiceClient } = await import('@repo/db');
  let query = getServiceClient().from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const response = await query;
  return {
    count: response.count,
    code: response.error?.code ?? null,
    message: response.error ? publicText(response.error.message) : null,
  };
}

async function founderCounts() {
  const [reviews, feedback, founderReviews, founderProjectReviews, founderProjects, failedReview] = await Promise.all([
    headCount('ai_pm_reviews', {}),
    headCount('ai_pm_feedback', {}),
    headCount('ai_pm_reviews', { user_id: FOUNDER_USER }),
    headCount('ai_pm_reviews', { project_id: FOUNDER_PROJECT }),
    headCount('startup_projects', { user_id: FOUNDER_USER }),
    headCount('ai_pm_reviews', { review_id: FAILED_ROW }),
  ]);
  return { reviews, feedback, founderReviews, founderProjectReviews, founderProjects, failedReview };
}

function sameCount(left: HeadCount, right: HeadCount): boolean {
  return left.count === right.count && left.code === right.code;
}

const MODE = process.env.ACCEPTANCE_MODE === 'reread'
  ? 'reread'
  : process.env.ACCEPTANCE_MODE === 'judge'
    ? 'judge'
    : process.env.ACCEPTANCE_MODE === 'http'
      ? 'http'
      : 'write';

describe('sprint 2 final acceptance store', () => {
  if (MODE === 'judge') {
    it('checks the repeat gate against the supabase-backed request', () => {
      const saved = JSON.parse(readFileSync(OUT_FILE, 'utf8')) as { requests: Array<{ user: Record<string, unknown> }> };
      const user = saved.requests[1]?.user;
      if (!user || !Array.isArray(user.stagePairs)) throw new Error('stage_request_missing');
      const pairs = user.stagePairs as Array<{ questionId: string; question: string; choiceId: string | null; choiceLabel: string | null; supplement: string; status: 'answered' | 'open'; offeredChoices: Array<{ choiceId: string; label: string }> }>;
      const asked = [...pairs.map((pair) => pair.question), ...((user.priorQuestionTexts as string[]) ?? [])];
      const closed = pairs.flatMap((pair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]);
      const base = {
        askedQuestions: asked,
        pairs,
        closedSentences: closed,
        priorJudgmentText: R1_JUDGMENT,
        priorUnresolved: ['지불은 확인되지 않았다'],
      };
      const request = { model: 'gpt-4o-mini', messages: [{ role: 'user' as const, content: JSON.stringify(user) }] };
      const repeated = judgeStageContract(contractReply(request, '질문을 반복한 응답이다', [Q1, NEXT_B]), base);
      const fresh = judgeStageContract(contractReply(request, '공급과 알림은 아직 확인되지 않았다', [NEXT_A, NEXT_B]), base);
      const result = {
        repeatedIssues: repeated.issues,
        repeatedSectionsNull: repeated.sections === null,
        freshIssues: fresh.issues,
        freshSectionsNull: fresh.sections === null,
      };
      writeFileSync('/tmp/sprint2-final-acceptance-judge.json', `${JSON.stringify(result, null, 2)}\n`);
      expect(repeated.issues).toContain('stage_questions_repeated');
      expect(repeated.sections).toBeNull();
      expect(fresh.issues).not.toContain('stage_questions_repeated');
    });
  }

  if (MODE === 'reread') {
    it('rereads the isolated supabase rows in a second process', async () => {
      const state = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as {
        userId: string;
        projectId: string;
        firstReviewId: string;
        feedback: ReturnType<typeof feedbackSnapshot>;
      };
      const before = await founderCounts();
      const backend = openReviewBackend();
      try {
        if (!backend.store.durable || !backend.store.productionDatabase) {
          throw new Error('reread_store_not_supabase');
        }
        const review = await backend.store.readReview(state.userId, state.firstReviewId);
        const feedback = feedbackSnapshot(await backend.store.listFeedback(state.userId, state.firstReviewId));
        const reviews = await backend.store.listReviews(state.userId, state.projectId);
        writeFileSync(REREAD_PATH, `${JSON.stringify({
          durable: backend.store.durable,
          productionDatabase: backend.store.productionDatabase,
          inputText: review?.inputText ?? null,
          finishedAt: review?.finishedAt ?? null,
          status: review?.status ?? null,
          feedback,
          reviewIds: reviews.map((item) => ({ reviewId: item.reviewId, parentReviewId: item.parentReviewId, status: item.status, inputText: item.inputText })),
          founderCounts: before,
        }, null, 2)}\n`);
        expect(review?.inputText).toBe(IDEA);
        expect(feedback.map((item) => item.feedbackId).join()).toBe(state.feedback.map((item) => item.feedbackId).join());
        expect(feedback.map((item) => item.comment).join('\n')).toBe(state.feedback.map((item) => item.comment).join('\n'));
      } finally {
        backend.store.close();
      }
    });
  }

  if (MODE === 'http') {
    it('calls the follow-up route for the isolated project without GPT', async () => {
      const saved = JSON.parse(readFileSync(OUT_FILE, 'utf8')) as {
        isolatedProject: { id: string };
        reviews: { first: { reviewId: string } };
      };
      const db = await import('@repo/db');
      const password = randomBytes(24).toString('base64url');
      const updated = await db.getServiceClient().auth.admin.updateUserById(TEST_USER_ID, { password, email_confirm: true });
      if (updated.error) throw new Error(`http_user_update:${publicText(updated.error.message)}`);
      const jar: Array<{ name: string; value: string }> = [];
      const supabase = db.createServerClient({
        cookies: {
          getAll: () => jar,
          set: (name: string, value: string) => {
            const index = jar.findIndex((item) => item.name === name);
            const next = { name, value };
            if (index >= 0) jar[index] = next;
            else jar.push(next);
          },
        },
      });
      if (!supabase) throw new Error('http_server_client_unavailable');
      const signed = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password });
      if (signed.error || !signed.data.user) throw new Error(`http_sign_in:${publicText(signed.error?.message ?? 'no_user')}`);
      if (signed.data.user.id !== TEST_USER_ID) throw new Error('http_signed_in_user_mismatch');
      const countsBefore = await founderCounts();
      const isolatedBefore = await headCount('ai_pm_feedback', { user_id: TEST_USER_ID });
      const cookie = jar.map((item) => `${item.name}=${item.value}`).join('; ');
      const base = process.env.ACCEPTANCE_HTTP_BASE ?? 'http://127.0.0.1:3456';
      const headers = { cookie, 'content-type': 'application/json' };
      const listed = await fetch(`${base}/api/ai-pm-review?projectId=${encodeURIComponent(saved.isolatedProject.id)}`, { headers });
      const listBody = await listed.json() as { error?: string; reviews?: Array<{ reviewId: string; inputText?: string }>; storage?: { durable?: boolean; productionDatabase?: boolean } };
      const follow = await fetch(`${base}/api/ai-pm-review/follow-up`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: saved.isolatedProject.id,
          reviewId: saved.reviews.first.reviewId,
          answers: [
            { questionId: 'q1', choiceId: 'c1', choiceLabel: WORKPLACE },
            { questionId: 'q2', comment: PLAN_ANSWER },
            { questionId: 'q3', comment: RESULT_ANSWER },
            { questionId: 'q4', comment: STATED_ANSWER },
            { questionId: 'q5', comment: GAP_ANSWER },
            { unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' },
          ],
        }),
      });
      const followBody = await follow.json() as { error?: string; called?: boolean; pending?: boolean; reused?: boolean; storage?: { durable?: boolean; productionDatabase?: boolean } };
      const extraComment = 'HTTP 경로에서 추가한 분리 의견이다.';
      const extra = await fetch(`${base}/api/ai-pm-review/follow-up`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: saved.isolatedProject.id,
          reviewId: saved.reviews.first.reviewId,
          answers: [{ unlinked: true, comment: extraComment, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' }],
        }),
      });
      const extraBody = await extra.json() as { error?: string; called?: boolean; pending?: boolean; storage?: { durable?: boolean } };
      const listedAgain = await fetch(`${base}/api/ai-pm-review?projectId=${encodeURIComponent(saved.isolatedProject.id)}`, { headers });
      const againBody = await listedAgain.json() as { reviews?: Array<{ reviewId: string }> };
      const countsAfter = await founderCounts();
      const isolatedAfter = await headCount('ai_pm_feedback', { user_id: TEST_USER_ID });
      const backend = openReviewBackend();
      let extraStored = false;
      try {
        const rows = await backend.store.listFeedback(TEST_USER_ID, saved.reviews.first.reviewId);
        extraStored = rows.some((row) => row.unlinked === true && row.comment === extraComment);
      } finally {
        backend.store.close();
      }
      const result = {
        signInUser: signed.data.user.id,
        cookieCount: jar.length,
        listStatus: listed.status,
        listError: listBody.error ?? null,
        listCount: listBody.reviews?.length ?? null,
        listStorage: listBody.storage ?? null,
        followStatus: follow.status,
        follow: { error: followBody.error ?? null, called: followBody.called ?? null, pending: followBody.pending ?? null, reused: followBody.reused ?? null, storage: followBody.storage ?? null },
        extraStatus: extra.status,
        extra: { error: extraBody.error ?? null, called: extraBody.called ?? null, pending: extraBody.pending ?? null },
        extraStored,
        againStatus: listedAgain.status,
        againCount: againBody.reviews?.length ?? null,
        isolatedFeedbackBefore: isolatedBefore.count,
        isolatedFeedbackAfter: isolatedAfter.count,
        founderUntouched: sameCount(countsBefore.founderReviews, countsAfter.founderReviews) && sameCount(countsBefore.failedReview, countsAfter.failedReview),
        gptKeyInThisProcess: Boolean(process.env.GPT_API_KEY?.trim()),
      };
      writeFileSync('/tmp/sprint2-final-acceptance-http.json', `${JSON.stringify(result, null, 2)}\n`);
      expect(result.founderUntouched).toBe(true);
      expect(listed.status).toBe(200);
      expect(extraStored).toBe(true);
    });
  }

  if (MODE === 'write') {
    it('stores isolated rows through the product supabase backend and rereads them after process exit', async () => {
      const hashBefore = fileSha(EVIDENCE_FILE);
      const originalFetch = globalThis.fetch;
      let openaiHttpCalls = 0;
      const fetchHosts: string[] = [];
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        let host = 'unparsed';
        try {
          host = new URL(raw).hostname;
        } catch {
          host = 'unparsed';
        }
        fetchHosts.push(host);
        if (host.includes('openai') || host.includes('googleapis')) {
          openaiHttpCalls += 1;
          throw new Error('gpt_network_forbidden');
        }
        return originalFetch(input, init);
      };

      const report: Record<string, unknown> = {
        kind: 'sprint2-final-acceptance',
        at: new Date().toISOString(),
        sprint2: 'PARTIAL',
        productionDeploy: false,
        sprint3Started: false,
        gptHttpCalls: 0,
        sqliteUsedAsPass: false,
        preservedCommit: '1204a8c23ae05792fe06741a20e8e8e5175f8d99',
      };

      try {
        const db = await import('@repo/db');
        const adminConfigured = db.isSupabaseAdminConfigured();
        const gptKeyPresent = Boolean(process.env.GPT_API_KEY?.trim());
        report.adminConfigured = adminConfigured;
        report.gptApiKeyPresent = gptKeyPresent;
        if (!adminConfigured) {
          report.blocked = 'supabase_admin_not_configured';
          return;
        }
        const countsBefore = await founderCounts();
        report.countsBefore = countsBefore;
        const password = randomBytes(24).toString('base64url');
        const client = db.getServiceClient();
        const existingUser = await client.auth.admin.getUserById(TEST_USER_ID);
        let userCreated = false;
        if (existingUser.data?.user?.id === TEST_USER_ID) {
          const updated = await client.auth.admin.updateUserById(TEST_USER_ID, { password, email_confirm: true });
          if (updated.error) throw new Error(`isolated_user_update:${publicText(updated.error.message)}`);
        } else {
          const created = await client.auth.admin.createUser({
            id: TEST_USER_ID,
            email: TEST_EMAIL,
            password,
            email_confirm: true,
            user_metadata: { isolatedTest: 'sprint2-final-acceptance' },
          });
          if (created.error || created.data.user?.id !== TEST_USER_ID) {
            throw new Error(`isolated_user_create:${publicText(created.error?.message ?? 'missing_user')}`);
          }
          userCreated = true;
        }
        report.isolatedUser = { id: TEST_USER_ID, email: TEST_EMAIL, created: userCreated };

        const projects = new db.SupabaseStartupProjectRepository();
        const owned = (await projects.findAll({ user_id: TEST_USER_ID, is_demo: false })).filter((item) => item.title === PROJECT_TITLE);
        let project = owned[0] ?? null;
        let projectCreated = false;
        if (!project) {
          project = await projects.create({
            title: PROJECT_TITLE,
            summary: IDEA,
            userId: TEST_USER_ID,
            isDemo: false,
            status: 'DRAFT',
          });
          projectCreated = true;
        }
        if (project.userId !== TEST_USER_ID || project.id === FOUNDER_PROJECT) {
          throw new Error('isolated_project_not_separated');
        }
        report.isolatedProject = { id: project.id, created: projectCreated, title: project.title };

        const backend = openReviewBackend();
        report.storage = {
          durable: backend.store.durable,
          productionDatabase: backend.store.productionDatabase,
          filePathNull: backend.store.filePath === null,
        };
        if (!backend.store.durable || !backend.store.productionDatabase || backend.store.filePath !== null) {
          backend.store.close();
          report.blocked = 'openReviewBackend_did_not_select_supabase';
          return;
        }

        let chatInvocations = 0;
        const captured: ChatRequest[] = [];
        const chat: ReviewChat = async (request) => {
          chatInvocations += 1;
          captured.push(request);
          const payload = userJson(request);
          if (!payload || !Array.isArray(payload.stagePairs)) return localReply(firstFixture());
          const round = captured.filter((item) => Array.isArray(userJson(item)?.stagePairs)).length;
          const questions = round === 1 ? [NEXT_A, NEXT_B] : [NEXT_C, NEXT_D];
          const judgment = round === 1 ? '공급과 알림은 아직 확인되지 않았다' : '책임과 예약은 아직 확인되지 않았다';
          return localReply(contractReply(request, judgment, questions));
        };

        const first = await runFirstReview({
          store: backend.store,
          userId: TEST_USER_ID,
          projectId: project.id,
          text: IDEA,
          origin: 'typed',
          fileName: null,
          now: '2026-11-02T14:40:00.000Z',
          chat,
          evidence: 'injected_http',
        });
        const questions = consultingQuestions(first.record.sections);
        const workplace = questions[0]?.choices?.find((choice) => choice.label === WORKPLACE) ?? null;
        const beforeFeedback = feedbackSnapshot(await backend.store.listFeedback(TEST_USER_ID, first.record.reviewId));
        let one: Awaited<ReturnType<typeof submitConsultingStage>> | null = null;
        const chatAtStart = chatInvocations;
        if (beforeFeedback.length === 0 && workplace) {
          one = await submitConsultingStage({
            store: backend.store,
            userId: TEST_USER_ID,
            projectId: project.id,
            reviewId: first.record.reviewId,
            now: '2026-11-02T14:41:00.000Z',
            evidence: 'injected_http',
            chat,
            answers: [{ questionId: questions[0]?.questionId, choiceId: workplace.id, choiceLabel: workplace.label }],
          });
        }
        const chatAfterOne = chatInvocations;
        const restAnswers = [
          { questionId: questions[1]?.questionId, comment: PLAN_ANSWER },
          { questionId: questions[2]?.questionId, comment: RESULT_ANSWER },
          { questionId: questions[3]?.questionId, comment: STATED_ANSWER },
          { questionId: questions[4]?.questionId, comment: GAP_ANSWER },
          { unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT' as const, epistemicStatus: 'FOUNDER_CLAIM' as const },
        ];
        const rest = await submitConsultingStage({
          store: backend.store,
          userId: TEST_USER_ID,
          projectId: project.id,
          reviewId: first.record.reviewId,
          now: '2026-11-02T14:42:00.000Z',
          evidence: 'injected_http',
          chat,
          answers: workplace
            ? [{ questionId: questions[0]?.questionId, choiceId: workplace.id, choiceLabel: workplace.label }, ...restAnswers]
            : restAnswers,
        });
        const chatAfterRest = chatInvocations;
        const duplicate = await submitConsultingStage({
          store: backend.store,
          userId: TEST_USER_ID,
          projectId: project.id,
          reviewId: first.record.reviewId,
          now: '2026-11-02T14:43:00.000Z',
          evidence: 'injected_http',
          chat,
          answers: workplace
            ? [{ questionId: questions[0]?.questionId, choiceId: workplace.id, choiceLabel: workplace.label }, ...restAnswers]
            : restAnswers,
        });
        const chatAfterDuplicate = chatInvocations;
        const storedFeedback = feedbackSnapshot(await backend.store.listFeedback(TEST_USER_ID, first.record.reviewId));
        const child = duplicate.ok ? await backend.store.readReview(TEST_USER_ID, duplicate.record.reviewId) : null;
        const childQuestions = consultingQuestions(child?.sections);
        let partialChild: Awaited<ReturnType<typeof submitConsultingStage>> | null = null;
        const childFeedback = child ? await backend.store.listFeedback(TEST_USER_ID, child.reviewId) : [];
        if (child && childFeedback.length === 0 && childQuestions[0]) {
          partialChild = await submitConsultingStage({
            store: backend.store,
            userId: TEST_USER_ID,
            projectId: project.id,
            reviewId: child.reviewId,
            now: '2026-11-02T14:45:00.000Z',
            evidence: 'injected_http',
            chat,
            answers: [{ questionId: childQuestions[0].questionId, comment: R2_PLAN }],
          });
        }
        const chatAfterPartial = chatInvocations;
        const childRest = child
          ? await submitConsultingStage({
              store: backend.store,
              userId: TEST_USER_ID,
              projectId: project.id,
              reviewId: child.reviewId,
              now: '2026-11-02T14:46:00.000Z',
              evidence: 'injected_http',
              chat,
              answers: [
                { questionId: childQuestions[0]?.questionId, comment: R2_PLAN },
                { questionId: childQuestions[1]?.questionId, comment: R2_STATED },
              ],
            })
          : null;
        const chatAfterChild = chatInvocations;
        const childDuplicate = child
          ? await submitConsultingStage({
              store: backend.store,
              userId: TEST_USER_ID,
              projectId: project.id,
              reviewId: child.reviewId,
              now: '2026-11-02T14:47:00.000Z',
              evidence: 'injected_http',
              chat,
              answers: [
                { questionId: childQuestions[0]?.questionId, comment: R2_PLAN },
                { questionId: childQuestions[1]?.questionId, comment: R2_STATED },
              ],
            })
          : null;
        const finalFeedback = feedbackSnapshot(await backend.store.listFeedback(TEST_USER_ID, first.record.reviewId));
        const finalChildFeedback = child ? feedbackSnapshot(await backend.store.listFeedback(TEST_USER_ID, child.reviewId)) : [];
        const finalFirst = await backend.store.readReview(TEST_USER_ID, first.record.reviewId);
        backend.store.close();

        const stageRequest = captured.find((request) => {
          const body = userJson(request);
          return Array.isArray(body?.stagePairs) && Array.isArray(body?.priorStagePairs) && (body.priorStagePairs as unknown[]).length > 0;
        }) ?? captured.find((request) => Array.isArray(userJson(request)?.stagePairs));
        const payload = stageRequest ? userJson(stageRequest) : null;
        const stateRows = payload && Array.isArray(payload.answeredQuestionState) ? payload.answeredQuestionState as Array<Record<string, unknown>> : [];
        const repeated = stageRequest ? contractReply(stageRequest, '질문을 반복한 응답이다', [Q1, NEXT_B]) : null;
        const pairs = child?.stageAnswers ?? [];
        const repeatJudge = repeated
          ? judgeStageContract(repeated, {
              askedQuestions: pairs.map((pair) => pair.question),
              pairs,
              closedSentences: pairs.flatMap((pair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
              priorJudgmentText: R1_JUDGMENT,
              priorUnresolved: ['지불은 확인되지 않았다'],
            })
          : null;

        writeFileSync(STATE_PATH, `${JSON.stringify({
          userId: TEST_USER_ID,
          projectId: project.id,
          firstReviewId: first.record.reviewId,
          feedback: finalFeedback,
        })}\n`);
        const reread = spawnSync(join(REPO, 'apps/web/node_modules/.bin/vitest'), ['run', '--config', join(REPO, 'apps/web/scripts/sprint2-final-acceptance.config.ts')], {
          cwd: join(REPO, 'apps/web'),
          env: { ...process.env, ACCEPTANCE_MODE: 'reread', ACCEPTANCE_STATE: STATE_PATH },
          encoding: 'utf8',
          timeout: 120_000,
        });
        const rereadBody = existsSync(REREAD_PATH) ? JSON.parse(readFileSync(REREAD_PATH, 'utf8')) as Record<string, unknown> : null;
        const countsAfter = await founderCounts();
        const founderUntouched = sameCount(countsBefore.founderReviews, countsAfter.founderReviews)
          && sameCount(countsBefore.founderProjectReviews, countsAfter.founderProjectReviews)
          && sameCount(countsBefore.founderProjects, countsAfter.founderProjects)
          && sameCount(countsBefore.failedReview, countsAfter.failedReview);

        Object.assign(report, {
          isolatedUserPasswordStored: false,
          countsAfter,
          founderUntouched,
          reviews: { first: reviewSnapshot(finalFirst), child: reviewSnapshot(child) },
          feedback: { before: beforeFeedback, final: finalFeedback, child: finalChildFeedback },
          calls: {
            chatInvocations,
            openaiHttpCalls,
            chatAtStart,
            chatAfterOne,
            chatAfterRest,
            chatAfterDuplicate,
            chatAfterPartial,
            chatAfterChild,
            one: one && one.ok ? { called: one.called, pending: one.pending } : one,
            rest: rest.ok ? { called: rest.called, pending: rest.pending, status: rest.record.status, error: rest.record.error, reviewId: rest.record.reviewId } : rest,
            duplicate: duplicate.ok ? { called: duplicate.called, pending: duplicate.pending, reviewId: duplicate.record.reviewId } : duplicate,
            partialChild: partialChild && partialChild.ok ? { called: partialChild.called, pending: partialChild.pending } : partialChild,
            childRest: childRest && childRest.ok ? { called: childRest.called, pending: childRest.pending, status: childRest.record.status, reviewId: childRest.record.reviewId } : childRest,
            childDuplicate: childDuplicate && childDuplicate.ok ? { called: childDuplicate.called, pending: childDuplicate.pending, reviewId: childDuplicate.record.reviewId } : childDuplicate,
          },
          payload: payload
            ? {
                originalInput: payload.originalInput ?? null,
                unlinked: payload.unlinkedStatements ?? null,
                levels: stateRows.map((row) => ({
                  questionKey: row.questionKey ?? null,
                  sourceReviewId: row.sourceReviewId ?? null,
                  questionId: row.questionId ?? null,
                  question: row.question ?? null,
                  answerLevel: row.answerLevel ?? null,
                  resolution: row.resolution ?? null,
                  verified: row.verified ?? null,
                })),
              }
            : null,
          requests: captured.map(redactRequest),
          repeat: repeatJudge ? { issues: repeatJudge.issues, sectionsNull: repeatJudge.sections === null } : null,
          reread: {
            status: reread.status,
            signal: reread.signal,
            error: reread.error ? publicText(reread.error.message) : null,
            stdoutTail: publicText(reread.stdout?.slice(-500) ?? ''),
            stderrTail: publicText(reread.stderr?.slice(-500) ?? ''),
            body: rereadBody,
          },
          fetchHosts: [...new Set(fetchHosts)],
        });
        report.founderUntouched = founderUntouched;
        report.gptHttpCalls = openaiHttpCalls;
      } catch (error) {
        report.runnerError = error instanceof Error ? publicText(error.message) : 'runner_failed';
        try {
          report.countsAfter = await founderCounts();
        } catch (countError) {
          report.countError = countError instanceof Error ? publicText(countError.message) : 'count_failed';
        }
      } finally {
        globalThis.fetch = originalFetch;
        report.evidenceHashAfter = fileSha(EVIDENCE_FILE);
        report.gptHttpCalls = openaiHttpCalls;
        writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
      }

      expect(report.gptHttpCalls).toBe(0);
      expect(report.evidenceHashAfter).toBe(EVIDENCE_HASH);
      expect(hashBefore).toBe(EVIDENCE_HASH);
      if (report.countsBefore && report.countsAfter) {
        const before = report.countsBefore as Awaited<ReturnType<typeof founderCounts>>;
        const after = report.countsAfter as Awaited<ReturnType<typeof founderCounts>>;
        expect(sameCount(before.founderReviews, after.founderReviews)).toBe(true);
        expect(sameCount(before.founderProjectReviews, after.founderProjectReviews)).toBe(true);
        expect(sameCount(before.founderProjects, after.founderProjects)).toBe(true);
        expect(sameCount(before.failedReview, after.failedReview)).toBe(true);
      }
      expect(report.runnerError ?? null).toBeNull();
    });
  }
});
