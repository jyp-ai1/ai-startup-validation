import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { getServiceClient } from '@repo/db';
import { describe, expect, it } from 'vitest';

import { openReviewBackend } from '../ai-pm-review-backend';
import {
  NEW_OBJECTIVE_CONTINUATION,
  consultingQuestions,
  runFirstReview,
  submitConsultingStage,
} from '../ai-pm-review';
import { strictSchemaIssues } from '../strict-json-schema';

const ISOLATED_USER = 'c0ffee00-1111-4000-8000-0000000002a2';
const ISOLATED_PROJECT = 'bc12a6f4-45b7-47b2-b266-ef61cd4013d9';
const FOUNDER_USER = '37d541c8-fda7-4788-8ac2-1a449b00425c';
const FOUNDER_PROJECT = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const FORBIDDEN = [
  '0e75ff46-88fd-4ce2-b567-bdc3f3048531',
  '9d51935d-891e-424c-b3f1-9b1c5e529c2f',
  '8ec32bae-461b-449a-99b7-db95a92fb2c0',
];
const EVIDENCE = new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json', import.meta.url);
const JUDGMENT = '유지토큰-지불확인. 수요는 아직 확인되지 않았다.';
const ANSWER = '직장인을 고객으로 본다';
const LIVE = process.env.PRODUCT_PATH_LIVE === '1';

function reply(content: string): ChatResponse {
  return {
    id: 'resp-product-path',
    model: 'gpt-4o-mini',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
    usageKnown: true,
    latencyMs: 1,
  };
}

function firstRaw(): string {
  const questions = ['누구를 고객으로 하는가?', '가격은 얼마인가?', '어떤 채널로 알리는가?'];
  return JSON.stringify({
    summary: '가격은 미확인이라 판단을 유지한다.',
    customer: '직장인',
    problem: '모임 수요가 확인되지 않았다.',
    value: '독서 모임',
    operatingModel: '구상',
    alternatives: '개인 독서',
    differentiation: '미확인',
    payer: '지불자는 확인되지 않았다.',
    revenueModel: '가격은 가설이며 원문에 없다.',
    market: '수요 조사는 입력에 없다.',
    competition: '경쟁은 확인되지 않았다.',
    operations: '운영은 구상이다.',
    profitability: '수익성은 확인되지 않았다.',
    judgment: JUDGMENT,
    nextVerification: '지불 의사를 확인한다.',
    nextQuestion: questions[0],
    nextQuestionReason: '지불 확인이 다음 판단에 필요하다.',
    strengths: ['모임 구상이 있다'],
    risks: ['수요가 없다'],
    assumptions: ['가격은 확인되지 않았다'],
    evidenceToChange: ['지불 의사'],
    founderFacts: [],
    inferences: ['추론: 지불자는 미확인'],
    choices: ['지불 의사를 먼저 확인한다', '장소를 먼저 확인한다'],
    questions,
  });
}

function stageRaw(request: ChatRequest, questions: string[], judgment: string): string {
  const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
    stagePairs?: Array<{ questionKey?: string; questionId: string; choiceId: string | null; status: string; choiceLabel?: string | null; supplement?: string }>;
    verificationObjectives?: { unresolved?: Array<{ objectiveId?: string }> };
  };
  const answered = (payload.stagePairs ?? []).filter((pair) => pair.status === 'answered');
  const cites = answered
    .map((pair) => (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim())
    .filter((text) => text.length > 0);
  const continuesObjectiveId = payload.verificationObjectives?.unresolved?.find((row) => row.objectiveId)?.objectiveId ?? '';
  const nextQuestions = questions.map((text) => ({
    text,
    choices: [`${text} 쪽을 먼저 본다`, `${text} 쪽은 아직 정하지 못했다`],
    verificationPurpose: `${text}와 다른 불확실성. 아직 확인하지 않은 다음 검증이다`,
    reaskReason: null,
    ...(continuesObjectiveId ? { continuesObjectiveId } : {}),
  }));
  return JSON.stringify({
    answerInterpretation: answered.map((pair) => ({
      questionId: pair.questionId,
      choiceId: pair.choiceId ?? '',
      meaning: `${pair.questionId} 답은 계획을 구체화하고 확인된 사실은 늘리지 않는다`,
      founderBasis: `${pair.questionId}에서 이렇게 말한 이유는 입력에 적힌 계획이다`,
      observedEvidence: `${pair.questionId}에서 확인된 접촉이나 합의는 없다`,
      judgmentEffect: `${pair.questionId} 답은 확인된 사실이 아니다. 성공 가능성은 높아지지 않았다. 이전 판단은 유지되고 검증된 사실은 늘지 않는다.`,
      openRisk: `${pair.questionId}의 지불은 아직 검증되지 않았다`,
    })),
    impactOnPreviousJudgment: '이번 답이 기존 판단에 준 영향이다.',
    updatedJudgment: judgment,
    judgmentReason: `지불 확인이 없어 판단을 유지한다. 이번 답 ${cites.join(' ')}을 확인했다. 남은 불확실성은 지불이다.`,
    answerEvidence: answered.map((pair) => ({
      questionKey: pair.questionKey || pair.questionId,
      answerText: (pair.choiceLabel ?? '').trim() || (pair.supplement ?? '').trim(),
      provenance: 'FOUNDER_INPUT',
      epistemicStatus: 'FOUNDER_CLAIM',
    })),
    verifiedFacts: [],
    unverifiedClaims: [],
    assumptions: ['가격은 확인되지 않았다'],
    resolvedIssues: [],
    unresolvedIssues: [`${questions[0] ?? '다음 확인'}는 아직 확인되지 않았다`],
    nextVerification: '지불 의사를 확인한다.',
    customer: '직장인',
    problem: '모임 수요가 확인되지 않았다',
    value: '함께 읽는 자리',
    product: '독서 모임',
    market: '수요는 입력에 없다',
    revenueModel: '가격은 가설이며 원문에 없다',
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

async function headCount(table: string, filters: Record<string, string>): Promise<number | null> {
  let query = getServiceClient().from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const response = await query;
  if (response.error) throw new Error(response.error.code ?? 'count_failed');
  return response.count;
}

describe('objective contract product path', () => {
  it('wires the follow-up route through the product store and the stage contract', () => {
    const route = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    expect(route).toContain('openReviewBackend');
    expect(route).toContain('submitConsultingStage');
    expect(route).toContain('readGptApiKey');
    expect(route).not.toContain('openAiPmReviewStore');
    expect(createHash('sha256').update(readFileSync(EVIDENCE)).digest('hex')).toBe(
      '6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd',
    );
  });

  it('rereads the isolated product rows from this process', async () => {
    if (process.env.PRODUCT_PATH_MODE !== 'reread') return;
    const ids = (process.env.PRODUCT_PATH_IDS ?? '').split(',').filter((id) => id.length > 0);
    const backend = openReviewBackend();
    const rows = [];
    for (const id of ids) rows.push(await backend.store.readReview(ISOLATED_USER, id));
    const founderHits = [];
    for (const id of ids) founderHits.push(await backend.store.readReview(FOUNDER_USER, id));
    console.log(
      `PRODUCT_PATH_REREAD=${JSON.stringify({
        productionDatabase: backend.storage.productionDatabase,
        durable: backend.storage.durable,
        filePath: backend.store.filePath,
        rows: rows.map((row) => ({
          reviewId: row?.reviewId ?? null,
          parentReviewId: row?.parentReviewId ?? null,
          status: row?.status ?? null,
          sections: Boolean(row?.sections),
          userId: row?.userId ?? null,
          projectId: row?.projectId ?? null,
        })),
        founderHits: founderHits.filter(Boolean).length,
      })}`,
    );
    backend.store.close();
  });

  it('saves the stage contract through Supabase and rereads it in a second process', async () => {
    if (!LIVE || process.env.PRODUCT_PATH_MODE === 'reread') return;
    const client = getServiceClient();
    const project = await client.from('startup_projects').select('user_id').eq('id', ISOLATED_PROJECT).maybeSingle();
    expect(project.error).toBeNull();
    expect(project.data?.user_id).toBe(ISOLATED_USER);
    const before = {
      founderReviews: await headCount('ai_pm_reviews', { user_id: FOUNDER_USER }),
      founderProjectReviews: await headCount('ai_pm_reviews', { project_id: FOUNDER_PROJECT }),
      founderProjects: await headCount('startup_projects', { user_id: FOUNDER_USER }),
      forbidden: await Promise.all(FORBIDDEN.map((id) => headCount('ai_pm_reviews', { review_id: id }))),
    };
    const backend = openReviewBackend();
    expect(backend.storage).toMatchObject({ kind: 'supabase', productionDatabase: true, durable: true });
    expect(backend.store.filePath).toBeNull();
    const created: string[] = [];
    let stageSchema: string[] | undefined;
    let nextRequestHasJudgment = false;
    const idea = `격리 제품 경로 ${Date.now()}. 실내 작업 공간을 직장인에게 시간 단위로 제안하는 구상이다. 아직 운영 전이다.`;
    try {
      const first = await runFirstReview({
        store: backend.store,
        userId: ISOLATED_USER,
        projectId: ISOLATED_PROJECT,
        text: idea,
        origin: 'typed',
        fileName: null,
        now: new Date().toISOString(),
        evidence: 'injected_http',
        chat: async () => reply(firstRaw()),
      });
      created.push(first.record.reviewId);
      expect(first.record.status).toBe('succeeded');
      const questions = consultingQuestions(first.record.sections);
      const stage = await submitConsultingStage({
        store: backend.store,
        userId: ISOLATED_USER,
        projectId: ISOLATED_PROJECT,
        reviewId: first.record.reviewId,
        now: new Date().toISOString(),
        evidence: 'injected_http',
        answers: questions.map((question) => ({ questionId: question.questionId, comment: ANSWER })),
        chat: async (request) => {
          if (request.responseFormat?.type === 'json_schema') {
            expect(strictSchemaIssues(request.responseFormat.schema)).toEqual([]);
            const properties = request.responseFormat.schema.properties as {
              answerEvidence?: { items?: { required?: string[] } };
              nextQuestions?: { items?: { properties?: { continuesObjectiveId?: { enum?: string[] } } } };
            };
            stageSchema = properties.nextQuestions?.items?.properties?.continuesObjectiveId?.enum;
            expect(properties.answerEvidence?.items?.required).toEqual(['questionKey', 'answerText', 'provenance', 'epistemicStatus']);
          }
          return reply(stageRaw(request, ['모임 장소는 어디인가?', '참가 신청은 어떻게 받는가?'], JUDGMENT));
        },
      });
      expect(stage.ok).toBe(true);
      if (!stage.ok) return;
      created.push(stage.record.reviewId);
      expect(stage.record.status).toBe('succeeded');
      expect(stage.called).toBe(true);
      expect(stageSchema).toContain(NEW_OBJECTIVE_CONTINUATION);
      expect(stageSchema?.some((id) => id.endsWith(':remainder') || !id.includes('__new__'))).toBe(true);
      const childQuestions = consultingQuestions(stage.record.sections);
      const next = await submitConsultingStage({
        store: backend.store,
        userId: ISOLATED_USER,
        projectId: ISOLATED_PROJECT,
        reviewId: stage.record.reviewId,
        now: new Date().toISOString(),
        evidence: 'injected_http',
        answers: childQuestions.map((question) => ({ questionId: question.questionId, comment: '장소는 아직 정하지 못했다' })),
        chat: async (request) => {
          const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
          nextRequestHasJudgment = user.includes(JUDGMENT);
          return reply(stageRaw(request, ['운영 요일은 언제인가?', '주최자는 누구인가?'], '장소는 미정이다. 이번 답 장소는 아직 정하지 못했다를 반영한다.'));
        },
      });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      created.push(next.record.reviewId);
      expect(nextRequestHasJudgment).toBe(true);
      expect(FORBIDDEN.some((id) => created.includes(id))).toBe(false);
      const child = spawnSync(
        'pnpm',
        ['exec', 'vitest', 'run', 'features/business-validation-journey/lib/__tests__/ai-pm-objective-product-path.test.ts', '-t', 'rereads the isolated'],
        {
          cwd: process.cwd(),
          env: { ...process.env, PRODUCT_PATH_LIVE: '1', PRODUCT_PATH_MODE: 'reread', PRODUCT_PATH_IDS: created.join(',') },
          encoding: 'utf8',
        },
      );
      expect(child.status).toBe(0);
      const line = child.stdout.split('\n').find((item) => item.includes('PRODUCT_PATH_REREAD='));
      expect(line).toBeTruthy();
      const reread = JSON.parse(line?.split('PRODUCT_PATH_REREAD=')[1] ?? '{}') as {
        productionDatabase: boolean;
        durable: boolean;
        filePath: string | null;
        founderHits: number;
        rows: Array<{ reviewId: string; status: string; sections: boolean; userId: string; projectId: string }>;
      };
      expect(reread.productionDatabase).toBe(true);
      expect(reread.durable).toBe(true);
      expect(reread.filePath).toBeNull();
      expect(reread.founderHits).toBe(0);
      expect(reread.rows.map((row) => row.reviewId).sort()).toEqual([...created].sort());
      expect(reread.rows.every((row) => row.status === 'succeeded' && row.sections && row.userId === ISOLATED_USER && row.projectId === ISOLATED_PROJECT)).toBe(true);
    } finally {
      if (created.length > 0) {
        const feedback = await client.from('ai_pm_feedback').delete().eq('user_id', ISOLATED_USER).in('review_id', created);
        const reviews = await client.from('ai_pm_reviews').delete().eq('user_id', ISOLATED_USER).in('review_id', created);
        expect(feedback.error).toBeNull();
        expect(reviews.error).toBeNull();
      }
      backend.store.close();
    }
    expect(await headCount('ai_pm_reviews', { user_id: FOUNDER_USER })).toBe(before.founderReviews);
    expect(await headCount('ai_pm_reviews', { project_id: FOUNDER_PROJECT })).toBe(before.founderProjectReviews);
    expect(await headCount('startup_projects', { user_id: FOUNDER_USER })).toBe(before.founderProjects);
    const afterForbidden = await Promise.all(FORBIDDEN.map((id) => headCount('ai_pm_reviews', { review_id: id })));
    expect(afterForbidden).toEqual(before.forbidden);
    for (const id of created) {
      expect((await headCount('ai_pm_reviews', { review_id: id }))).toBe(0);
    }
  }, 120_000);
});
