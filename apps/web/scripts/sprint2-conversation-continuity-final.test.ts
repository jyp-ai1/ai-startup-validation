import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AI_PM_PRODUCT_REANALYSIS_INPUT_TOKEN_BUDGET,
  AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS,
  AI_PM_REVIEW_MODEL,
  judgeStageContract,
  stageReanalysisSchema,
} from '../features/business-validation-journey/lib/ai-pm-review';
import type { StagePair } from '../features/business-validation-journey/lib/ai-pm-review-store';
import { strictSchemaIssues } from '../features/business-validation-journey/lib/strict-json-schema';

const FAILED_ID = '0e75ff46-88fd-4ce2-b567-bdc3f3048531';
const PARENT_ID = '5f6d705d-fe2a-468f-97be-da16482abd32';
const FIRST_ID = '48d06eaa-ad74-4851-a919-fbd8ecefdc1a';
const EVIDENCE_HASH = '6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd';

function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error('repo_root_not_found');
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function userPayload(request: { messages?: Array<{ role?: string; content?: string }> }): Record<string, unknown> | null {
  const content = request.messages?.find((message) => message.role === 'user')?.content ?? '';
  try {
    const value = JSON.parse(content) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function asPairs(value: unknown): StagePair[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const choices = Array.isArray(row.offeredChoices) ? row.offeredChoices : [];
    return [{
      questionId: String(row.questionId ?? ''),
      question: String(row.question ?? ''),
      offeredChoices: choices.flatMap((choice) => {
        if (!choice || typeof choice !== 'object') return [];
        const entry = choice as { choiceId?: unknown; label?: unknown };
        return [{ choiceId: String(entry.choiceId ?? ''), label: String(entry.label ?? '') }];
      }),
      choiceId: typeof row.choiceId === 'string' ? row.choiceId : null,
      choiceLabel: typeof row.choiceLabel === 'string' ? row.choiceLabel : null,
      supplement: String(row.supplement ?? ''),
      status: row.status === 'open' ? 'open' : 'answered',
    }];
  });
}

function inventory(payload: Record<string, unknown> | null) {
  if (!payload) return { json: false };
  const state = Array.isArray(payload.answeredQuestionState) ? payload.answeredQuestionState as Array<Record<string, unknown>> : [];
  const links = Array.isArray(payload.answerLinks) ? payload.answerLinks as Array<Record<string, unknown>> : [];
  const records = Array.isArray(payload.answerRecords) ? payload.answerRecords as Array<Record<string, unknown>> : [];
  const pairs = asPairs(payload.stagePairs);
  const prior = asPairs(payload.priorStagePairs);
  const analyses = Array.isArray(payload.priorAnalyses) ? payload.priorAnalyses : [];
  return {
    json: true,
    originalInputChars: typeof payload.originalInput === 'string' ? payload.originalInput.length : 0,
    priorAnalyses: analyses.length,
    hasFirstAnalysis: Boolean(payload.firstAnalysis),
    hasLatestAnalysis: Boolean(payload.latestAnalysis),
    closedQuestions: Array.isArray(payload.closedQuestions) ? payload.closedQuestions.length : 0,
    priorQuestionTexts: Array.isArray(payload.priorQuestionTexts) ? payload.priorQuestionTexts.length : 0,
    stagePairs: pairs.length,
    priorStagePairs: prior.length,
    supplements: [...prior, ...pairs].filter((pair) => pair.supplement.trim().length > 0).length,
    unlinked: Array.isArray(payload.unlinkedStatements) ? payload.unlinkedStatements.length : 0,
    questionKeyField: JSON.stringify(payload).includes('questionKey'),
    composedKeys: links.map((row) => (
      typeof row.sourceReviewId === 'string' && typeof row.questionId === 'string'
        ? `${row.sourceReviewId}:${row.questionId}`
        : null
    )),
    epistemicStatus: records.map((row) => (typeof row.epistemicStatus === 'string' ? row.epistemicStatus : null)),
    answerLevels: state.map((row) => (typeof row.answerLevel === 'string' ? row.answerLevel : null)),
  };
}

describe('sprint 2 conversation continuity final preparation', () => {
  it('reviews the stored rounds and the current request contract without a model call', () => {
    const root = repoRoot();
    const path = join(root, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json');
    const hashBefore = sha256(readFileSync(path).toString('utf8'));
    const saved = JSON.parse(readFileSync(path, 'utf8')) as {
      rounds: Array<{ round: number; reviewId: string | null; parentReviewId: string | null; status: string; error: string | null; model: string | null; promptTokens: number | null; completionTokens: number | null; totalTokens: number | null }>;
      calls: Array<{ index: number; round: number; sent: boolean; request: { model?: string; responseFormat?: unknown; messages?: Array<{ role?: string; content?: string }> }; response: { id?: string; model?: string; content?: string } | null }>;
    };
    const calls = saved.calls.map((call) => {
      const payload = userPayload(call.request);
      return {
        index: call.index,
        round: call.round,
        sent: call.sent,
        model: call.request.model ?? null,
        responseFormatStored: call.request.responseFormat !== undefined,
        responseId: call.response?.id ?? null,
        responseModel: call.response?.model ?? null,
        inventory: inventory(payload),
      };
    });
    const third = saved.calls.find((call) => call.round === 3);
    const thirdPayload = third ? userPayload(third.request) : null;
    const prior = asPairs(thirdPayload?.priorStagePairs);
    const stage = asPairs(thirdPayload?.stagePairs);
    const asked = [...prior, ...stage].map((pair) => pair.question);
    const judged = third?.response?.content
      ? judgeStageContract(third.response.content, {
          askedQuestions: asked,
          pairs: stage,
          closedSentences: [...prior, ...stage].flatMap((pair) => [pair.question, pair.choiceLabel ?? '', pair.supplement]),
          priorJudgmentText: typeof (thirdPayload?.latestAnalysis as { judgment?: unknown } | undefined)?.judgment === 'string'
            ? String((thirdPayload?.latestAnalysis as { judgment: string }).judgment)
            : undefined,
        })
      : null;
    const schema = stageReanalysisSchema();
    const nextItems = (schema.properties as { nextQuestions?: { items?: { required?: unknown } } }).nextQuestions?.items;
    const report = {
      kind: 'sprint2-conversation-continuity-final',
      at: new Date().toISOString(),
      sprint2: 'PARTIAL',
      gptHttpCalls: 0,
      productionDeploy: false,
      sprint3Started: false,
      screenWork: false,
      evidenceHash: hashBefore,
      parentReviewId: PARENT_ID,
      failedReviewId: FAILED_ID,
      firstReviewId: FIRST_ID,
      rounds: saved.rounds.map((round) => ({
        round: round.round,
        reviewId: round.reviewId,
        parentReviewId: round.parentReviewId,
        status: round.status,
        error: round.error,
        model: round.model,
        promptTokens: round.promptTokens,
        completionTokens: round.completionTokens,
        totalTokens: round.totalTokens,
      })),
      calls,
      currentContract: {
        model: AI_PM_REVIEW_MODEL,
        maxOutputTokens: AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS,
        inputTokenBudget: AI_PM_PRODUCT_REANALYSIS_INPUT_TOKEN_BUDGET,
        schemaTitle: schema.title ?? null,
        schemaIssues: strictSchemaIssues(schema).length,
        nextQuestionRequired: nextItems?.required ?? null,
      },
      failedResponseRejudge: judged
        ? { issues: judged.issues, sectionsNull: judged.sections === null }
        : null,
      grades: {
        originalIdea: 'PASS',
        analysisHistory: 'PASS',
        answerLinks: 'PARTIAL',
        extraComments: 'PASS',
        answerState: 'PARTIAL',
        integratedReanalysis: 'PARTIAL',
        repeatBlock: 'PARTIAL',
        followUpQuestion: 'PARTIAL',
        judgmentUpdate: 'PARTIAL',
        callControl: 'PASS',
        fourRounds: 'NOT RUN',
        durableReread: 'PARTIAL',
        failureIntegrity: 'PASS',
      },
    };
    writeFileSync(join(root, 'docs/evidence/ALABOM/AI-PM/sprint-2-conversation-continuity-final.json'), `${JSON.stringify(report, null, 2)}\n`);
    expect(hashBefore).toBe(EVIDENCE_HASH);
    expect(sha256(readFileSync(path).toString('utf8'))).toBe(EVIDENCE_HASH);
    expect(saved.rounds.find((round) => round.reviewId === FAILED_ID)?.status).toBe('failed');
    expect(saved.rounds.find((round) => round.reviewId === PARENT_ID)?.status).toBe('succeeded');
    expect(report.currentContract.schemaIssues).toBe(0);
    expect(report.gptHttpCalls).toBe(0);
    expect(judged?.sections).toBeNull();
    expect(judged?.issues).toContain('stage_questions_repeated');
  });
});
