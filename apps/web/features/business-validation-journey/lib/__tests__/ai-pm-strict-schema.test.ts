import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { decisionContractStrictSchemas } from '../ai-pm-decision-contract';
import { experimentBSelectionSchema, experimentBStateSchema } from '../ai-pm-experiment-b';
import {
  buildAnsweredQuestionState,
  buildFirstReviewRequest,
  buildProductReanalysisRequest,
  followUpReflectionSchema,
  judgeStageContract,
  productReanalysisSchema,
  stageReanalysisSchema,
  type StagePair,
} from '../ai-pm-review';
import type { ReviewSections } from '../ai-pm-review-store';
import { strictSchemaIssues } from '../strict-json-schema';

const SCHEMAS = [
  ['stage_reanalysis', stageReanalysisSchema()],
  ['product_reanalysis', productReanalysisSchema()],
  ['reflection_output_11', followUpReflectionSchema()],
  ['experiment_b_state', experimentBStateSchema()],
  ['experiment_b_selection', experimentBSelectionSchema()],
  ...decisionContractStrictSchemas().map((schema, index) => [`decision_contract_${index}`, schema] as const),
] as const;

describe('strict json schema', () => {
  it('lists every property in required on each strict object', () => {
    const issues = SCHEMAS.flatMap(([name, schema]) => strictSchemaIssues(schema).map((issue) => `${name} ${issue.path} ${issue.issue}`));
    expect(issues).toEqual([]);
  });

  it('keeps reaskReason required and nullable on the stage request', () => {
    const request = buildProductReanalysisRequest({
      originalInput: '양조장 체험',
      firstAnalysis: sections(),
      priorTurns: [],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      stagePairs: [pair('q1', '어떤 조사를 할 것인가?', '설문조사 실시')],
    });
    expect(request.responseFormat?.type).toBe('json_schema');
    if (request.responseFormat?.type !== 'json_schema') return;
    expect(strictSchemaIssues(request.responseFormat.schema)).toEqual([]);
    const nextQuestions = request.responseFormat.schema.properties as {
      nextQuestions: { items: { required: string[]; properties: { reaskReason: { type: unknown } } } };
    };
    expect(nextQuestions.nextQuestions.items.required).toEqual([
      'text',
      'choices',
      'verificationPurpose',
      'reaskReason',
      'continuesObjectiveId',
    ]);
    expect(nextQuestions.nextQuestions.items.properties.reaskReason.type).toEqual(['string', 'null']);
    expect(request.messages.find((message) => message.role === 'system')?.content).toContain('reaskReason은 null이다');
    expect(strictSchemaIssues(buildFirstReviewRequest('양조장 체험').responseFormat && buildFirstReviewRequest('양조장 체험').responseFormat?.type === 'json_schema' ? buildFirstReviewRequest('양조장 체험').responseFormat.schema : {})).toEqual([]);
  });

  it('parses reaskReason as null or as a string without treating null as a repeated question', () => {
    const evidence = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json', import.meta.url), 'utf8'),
    ) as {
      calls: Array<{ index: number; response: { content: string }; request: { messages: Array<{ role: string; content: string }> } }>;
    };
    const call = evidence.calls.find((item) => item.index === 2);
    expect(call).toBeTruthy();
    if (!call) return;
    const user = JSON.parse(call.request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      stagePairs: StagePair[];
      doNotCopy: { priorJudgmentText: string; priorUnresolvedIssues: string[] };
    };
    const contract = {
      askedQuestions: user.stagePairs.map((item) => item.question),
      pairs: user.stagePairs,
      closedSentences: user.stagePairs.flatMap((item) => [item.question, item.choiceLabel ?? '', item.supplement]),
      priorJudgmentText: user.doNotCopy.priorJudgmentText,
      priorUnresolved: user.doNotCopy.priorUnresolvedIssues,
    };
    const original = judgeStageContract(call.response.content, contract);
    const body = JSON.parse(call.response.content) as {
      nextQuestions: Array<{ reaskReason?: string | null }>;
    };
    body.nextQuestions = body.nextQuestions.map((item) => ({ ...item, reaskReason: null }));
    const nullable = judgeStageContract(JSON.stringify(body), contract);
    expect(nullable.issues).toEqual(original.issues);
    expect(nullable.sections === null).toBe(original.sections === null);
    expect(nullable.reading?.nextQuestions.every((item) => item.reaskReason === undefined)).toBe(true);
    const reason = '기존 메뉴 선택에는 실행 대상이 없다';
    body.nextQuestions[0]!.reaskReason = reason;
    const stated = judgeStageContract(JSON.stringify(body), contract);
    expect(stated.issues).toEqual(original.issues);
    expect(stated.reading?.nextQuestions[0]?.reaskReason).toBe(reason);
    expect(stated.sections === null).toBe(original.sections === null);
  });

  it('keeps menu, plan, and reported result apart on the answered-question record', () => {
    const menu = buildAnsweredQuestionState([level('q1', '어떤 조사를 할 것인가?', '설문조사 실시', '설문조사 실시')])[0];
    const plan = buildAnsweredQuestionState([level('q1', '조사를 할 것인가?', '설문조사 실시', '100명 대상으로 할 예정')])[0];
    const reported = buildAnsweredQuestionState([
      level('q1', '조사를 했는가?', '설문조사 실시', '관광객 30명을 대상으로 설문을 실시하고 22명이 긍정적으로 응답함.'),
    ])[0];
    expect(menu).toMatchObject({ answerLevel: 'menu_choice', resolution: 'method_selected', verified: false });
    expect(plan).toMatchObject({ answerLevel: 'planned_action', resolution: 'plan_stated', verified: false });
    expect(reported).toMatchObject({ answerLevel: 'reported_result', resolution: 'result_reported', verified: false, answer: { epistemicStatus: 'FOUNDER_CLAIM' } });
  });
});

function sections(): ReviewSections {
  return {
    customer: '전통주를 좋아하는 관광객',
    problem: '체험 연결이 확인되지 않았다',
    market: '전통주 관광',
    revenueModel: '참가비는 가설이다',
    execution: '운영은 구상이다',
    risks: [],
    uncertain: [],
    hypotheses: [],
    judgment: '협력은 아직 확인되지 않았다',
    nextQuestion: '다음에 확인할 것은 무엇인가?',
    nextQuestionReason: '확인된 공급이 없다',
    answerHint: '선택하거나 직접 적습니다.',
    claimConfirmation: null,
  };
}

function pair(questionId: string, question: string, label: string): StagePair {
  return {
    questionId,
    question,
    offeredChoices: [{ choiceId: 'c1', label }],
    choiceId: 'c1',
    choiceLabel: label,
    supplement: label,
    status: 'answered',
  };
}

function level(questionId: string, question: string, choiceLabel: string, supplement: string): StagePair {
  return { ...pair(questionId, question, choiceLabel), supplement };
}
