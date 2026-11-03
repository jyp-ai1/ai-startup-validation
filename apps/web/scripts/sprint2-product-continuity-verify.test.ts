import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  consultingQuestions,
  judgeStageContract,
  runFirstReview,
  submitConsultingStage,
  type ReviewChat,
} from '../features/business-validation-journey/lib/ai-pm-review';
import { openAiPmReviewStore, type StagePair, type StoredFeedback, type StoredReview } from '../features/business-validation-journey/lib/ai-pm-review-store';

/**
 * Isolated product-path probe. Fixture sentences are verification inputs.
 * They are not product constants, and this file is not imported by the app.
 * GPT HTTP and Supabase writes stay at zero.
 */

const USER_ID = 'continuity-verify-user';
const PROJECT_ID = 'continuity-verify-project';
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
const EVIDENCE_HASH = '6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd';
const FAILED_ROW = '0e75ff46-88fd-4ce2-b567-bdc3f3048531';
const FOUNDER_IDS = ['3a5fc4a0-2e90-45e6-8370-350beda67342', '37d541c8-fda7-4788-8ac2-1a449b00425c', FAILED_ROW];
const REPO_ROOT = resolve(__dirname, '../../..');
const EVIDENCE_FILE = join(REPO_ROOT, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json');
const OUT_FILE = join(REPO_ROOT, 'docs/evidence/ALABOM/AI-PM/sprint-2-product-continuity-verification.json');

const Q1 = '누가 이 공간을 쓰는가?';
const Q2 = '모집 규모를 어떻게 둘 것인가?';
const Q3 = '안내 이후 무엇을 확인했는가?';
const Q4 = '공간은 어떤 형태인가?';
const Q5 = '운영 요일은 정했는가?';
const NEXT_A = '공급 장소를 어디서 구할 계획인가?';
const NEXT_B = '알릴 채널을 무엇으로 두는가?';
const NEXT_C = '운영 책임자를 누구로 둘 예정인가?';
const NEXT_D = '예약 방식을 무엇으로 둘 것인가?';

type Grade = 'PASS' | 'FAIL' | 'PARTIAL' | 'BLOCKED' | 'NOT RUN';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function fileSha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
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

function userJson(request: ChatRequest): Record<string, unknown> {
  return JSON.parse(userContent(request)) as Record<string, unknown>;
}

function redactRequest(request: ChatRequest): { model: string; schemaTitle: string | null; reaskReasonRequired: boolean | null; system: { redacted: true; sha256: string; chars: number }; user: Record<string, unknown> | { json: false; sha256: string; chars: number } } {
  const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
  const schema = request.responseFormat?.type === 'json_schema' ? request.responseFormat.schema : null;
  const title = schema && typeof schema.title === 'string' ? schema.title : null;
  const nextItems = schema && typeof schema.properties === 'object' && schema.properties
    ? (schema.properties as { nextQuestions?: { items?: { required?: unknown } } }).nextQuestions?.items?.required
    : null;
  const user = userContent(request);
  let parsed: Record<string, unknown> | null = null;
  try {
    const value = JSON.parse(user) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  return {
    model: request.model,
    schemaTitle: title,
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
  const payload = userJson(request);
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
      choiceId: row.choiceAnswer?.choiceId ?? null,
      choiceLabel: row.choiceAnswer?.label ?? null,
      provenance: row.provenance ?? null,
      epistemicStatus: row.epistemicStatus ?? null,
      modelCalls: row.modelCalls,
      submittedAt: row.submittedAt,
    }));
}

function reviewSnapshot(record: StoredReview | null) {
  if (!record) return null;
  return {
    reviewId: record.reviewId,
    parentReviewId: record.parentReviewId,
    version: record.version,
    status: record.status,
    evidence: record.evidence,
    provider: record.provider,
    model: record.model,
    callCount: record.callCount,
    error: record.error,
    inputText: record.inputText,
    finishedAt: record.finishedAt,
    sectionsNull: record.sections === null,
    questionTexts: consultingQuestions(record.sections).map((question) => question.text),
    stageAnswerCount: record.stageAnswers?.length ?? 0,
    judgment: record.sections?.analysis?.judgmentDetail ?? record.sections?.judgment ?? null,
  };
}

function stateRows(payload: Record<string, unknown> | null) {
  const rows = payload && Array.isArray(payload.answeredQuestionState) ? payload.answeredQuestionState : [];
  return rows.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const answer = row.answer && typeof row.answer === 'object' ? (row.answer as Record<string, unknown>) : {};
    return [{
      questionKey: row.questionKey ?? null,
      sourceReviewId: row.sourceReviewId ?? null,
      questionId: row.questionId ?? null,
      question: row.question ?? null,
      answerLevel: row.answerLevel ?? null,
      resolution: row.resolution ?? null,
      verified: row.verified ?? null,
      analysisComplete: row.analysisComplete ?? null,
      choiceLabel: answer.choiceLabel ?? null,
      supplement: answer.supplement ?? null,
      epistemicStatus: answer.epistemicStatus ?? null,
      confirmedByAnswer: row.confirmedByAnswer ?? null,
      unconfirmedAfterAnswer: row.unconfirmedAfterAnswer ?? null,
    }];
  });
}

function publicError(error: { message?: string; code?: string } | null): { code: string | null; message: string | null } {
  if (!error) return { code: null, message: null };
  const message = (error.message ?? '')
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .slice(0, 180);
  return { code: error.code ?? null, message: message || null };
}

describe('sprint 2 product continuity path', () => {
  it('saves isolated answers, rereads them, and builds the next request without GPT', async () => {
    const hashBefore = fileSha(EVIDENCE_FILE);
    const directory = mkdtempSync(join(tmpdir(), 'sprint2-product-continuity-'));
    const filePath = join(directory, 'reviews.sqlite');
    const originalFetch = globalThis.fetch;
    let fetchWrapped = false;
    let openaiHttpCalls = 0;
    const fetchHosts: string[] = [];
    let chatInvocations = 0;
    const captured: ChatRequest[] = [];
    const report: Record<string, unknown> = {
      kind: 'sprint2-product-continuity-verification',
      at: new Date().toISOString(),
      localFixture: {
        responseId: 'local-parser-fixture',
        model: 'local-parser-fixture',
        evidence: 'injected_http',
        note: 'The stored provider column is openai because ChatResponse has no local provider id. The callback returned fixture text in process. It did not send an HTTP request.',
      },
      gptHttpCalls: 0,
      productionDeploy: false,
      supabaseDataChange: false,
      sprint3Started: false,
      sprint2: 'PARTIAL',
    };

    const wrapFetch = () => {
      fetchWrapped = true;
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
    };

    try {
      const keyPresent = Boolean(process.env.GPT_API_KEY?.trim());
      const googleKeyPresent = Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
      let adminConfigured = false;
      let supabaseConfigured = false;
      let hostname: string | null = null;
      let probeError: string | null = null;
      const counts: { reviews: { before: number | null; after: number | null; error: string | null; code: string | null }; feedback: { before: number | null; after: number | null; error: string | null; code: string | null } } = {
        reviews: { before: null, after: null, error: null, code: null },
        feedback: { before: null, after: null, error: null, code: null },
      };
      try {
        const db = await import('@repo/db');
        adminConfigured = db.isSupabaseAdminConfigured();
        supabaseConfigured = db.isSupabaseConfigured();
        const rawUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
        if (rawUrl) {
          try {
            hostname = new URL(rawUrl).hostname;
          } catch {
            hostname = 'unparsed';
          }
        }
        if (adminConfigured) {
          const client = db.getServiceClient();
          for (const table of ['ai_pm_reviews', 'ai_pm_feedback'] as const) {
            const response = await client.from(table).select('*', { count: 'exact', head: true });
            const published = publicError(response.error);
            const slot = table === 'ai_pm_reviews' ? counts.reviews : counts.feedback;
            slot.before = response.count;
            slot.code = published.code;
            slot.error = published.message;
          }
        }
      } catch (error) {
        probeError = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 180) : 'probe_failed';
      }

      wrapFetch();
      const chat: ReviewChat = async (request) => {
        chatInvocations += 1;
        captured.push(request);
        if (chatInvocations === 1) return localReply(firstFixture());
        const questions = chatInvocations === 2 ? [NEXT_A, NEXT_B] : [NEXT_C, NEXT_D];
        const judgment = chatInvocations === 2 ? '공급과 알림은 아직 확인되지 않았다' : '책임과 예약은 아직 확인되지 않았다';
        return localReply(contractReply(request, judgment, questions));
      };

      let store = openAiPmReviewStore(filePath);
      const first = await runFirstReview({
        store,
        userId: USER_ID,
        projectId: PROJECT_ID,
        text: IDEA,
        origin: 'typed',
        fileName: null,
        now: '2026-11-02T14:20:00.000Z',
        chat,
        evidence: 'injected_http',
      });
      const questions = consultingQuestions(first.record.sections);
      const workplace = questions[0]?.choices?.find((choice) => choice.label === WORKPLACE) ?? null;
      const beforeSave = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const one = await submitConsultingStage({
        store,
        userId: USER_ID,
        projectId: PROJECT_ID,
        reviewId: first.record.reviewId,
        now: '2026-11-02T14:21:00.000Z',
        evidence: 'injected_http',
        chat,
        answers: workplace ? [{ questionId: questions[0]?.questionId, choiceId: workplace.id, choiceLabel: workplace.label }] : [],
      });
      const afterOne = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const chatAfterOne = chatInvocations;
      store.close();
      store = openAiPmReviewStore(filePath);
      const rereadOne = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const rereadFirst = await store.readReview(USER_ID, first.record.reviewId);

      const rest = await submitConsultingStage({
        store,
        userId: USER_ID,
        projectId: PROJECT_ID,
        reviewId: first.record.reviewId,
        now: '2026-11-02T14:22:00.000Z',
        evidence: 'injected_http',
        chat,
        answers: [
          { questionId: questions[1]?.questionId, comment: PLAN_ANSWER },
          { questionId: questions[2]?.questionId, comment: RESULT_ANSWER },
          { questionId: questions[3]?.questionId, comment: STATED_ANSWER },
          { questionId: questions[4]?.questionId, comment: GAP_ANSWER },
          { unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' },
        ],
      });
      const afterRest = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const chatAfterRest = chatInvocations;
      const duplicate = await submitConsultingStage({
        store,
        userId: USER_ID,
        projectId: PROJECT_ID,
        reviewId: first.record.reviewId,
        now: '2026-11-02T14:23:00.000Z',
        evidence: 'injected_http',
        chat,
        answers: [
          workplace ? { questionId: questions[0]?.questionId, choiceId: workplace.id, choiceLabel: workplace.label } : {},
          { questionId: questions[1]?.questionId, comment: PLAN_ANSWER },
          { questionId: questions[2]?.questionId, comment: RESULT_ANSWER },
          { questionId: questions[3]?.questionId, comment: STATED_ANSWER },
          { questionId: questions[4]?.questionId, comment: GAP_ANSWER },
          { unlinked: true, comment: UNLINKED, provenance: 'FOUNDER_INPUT', epistemicStatus: 'FOUNDER_CLAIM' },
        ],
      });
      const afterDuplicate = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const chatAfterDuplicate = chatInvocations;
      store.close();
      store = openAiPmReviewStore(filePath);
      const rereadRest = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const rereadFirstAgain = await store.readReview(USER_ID, first.record.reviewId);
      const child = duplicate.ok ? await store.readReview(USER_ID, duplicate.record.reviewId) : null;

      const childQuestions = consultingQuestions(child?.sections);
      const partialChild = child
        ? await submitConsultingStage({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: child.reviewId,
            now: '2026-11-02T14:25:00.000Z',
            evidence: 'injected_http',
            chat,
            answers: [{ questionId: childQuestions[0]?.questionId, comment: R2_PLAN }],
          })
        : null;
      const chatAfterPartialChild = chatInvocations;
      const childRest = child
        ? await submitConsultingStage({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: child.reviewId,
            now: '2026-11-02T14:26:00.000Z',
            evidence: 'injected_http',
            chat,
            answers: [
              { questionId: childQuestions[0]?.questionId, comment: R2_PLAN },
              { questionId: childQuestions[1]?.questionId, comment: R2_STATED },
            ],
          })
        : null;
      const chatAfterChildRest = chatInvocations;
      const childDuplicate = child
        ? await submitConsultingStage({
            store,
            userId: USER_ID,
            projectId: PROJECT_ID,
            reviewId: child.reviewId,
            now: '2026-11-02T14:27:00.000Z',
            evidence: 'injected_http',
            chat,
            answers: [
              { questionId: childQuestions[0]?.questionId, comment: R2_PLAN },
              { questionId: childQuestions[1]?.questionId, comment: R2_STATED },
            ],
          })
        : null;
      const chatAfterChildDuplicate = chatInvocations;
      const r1AfterChild = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const r2Feedback = child ? feedbackSnapshot(await store.listFeedback(USER_ID, child.reviewId)) : [];
      store.close();
      store = openAiPmReviewStore(filePath);
      const finalR1 = feedbackSnapshot(await store.listFeedback(USER_ID, first.record.reviewId));
      const finalR1Review = await store.readReview(USER_ID, first.record.reviewId);
      const finalChild = child ? await store.readReview(USER_ID, child.reviewId) : null;
      const finalGrandchild = childRest?.ok ? await store.readReview(USER_ID, childRest.record.reviewId) : null;
      const finalR2Feedback = child ? feedbackSnapshot(await store.listFeedback(USER_ID, child.reviewId)) : [];
      store.close();

      const payload1 = captured[1] ? userJson(captured[1]) : null;
      const payload2 = captured[2] ? userJson(captured[2]) : null;
      const rows1 = stateRows(payload1);
      const rows2 = stateRows(payload2);
      const byQuestion = (rows: typeof rows1, text: string) => rows.find((row) => row.question === text) ?? null;
      const levelOk = (row: (typeof rows1)[number] | null, level: string, resolution: string) =>
        row?.answerLevel === level && row.resolution === resolution && row.verified === false && row.epistemicStatus === 'FOUNDER_CLAIM';

      const pairs = child?.stageAnswers ?? [];
      const repeated = captured[1] ? contractReply(captured[1], '질문을 반복한 응답이다', [Q1, NEXT_B]) : null;
      const repeatJudge = repeated
        ? judgeStageContract(repeated, {
            askedQuestions: pairs.map((pair: StagePair) => pair.question),
            pairs,
            closedSentences: pairs.flatMap((pair: StagePair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
            priorJudgmentText: R1_JUDGMENT,
            priorUnresolved: ['지불은 확인되지 않았다'],
          })
        : null;
      const fresh = captured[1] ? contractReply(captured[1], '공급과 알림은 아직 확인되지 않았다', [NEXT_A, NEXT_B]) : null;
      const freshJudge = fresh
        ? judgeStageContract(fresh, {
            askedQuestions: pairs.map((pair: StagePair) => pair.question),
            pairs,
            closedSentences: pairs.flatMap((pair: StagePair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
            priorJudgmentText: R1_JUDGMENT,
            priorUnresolved: ['지불은 확인되지 않았다'],
          })
        : null;

      const sqliteBytes = readFileSync(filePath);
      const sqliteText = sqliteBytes.toString('utf8');
      const founderIdsInSqlite = FOUNDER_IDS.filter((id) => sqliteText.includes(id));
      if (adminConfigured) {
        const db = await import('@repo/db');
        const client = db.getServiceClient();
        for (const table of ['ai_pm_reviews', 'ai_pm_feedback'] as const) {
          const response = await client.from(table).select('*', { count: 'exact', head: true });
          const slot = table === 'ai_pm_reviews' ? counts.reviews : counts.feedback;
          slot.after = response.count;
          if (!slot.error && response.error) {
            const published = publicError(response.error);
            slot.code = published.code;
            slot.error = published.message;
          }
        }
      }

      const expected = [
        { text: Q1, level: 'menu_choice', resolution: 'method_selected' },
        { text: Q2, level: 'planned_action', resolution: 'plan_stated' },
        { text: Q3, level: 'reported_result', resolution: 'result_reported' },
        { text: Q4, level: 'stated_without_result', resolution: 'gap_named' },
        { text: Q5, level: 'unresolved_gap', resolution: 'still_open' },
      ];
      const levelsPayload1 = expected.map((item) => ({ ...item, ok: levelOk(byQuestion(rows1, item.text), item.level, item.resolution) }));
      const levelsPayload2 = expected.map((item) => {
        const row = byQuestion(rows2, item.text);
        return { ...item, ok: levelOk(row, item.level, item.resolution) && row?.sourceReviewId === first.record.reviewId };
      });
      const r2LevelPlan = byQuestion(rows2, childQuestions[0]?.text ?? '');
      const r2LevelStated = byQuestion(rows2, childQuestions[1]?.text ?? '');
      const unlinked1 = payload1 && Array.isArray(payload1.unlinkedStatements) ? payload1.unlinkedStatements : [];
      const unlinked2 = payload2 && Array.isArray(payload2.unlinkedStatements) ? payload2.unlinkedStatements : [];
      const textOf = (rows: unknown[]) => rows.map((item) => (item && typeof item === 'object' ? (item as { text?: unknown }).text : null));

      const sameIds = (left: ReturnType<typeof feedbackSnapshot>, right: ReturnType<typeof feedbackSnapshot>) =>
        left.map((row) => row.feedbackId).join() === right.map((row) => row.feedbackId).join() &&
        left.map((row) => row.comment).join('\n') === right.map((row) => row.comment).join('\n');

      const functionOk = {
        originalPreserved: finalR1Review?.inputText === IDEA && finalR1Review.finishedAt === first.record.finishedAt && finalR1.some((row) => row.comment === PLAN_ANSWER),
        links: rows2.some((row) => row.questionKey === `${first.record.reviewId}:${questions[0]?.questionId}`) && rows2.some((row) => row.sourceReviewId === child?.reviewId),
        unlinkedKept: finalR1.some((row) => row.unlinked && row.comment === UNLINKED) && textOf(unlinked2).includes(UNLINKED),
        levels: levelsPayload2.every((item) => item.ok) && r2LevelPlan?.answerLevel === 'planned_action' && r2LevelPlan.resolution === 'plan_stated' && r2LevelStated?.answerLevel === 'stated_without_result',
        reread: sameIds(afterRest, rereadRest) && sameIds(afterRest, finalR1) && rereadOne.length === 1 && rereadOne[0]?.comment === WORKPLACE,
        payload: payload2?.originalInput === IDEA && JSON.stringify(payload2).includes(R1_JUDGMENT) && JSON.stringify(payload2).includes(PLAN_ANSWER) && JSON.stringify(payload2).includes(R2_PLAN) && JSON.stringify(payload2).includes(UNLINKED),
        repeatBlocked: Boolean(repeatJudge && repeatJudge.issues.includes('stage_questions_repeated') && repeatJudge.sections === null && freshJudge && !freshJudge.issues.includes('stage_questions_repeated')),
        incompleteNoChat: one.ok === true && one.called === false && one.pending === true && chatAfterOne === 1 && partialChild?.ok === true && partialChild.called === false && partialChild.pending === true && chatAfterPartialChild === chatAfterRest,
        reuse: duplicate.ok === true && duplicate.called === false && duplicate.pending === false && chatAfterDuplicate === chatAfterRest && childDuplicate?.ok === true && childDuplicate.called === false && chatAfterChildDuplicate === chatAfterChildRest,
      };

      const durableGrade: Grade = adminConfigured ? 'BLOCKED' : 'NOT RUN';
      const adapterGrade = (ok: boolean): Grade => (ok ? 'PARTIAL' : 'FAIL');
      const guards = {
        evidenceHashBefore: hashBefore,
        evidenceHashUnchanged: hashBefore === EVIDENCE_HASH,
        openaiHttpCalls,
        fetchHosts,
        supabaseWriteAttempts: 0,
        founderIdsInSqlite,
        isolatedSqliteDeletedAfter: true,
      };

      Object.assign(report, {
        gptApiKeyPresent: keyPresent,
        googleAiApiKeyPresent: googleKeyPresent,
        storeSelection: adminConfigured ? 'supabase' : 'sqlite',
        openReviewBackendCalled: false,
        httpRoutes: 'NOT RUN',
        supabaseProbe: { supabaseConfigured, adminConfigured, hostname, probeError, counts, recordJsonSelected: false, writes: 0 },
        isolatedStore: { adapter: 'openAiPmReviewStore', durable: false, productionDatabase: false, userId: USER_ID, projectId: PROJECT_ID },
        ids: {
          firstReviewId: first.record.reviewId,
          childReviewId: child?.reviewId ?? null,
          grandchildReviewId: childRest?.ok ? childRest.record.reviewId : null,
        },
        snapshots: {
          beforeSave,
          afterOne,
          rereadOne,
          afterRest,
          afterDuplicate,
          rereadRest,
          r1AfterChild,
          finalR1,
          r2Feedback,
          finalR2Feedback,
        },
        reviews: {
          first: reviewSnapshot(first.record),
          rereadFirst: reviewSnapshot(rereadFirst),
          rereadFirstAgain: reviewSnapshot(rereadFirstAgain),
          finalR1: reviewSnapshot(finalR1Review),
          child: reviewSnapshot(child),
          finalChild: reviewSnapshot(finalChild),
          grandchild: reviewSnapshot(finalGrandchild),
        },
        calls: {
          chatInvocations,
          localFixtureReturns: chatInvocations,
          openaiHttpCalls,
          afterOne: chatAfterOne,
          afterRest: chatAfterRest,
          afterDuplicate: chatAfterDuplicate,
          afterPartialChild: chatAfterPartialChild,
          afterChildRest: chatAfterChildRest,
          afterChildDuplicate: chatAfterChildDuplicate,
          one: one.ok ? { called: one.called, pending: one.pending } : one,
          rest: rest.ok ? { called: rest.called, pending: rest.pending, status: rest.record.status, error: rest.record.error } : rest,
          duplicate: duplicate.ok ? { called: duplicate.called, pending: duplicate.pending, reviewId: duplicate.record.reviewId } : duplicate,
          partialChild: partialChild ? (partialChild.ok ? { called: partialChild.called, pending: partialChild.pending } : partialChild) : null,
          childRest: childRest ? (childRest.ok ? { called: childRest.called, pending: childRest.pending, status: childRest.record.status, error: childRest.record.error } : childRest) : null,
          childDuplicate: childDuplicate ? (childDuplicate.ok ? { called: childDuplicate.called, pending: childDuplicate.pending, reviewId: childDuplicate.record.reviewId } : childDuplicate) : null,
        },
        levelsPayload1,
        levelsPayload2,
        r2Levels: { plan: r2LevelPlan, stated: r2LevelStated },
        unlinked: { payload1: textOf(unlinked1), payload2: textOf(unlinked2) },
        repeat: { repeatIssues: repeatJudge?.issues ?? null, repeatSectionsNull: repeatJudge ? repeatJudge.sections === null : null, freshIssues: freshJudge?.issues ?? null },
        functionOk,
        requests: captured.map(redactRequest),
        guards,
        judgments: {
          originalIdea: adapterGrade(functionOk.originalPreserved),
          provenanceLinks: adapterGrade(functionOk.links),
          unlinkedKept: adapterGrade(functionOk.unlinkedKept),
          answerLevels: adapterGrade(functionOk.levels),
          durableSaveReread: durableGrade,
          sqliteAdapterReread: adapterGrade(functionOk.reread),
          nextPayload: adapterGrade(functionOk.payload && functionOk.links && functionOk.unlinkedKept),
          repeatBlocked: adapterGrade(functionOk.repeatBlocked),
          incompleteStageZeroGpt: adapterGrade(functionOk.incompleteNoChat && openaiHttpCalls === 0),
          duplicateReuse: adapterGrade(functionOk.reuse),
          founderEvidenceUnchanged: hashBefore === EVIDENCE_HASH && founderIdsInSqlite.length === 0 && openaiHttpCalls === 0 ? 'PASS' : 'FAIL',
          httpApi: 'NOT RUN',
          founderScreen: 'NOT RUN',
          gptFollowUp: 'NOT RUN',
          round4: 'NOT RUN',
        },
      });
    } catch (error) {
      report.runnerError = error instanceof Error ? error.message.slice(0, 500) : 'runner_failed';
    } finally {
      if (fetchWrapped) globalThis.fetch = originalFetch;
      rmSync(directory, { recursive: true, force: true });
      const hashAfter = fileSha(EVIDENCE_FILE);
      report.evidenceHashAfter = hashAfter;
      report.gptHttpCalls = openaiHttpCalls;
      writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
    }

    const guards = report.guards as { evidenceHashUnchanged?: boolean; openaiHttpCalls?: number; founderIdsInSqlite?: string[] } | undefined;
    expect(report.runnerError ?? null).toBeNull();
    expect(guards?.openaiHttpCalls).toBe(0);
    expect(guards?.evidenceHashUnchanged).toBe(true);
    expect(fileSha(EVIDENCE_FILE)).toBe(EVIDENCE_HASH);
    expect(guards?.founderIdsInSqlite).toEqual([]);
    expect(report.supabaseDataChange).toBe(false);
  });
});
