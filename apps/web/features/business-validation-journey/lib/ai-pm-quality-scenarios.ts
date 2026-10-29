import { OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import { AI_PM_FIRST_PROMPT_VERSION, AI_PM_REVIEW_MODEL, readGptApiKey } from './ai-pm-review';
import type { ReviewSections } from './ai-pm-review-store';

/**
 * Harness-only prompt for scenario turns.
 * The product follow-up route does not use this request.
 */
export const AI_PM_QUALITY_SIMULATION_VERSION = 'scenario-sim-1';
export const AI_PM_QUALITY_SIMULATION_MAX_TOKENS = 1400;

export const BREWERY_QUALITY_BODY =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 개인별 다양한 경험을 중요시하는 관광객 중 전통주와 양조장을 좋아하는 내국인·외국인을 대상으로 양조장 체험을 안내하고, 주변을 즐길 수 있는 사업을 구상 중이다. 이 사업은 양조장의 다양한 온라인 마케팅에서 시행될 수 있어서 이를 지원하려 한다. 위 내용으로 사업성 검토와 추가 질의가 필요한 부분을 안내해 달라.';

export type QualityStatus = 'pass' | 'fail' | 'not_run';

export type QualityCheck = {
  status: QualityStatus;
  failures: string[];
};

export type BreweryScenario = {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  title: string;
  founderAnswer: string;
  /** At least one pattern in each group must appear in the turn. */
  required: RegExp[][];
  forbidden: RegExp[];
};

export const BREWERY_SCENARIOS: BreweryScenario[] = [
  {
    id: 'A',
    title: '제휴 미확보',
    founderAnswer: '아직 협력 양조장이 없다.',
    required: [[/공급|파일럿|확보|제휴처|참여할 양조장/]],
    forbidden: [/제휴가 확정/, /계약이 체결/],
  },
  {
    id: 'B',
    title: '제휴 확보',
    founderAnswer: '양조장 3곳이 참여 의사를 밝혔다.',
    required: [[/운영|체험 상품|예약/], [/의사|가설|미확인|주장/]],
    forbidden: [/제휴가 확정/, /계약이 체결/],
  },
  {
    id: 'C',
    title: '고객 수요 미검증',
    founderAnswer: '관심은 있을 것 같지만 유료 고객은 없다.',
    required: [[/관심/], [/지불|유료/], [/실험|제안|가격|파일럿/]],
    forbidden: [/유료 고객이 있다/, /매출이 발생/],
  },
  {
    id: 'D',
    title: '외국인 중심',
    founderAnswer: '외국인 개별 관광객을 우선 공략한다.',
    required: [[/언어|예약|이동|이해/], [/가설|미확인|주장|우선/]],
    forbidden: [/외국인 수요가 확인됐다/],
  },
  {
    id: 'E',
    title: '수익모델 미확정',
    founderAnswer: '수수료, 체험비, 마케팅비 중 무엇을 받을지 아직 정하지 못했다.',
    required: [[/지불|수수료|체험|마케팅/], [/가설|미정|정하지/]],
    forbidden: [/수수료로 확정/, /참가비가 확정/],
  },
  {
    id: 'F',
    title: '근거가 모호함',
    founderAnswer: '시장이 클 것 같다.',
    required: [[/근거|증거|확인/], [/가설|추정|미확인/]],
    forbidden: [/시장이 크다\./, /시장 규모는 크다/],
  },
  {
    id: 'G',
    title: '부정적 피드백',
    founderAnswer: '양조장이 비용 지불을 원하지 않는다.',
    required: [[/수익|가설/], [/대안|다른|관광객|체험/]],
    forbidden: [/수수료가 확정/, /지불이 확인됐다/],
  },
  {
    id: 'H',
    title: '상충하는 답변',
    founderAnswer: '관광객은 원할 것 같지만 양조장 참여는 불확실하다.',
    required: [[/관광객/], [/양조장/], [/순서|병목|먼저/]],
    forbidden: [/양쪽이 확정/],
  },
];

export type ScenarioTurn = {
  founderClaim: string;
  changed: string;
  unchanged: string;
  priority: string;
  cheapExperiment: string;
  nextQuestion: string;
  choices: string[];
};

type ReviewChat = (request: ChatRequest) => Promise<ChatResponse>;

export function simulationSystemPrompt(): string {
  return [
    '이 요청은 품질 시뮬레이션이다. 제품의 후속 검토 경로가 아니다.',
    `프롬프트 버전 ${AI_PM_QUALITY_SIMULATION_VERSION}.`,
    '이전 분석과 창업자 답을 함께 읽는다. 창업자 답은 검증된 사실이 아니라 현재 주장이다.',
    '그 답 때문에 달라진 판단과 달라지지 않은 판단을 나눈다. 확인되지 않은 가정은 가설로 적는다.',
    '이미 한 질문을 반복하지 않는다. 결제 여부나 제휴 여부만 다시 묻지 않는다.',
    '선택지는 서로 다른 갈림길 3개에서 5개이고, 마지막은 기타 / 직접 입력이다. 높다, 낮다, 미정만으로 만들지 않는다.',
    '적은 비용으로 할 확인 행동 하나를 적는다. 입력에 없는 가격, 인원, 매출, 시장 규모는 만들지 않는다.',
    'JSON만 반환한다. 키는 founderClaim, changed, unchanged, priority, cheapExperiment, nextQuestion, choices 이다.',
  ].join(' ');
}

/** Simulation request. Callers must not send this to the product follow-up route. */
export function buildScenarioSimulationRequest(input: {
  businessText: string;
  previousQuestion: string;
  previousSummary: string;
  founderAnswer: string;
}): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_QUALITY_SIMULATION_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: simulationSystemPrompt() },
      {
        role: 'user',
        content: JSON.stringify({
          promptVersion: AI_PM_QUALITY_SIMULATION_VERSION,
          businessText: input.businessText,
          previousSummary: input.previousSummary,
          previousQuestion: input.previousQuestion,
          founderAnswer: input.founderAnswer,
        }),
      },
    ],
  };
}

export function parseScenarioTurn(content: string): ScenarioTurn | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const choices = Array.isArray(parsed.choices)
      ? parsed.choices.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
      : [];
    const turn: ScenarioTurn = {
      founderClaim: text(parsed.founderClaim),
      changed: text(parsed.changed),
      unchanged: text(parsed.unchanged),
      priority: text(parsed.priority),
      cheapExperiment: text(parsed.cheapExperiment),
      nextQuestion: text(parsed.nextQuestion),
      choices,
    };
    if (!turn.founderClaim || !turn.changed || !turn.unchanged || !turn.priority || !turn.cheapExperiment || !turn.nextQuestion) {
      return null;
    }
    if (choices.length < 2) return null;
    return turn;
  } catch {
    return null;
  }
}

export function evaluateFirstAnalysis(sourceText: string, sections: ReviewSections | null): QualityCheck {
  const failures: string[] = [];
  const analysis = sections?.analysis;
  if (!sections || !analysis) return { status: 'fail', failures: ['missing_analysis'] };
  if (!/양조장/.test(analysis.summary) || !/체험|관광|마케팅/.test(analysis.summary)) failures.push('thin_summary');
  for (const [name, value] of [
    ['customer', sections.customer],
    ['problem', sections.problem],
    ['value', analysis.value],
    ['revenue', sections.revenueModel],
    ['market', sections.market],
    ['operations', analysis.operations],
    ['judgment', analysis.judgmentDetail],
  ] as const) {
    if (!value.trim()) failures.push(`missing_${name}`);
  }
  if (sections.risks.length === 0) failures.push('missing_risks');
  if (analysis.assumptions.length < 1 || analysis.assumptions.length > 3) failures.push('assumption_count');
  if (!analysis.nextVerification?.trim()) failures.push('missing_verification');
  if (unsourcedFeeAsFact(sections.revenueModel, sourceText) || unsourcedFeeAsFact(analysis.payer, sourceText)) {
    failures.push('unsourced_revenue_as_fact');
  }
  if (/[1-9]\d*(?:억|만)/.test(`${sections.market} ${analysis.profitability}`) && !/원문에 없는 수치|가설|확인되지/.test(`${sections.market} ${analysis.profitability}`)) {
    failures.push('invented_figure');
  }
  if (/가장 가까운 결제 후보/.test(sections.nextQuestion)) failures.push('fixed_payment_question');
  failures.push(...choiceFailures(analysis.choices.map((choice) => choice.label)));
  return { status: failures.length === 0 ? 'pass' : 'fail', failures };
}

export function evaluateScenarioTurn(input: {
  scenario: BreweryScenario;
  previousQuestion: string;
  turn: ScenarioTurn | null;
}): QualityCheck {
  if (!input.turn) return { status: 'fail', failures: ['unparsed_turn'] };
  const turn = input.turn;
  const failures: string[] = [];
  const blob = [turn.founderClaim, turn.changed, turn.unchanged, turn.priority, turn.cheapExperiment, turn.nextQuestion].join('\n');
  if (turn.nextQuestion.trim() === input.previousQuestion.trim()) failures.push('repeated_question');
  if (promotesClaim(blob)) failures.push('answer_promoted_to_fact');
  for (const group of input.scenario.required) {
    if (!group.some((pattern) => pattern.test(blob))) failures.push(`missing_topic_${input.scenario.id}_${group.map(String).join('|')}`);
  }
  for (const pattern of input.scenario.forbidden) {
    if (pattern.test(blob)) failures.push(`forbidden_${pattern}`);
  }
  failures.push(...choiceFailures(turn.choices));
  if (!turn.cheapExperiment.trim()) failures.push('missing_experiment');
  return { status: failures.length === 0 ? 'pass' : 'fail', failures };
}

export type ScenarioExecution = {
  id: BreweryScenario['id'];
  title: string;
  status: QualityStatus;
  source: 'model' | 'not_called';
  model: string | null;
  promptVersion: string;
  failures: string[];
  raw: string | null;
};

/** Runs the simulation model only when a chat function is passed. Does not call the product follow-up. */
export async function executeBreweryScenarios(input: {
  chat?: ReviewChat;
  previousQuestion: string;
  previousSummary: string;
  businessText?: string;
}): Promise<ScenarioExecution[]> {
  const businessText = input.businessText ?? BREWERY_QUALITY_BODY;
  const runs: ScenarioExecution[] = [];
  for (const scenario of BREWERY_SCENARIOS) {
    if (!input.chat) {
      runs.push({
        id: scenario.id,
        title: scenario.title,
        status: 'not_run',
        source: 'not_called',
        model: null,
        promptVersion: AI_PM_QUALITY_SIMULATION_VERSION,
        failures: [],
        raw: null,
      });
      continue;
    }
    const request = buildScenarioSimulationRequest({
      businessText,
      previousQuestion: input.previousQuestion,
      previousSummary: input.previousSummary,
      founderAnswer: scenario.founderAnswer,
    });
    const response = await input.chat(request);
    const raw = response.content ?? '';
    const evaluation = evaluateScenarioTurn({
      scenario,
      previousQuestion: input.previousQuestion,
      turn: parseScenarioTurn(raw),
    });
    runs.push({
      id: scenario.id,
      title: scenario.title,
      status: evaluation.status,
      source: 'model',
      model: response.model || request.model,
      promptVersion: AI_PM_QUALITY_SIMULATION_VERSION,
      failures: evaluation.failures,
      raw,
    });
  }
  return runs;
}

export function liveModelAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(readGptApiKey(env));
}

/** Multi-turn simulation chat. Separate from openReviewChat, which stops after one product call. */
export function openQualitySimulationChat(env: Record<string, string | undefined> = process.env): ReviewChat | undefined {
  const apiKey = readGptApiKey(env);
  if (!apiKey) return undefined;
  return (request) => new OpenAIProviderAdapter({ apiKey }).chat(request);
}

function choiceFailures(labels: string[]): string[] {
  const failures: string[] = [];
  const substantive = labels.filter((label) => !/기타|직접 입력/.test(label));
  if (substantive.length < 3 || substantive.length > 5) failures.push('choice_count');
  if (!labels.some((label) => /기타|직접 입력/.test(label))) failures.push('missing_other');
  const degree = substantive.filter((label) => /높다|낮다|미정/.test(label));
  if (degree.length >= 3) failures.push('polarity_choices');
  return failures;
}

function unsourcedFeeAsFact(value: string, sourceText: string): boolean {
  const terms = ['수수료', '참가비', '이용료', '구독료'].filter((term) => value.includes(term) && !sourceText.includes(term));
  if (terms.length === 0) return false;
  return !/가설|확인되지|원문에 없/.test(value);
}

function promotesClaim(text: string): boolean {
  return /확정된 사실|사실로 확인|검증이 끝/.test(text);
}
