import { OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import { AI_PM_FIRST_PROMPT_VERSION, AI_PM_REVIEW_MODEL, readGptApiKey } from './ai-pm-review';

/**
 * Harness-only prompts and scoring.
 * The product follow-up route does not import this module.
 */
export const AI_PM_QUALITY_SIMULATION_VERSION = 'scenario-sim-1';
export const AI_PM_QUALITY_SIMULATION_MAX_TOKENS = 1400;
export const QUALITY_CRITERIA_VERSION = 'rubric-2';
export const BASELINE_PROMPT_VERSION = 'quality-1';

export const BREWERY_QUALITY_BODY =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 개인별 다양한 경험을 중요시하는 관광객 중 전통주와 양조장을 좋아하는 내국인·외국인을 대상으로 양조장 체험을 안내하고, 주변을 즐길 수 있는 사업을 구상 중이다. 이 사업은 양조장의 다양한 온라인 마케팅에서 시행될 수 있어서 이를 지원하려 한다. 위 내용으로 사업성 검토와 추가 질의가 필요한 부분을 안내해 달라.';

/** Frozen first-review system prompt from before quality-2. The product route does not call this. */
export const BASELINE_FIRST_SYSTEM_PROMPT = [
  '당신은 초기 창업자의 사업성 검토를 돕는 전략 파트너다. 요약으로 끝내지 말고 성립 조건과 가장 큰 불확실성을 분석한다.',
  '사실, 추론, 가설을 구분하고 추론과 가설에는 그 말을 붙인다. 정보가 적어도 중단하지 않는다.',
  '고객, 문제, 기존 대안, 가치, 이용자와 지불자, 수익 구조, 운영, 차별화, 경쟁을 검토한다.',
  '가격, 인원, 매출, 시장 규모, 수수료, 참가비, 제휴 확정은 입력에 없으면 사실로 쓰지 않는다. 가능한 수익은 가설이라고 적는다.',
  '분석을 마친 뒤, 한 번의 답으로 불확실성이 가장 많이 줄어드는 미확인 가정 하나만 질문으로 만든다.',
  '모든 사업에 결제 여부를 먼저 묻지 않는다. 높다, 낮다, 미정처럼 정도만 다른 선택지는 만들지 않는다.',
  '선택지는 서로 다른 문제, 고객, 지불자, 운영 방식이어야 한다. 아직 정하지 못한 상태와 기타 / 직접 입력을 포함한다.',
  'JSON만 반환한다. 모델 이름이나 공급사 이름은 쓰지 않는다.',
  '키는 summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices 이다.',
  'summary는 원문을 반영한 설명, judgment는 예비 판단과 근거, nextVerification은 적은 비용의 확인 행동이다. assumptions는 1개에서 3개다.',
].join(' ');

export const KNOWN_FAILURE_A =
  '양조장과의 협력 가능성은 어떻게 되는가? 양조장과의 협력 가능성이 높다. 양조장과의 협력 가능성이 낮다. 양조장과의 협력 여부는 미정이다.';

export const KNOWN_FAILURE_B = '수익 구조는 양조장으로부터의 수수료 및 체험 참가비.';

const CRITERIA = [
  'business_understanding',
  'analysis_coverage',
  'fact_grounding',
  'assumption_quality',
  'question_quality',
  'choice_quality',
  'next_step_quality',
  'context_retention',
  'regression_A',
  'regression_B',
] as const;

export type QualityCriterionId = (typeof CRITERIA)[number];
export type QualityStatus = 'pass' | 'fail' | 'not_run';

const SEMANTIC = new Set<QualityCriterionId>([
  'business_understanding',
  'analysis_coverage',
  'assumption_quality',
  'question_quality',
]);

export type CriterionResult = {
  id: QualityCriterionId;
  kind: 'mechanical' | 'semantic';
  status: QualityStatus;
  evidence: string;
};

export type QualityScenario = {
  id: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
  title: string;
  founderAnswer: string | null;
  expected: string;
  forbidden: string;
  criteriaVersion: typeof QUALITY_CRITERIA_VERSION;
};

export const QUALITY_SCENARIOS: QualityScenario[] = [
  {
    id: 'S1',
    title: '최초 사업 설명',
    founderAnswer: null,
    expected: '고객, 문제, 가치, 차별점, 수익 가설, 시장·운영 리스크, 핵심 가정, 저비용 검증, 그 가정에서 나온 첫 질문.',
    forbidden: '협력 가능성을 높다/낮다로만 묻기. 원문에 없는 수수료·참가비를 사실로 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S2',
    title: '양조장 제휴 미확보',
    founderAnswer: '아직 협력 양조장이 없다.',
    expected: '공급 확보와 파일럿 가능성을 우선한다.',
    forbidden: '제휴 가능성을 높음/낮음으로만 다시 묻기. 제휴 확정.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S3',
    title: '양조장 참여 의향 확보',
    founderAnswer: '양조장 3곳이 참여 의사를 밝혔다.',
    expected: '참여 의사와 확정 계약, 실제 체험 제공을 구분한다.',
    forbidden: '3곳 참여를 검증된 공급으로 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S4',
    title: '고객 관심은 있으나 유료 검증 없음',
    founderAnswer: '관심은 있을 것 같지만 실제 유료 고객은 없다.',
    expected: '관심과 지불 의사를 나누고 저비용 유료 실험을 제안한다.',
    forbidden: '유료 고객이 이미 있다고 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S5',
    title: '외국인 개별 관광객 우선',
    founderAnswer: '외국인 개별 관광객을 우선 고객으로 생각한다.',
    expected: '언어, 예약 접근성, 이동, 체험 이해도, 고객 획득 경로를 가설로 본다.',
    forbidden: '외국인 수요가 확인된 사실이라고 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S6',
    title: '수익모델 미확정',
    founderAnswer: '수수료, 체험 참가비, 마케팅 서비스 비용 중 무엇이 적절한지 아직 모른다.',
    expected: '수익 후보를 가설로 나누고 누가 무엇에 지불할지 검증하게 한다.',
    forbidden: '수수료나 참가비를 기존 사실로 단정하기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S7',
    title: '양조장이 비용 지불을 거부',
    founderAnswer: '양조장들은 마케팅 비용을 지불할 의사가 없다고 답했다.',
    expected: '기존 수익 가설을 재검토하고 관광객 지불, 공공·지역 파트너십을 가설로 비교한다.',
    forbidden: '대안 수익이 이미 확보된 것처럼 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
  {
    id: 'S8',
    title: '수요·공급 근거가 상충',
    founderAnswer: '관광객 수요는 있을 것 같지만 공급과 운영 가능성은 아직 확인하지 못했다.',
    expected: '수요와 공급·운영을 별도 가정으로 나누고 더 위험한 가정부터 검증한다.',
    forbidden: '양쪽이 확인된 사실이라고 쓰기.',
    criteriaVersion: QUALITY_CRITERIA_VERSION,
  },
];

export type QualityRun = {
  id: QualityScenario['id'];
  title: string;
  criteriaVersion: typeof QUALITY_CRITERIA_VERSION;
  promptVersion: string | null;
  model: string | null;
  requestedAt: string | null;
  status: QualityStatus;
  source: 'model' | 'injected_chat' | 'not_called';
  error: string | null;
  criteria: CriterionResult[];
  requestText: string | null;
  raw: string | null;
};

type ReviewChat = (request: ChatRequest) => Promise<ChatResponse>;

export function simulationSystemPrompt(): string {
  return [
    '이 요청은 품질 시뮬레이션이다. 제품의 후속 검토 경로가 아니다.',
    `프롬프트 버전 ${AI_PM_QUALITY_SIMULATION_VERSION}.`,
    '이전 분석과 창업자 답을 함께 읽는다. 창업자 답은 검증된 사실이 아니라 현재 주장이다.',
    '그 답 때문에 달라진 판단과 달라지지 않은 판단을 나눈다. 확인되지 않은 가정은 가설로 적는다.',
    '이미 한 질문을 반복하지 않는다. 결제 여부나 제휴 여부만 다시 묻지 않는다. 협력 가능성을 높다, 낮다, 미정으로만 묻지 않는다.',
    '선택지는 서로 다른 갈림길 3개에서 5개이고, 마지막은 기타 / 직접 입력이다.',
    '적은 비용으로 할 확인 행동 하나를 적는다. 입력에 없는 가격, 인원, 매출, 시장 규모, 수수료, 참가비는 사실로 쓰지 않는다.',
    'JSON만 반환한다. 키는 founderClaim, changed, unchanged, priority, cheapExperiment, nextQuestion, choices 이다.',
  ].join(' ');
}

export function buildBaselineFirstRequest(text: string): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: 2400,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: BASELINE_FIRST_SYSTEM_PROMPT },
      { role: 'user', content: firstUserContent(text) },
    ],
  };
}

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
          criteriaVersion: QUALITY_CRITERIA_VERSION,
          businessText: input.businessText,
          previousSummary: input.previousSummary,
          previousQuestion: input.previousQuestion,
          founderAnswer: input.founderAnswer,
        }),
      },
    ],
  };
}

/** Mechanical rules plus semantic items left not_run. String search does not pass semantic quality. */
export function evaluateQualityText(input: {
  scenario: QualityScenario;
  raw: string | null;
  sourceText?: string;
  previousQuestion?: string;
}): { status: QualityStatus; error: string | null; criteria: CriterionResult[] } {
  if (input.raw == null) {
    return { status: 'not_run', error: null, criteria: blankCriteria('모델 호출 없음') };
  }
  const raw = input.raw.trim();
  if (!raw) {
    return { status: 'fail', error: 'empty_response', criteria: blankCriteria('빈 응답', 'fail') };
  }
  const sourceText = input.sourceText ?? BREWERY_QUALITY_BODY;
  const criteria = CRITERIA.map((id) => scoreCriterion(id, raw, input.scenario, sourceText, input.previousQuestion ?? ''));
  const parsed = parseLoose(raw);
  const error = parsed ? null : 'parse_failed';
  return { status: combineStatus(criteria, error), error, criteria };
}

export function liveModelAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(readGptApiKey(env));
}

/** Multi-turn simulation chat. Separate from the one-call product review client. */
export function openQualitySimulationChat(env: Record<string, string | undefined> = process.env): ReviewChat | undefined {
  const apiKey = readGptApiKey(env);
  if (!apiKey) return undefined;
  return (request) => new OpenAIProviderAdapter({ apiKey }).chat(request);
}

/**
 * One baseline S1, one current S1, then S2–S8.
 * Without a chat function every row is not_run. This does not call the product follow-up route.
 */
export async function executeQualityMatrix(input: {
  chat?: ReviewChat;
  source?: 'model' | 'injected_chat';
  now?: () => string;
  businessText?: string;
  currentFirstRequest: ChatRequest;
}): Promise<QualityRun[]> {
  const businessText = input.businessText ?? BREWERY_QUALITY_BODY;
  const now = input.now ?? (() => new Date().toISOString());
  if (!input.chat) {
    return [
      notCalled('S1', BASELINE_PROMPT_VERSION),
      notCalled('S1', AI_PM_FIRST_PROMPT_VERSION),
      ...QUALITY_SCENARIOS.filter((scenario) => scenario.id !== 'S1').map((scenario) => notCalled(scenario.id, AI_PM_QUALITY_SIMULATION_VERSION)),
    ];
  }
  const source = input.source ?? 'model';
  const baseline = await runCall({
    chat: input.chat,
    request: buildBaselineFirstRequest(businessText),
    scenario: scenarioById('S1'),
    promptVersion: BASELINE_PROMPT_VERSION,
    source,
    now,
    businessText,
  });
  const current = await runCall({
    chat: input.chat,
    request: input.currentFirstRequest,
    scenario: scenarioById('S1'),
    promptVersion: AI_PM_FIRST_PROMPT_VERSION,
    source,
    now,
    businessText,
  });
  const previous = readPrevious(current.raw);
  const turns: QualityRun[] = [];
  for (const scenario of QUALITY_SCENARIOS) {
    if (scenario.id === 'S1' || !scenario.founderAnswer) continue;
    if (!previous) {
      turns.push({
        ...notCalled(scenario.id, AI_PM_QUALITY_SIMULATION_VERSION),
        error: 'previous_analysis_missing',
        source,
      });
      continue;
    }
    turns.push(
      await runCall({
        chat: input.chat,
        request: buildScenarioSimulationRequest({
          businessText,
          previousQuestion: previous.question,
          previousSummary: previous.summary,
          founderAnswer: scenario.founderAnswer,
        }),
        scenario,
        promptVersion: AI_PM_QUALITY_SIMULATION_VERSION,
        source,
        now,
        businessText,
        previousQuestion: previous.question,
      }),
    );
  }
  return [baseline, current, ...turns];
}

function firstUserContent(text: string): string {
  return `사업 입력:\n${text}\n\n키: summary, customer, problem, value, operatingModel, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.\n검토 목적, 현재 단계, 가장 알고 싶은 것이 있으면 질문과 판단을 그 목적에 맞춘다. 원문에 없는 수익 항목은 가설로 적는다.`;
}

function scenarioById(id: QualityScenario['id']): QualityScenario {
  const found = QUALITY_SCENARIOS.find((scenario) => scenario.id === id);
  if (!found) throw new Error(`missing scenario ${id}`);
  return found;
}

function notCalled(id: QualityScenario['id'], promptVersion: string): QualityRun {
  const scenario = scenarioById(id);
  return {
    id,
    title: scenario.title,
    criteriaVersion: QUALITY_CRITERIA_VERSION,
    promptVersion,
    model: null,
    requestedAt: null,
    status: 'not_run',
    source: 'not_called',
    error: null,
    criteria: blankCriteria('모델 호출 없음'),
    requestText: null,
    raw: null,
  };
}

async function runCall(input: {
  chat: ReviewChat;
  request: ChatRequest;
  scenario: QualityScenario;
  promptVersion: string;
  source: 'model' | 'injected_chat';
  now: () => string;
  businessText: string;
  previousQuestion?: string;
}): Promise<QualityRun> {
  const requestedAt = input.now();
  const requestText = input.request.messages.map((message) => message.content).join('\n');
  try {
    const response = await input.chat(input.request);
    const raw = response.content ?? '';
    const evaluated = evaluateQualityText({
      scenario: input.scenario,
      raw,
      sourceText: input.businessText,
      previousQuestion: input.previousQuestion,
    });
    return {
      id: input.scenario.id,
      title: input.scenario.title,
      criteriaVersion: QUALITY_CRITERIA_VERSION,
      promptVersion: input.promptVersion,
      model: response.model || input.request.model,
      requestedAt,
      status: evaluated.status,
      source: input.source,
      error: evaluated.error,
      criteria: evaluated.criteria,
      requestText,
      raw,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'model_error';
    return {
      id: input.scenario.id,
      title: input.scenario.title,
      criteriaVersion: QUALITY_CRITERIA_VERSION,
      promptVersion: input.promptVersion,
      model: input.request.model,
      requestedAt,
      status: 'fail',
      source: input.source,
      error: message.slice(0, 300),
      criteria: blankCriteria('모델 오류', 'fail'),
      requestText,
      raw: null,
    };
  }
}

function readPrevious(raw: string | null): { summary: string; question: string } | null {
  if (!raw) return null;
  const parsed = parseLoose(raw);
  if (!parsed) return null;
  const summary = textField(parsed.summary);
  const question = textField(parsed.nextQuestion);
  if (!summary || !question) return null;
  return { summary, question };
}

function combineStatus(criteria: CriterionResult[], error: string | null): QualityStatus {
  if (error) return 'fail';
  if (criteria.some((item) => item.status === 'fail')) return 'fail';
  if (criteria.some((item) => item.status === 'not_run')) return 'not_run';
  return 'pass';
}

function blankCriteria(evidence: string, status: QualityStatus = 'not_run'): CriterionResult[] {
  return CRITERIA.map((id) => ({
    id,
    kind: SEMANTIC.has(id) ? 'semantic' : 'mechanical',
    status,
    evidence,
  }));
}

function scoreCriterion(
  id: QualityCriterionId,
  raw: string,
  scenario: QualityScenario,
  sourceText: string,
  previousQuestion: string,
): CriterionResult {
  if (SEMANTIC.has(id)) {
    return {
      id,
      kind: 'semantic',
      status: 'not_run',
      evidence: '문자열 검색으로 의미 품질을 통과시키지 않는다.',
    };
  }
  if (id === 'regression_A') return regressionA(raw);
  if (id === 'regression_B') return regressionB(raw, sourceText);
  if (id === 'fact_grounding') return factGrounding(raw, sourceText);
  if (id === 'choice_quality') return choiceQuality(raw);
  if (id === 'next_step_quality') return nextStep(raw);
  return contextRetention(raw, scenario, previousQuestion);
}

function regressionA(raw: string): CriterionResult {
  const hit = raw.match(/협력 가능성[^.。\n]{0,80}(높다|낮다|미정)/);
  const degrees = ['높다', '낮다', '미정'].filter((word) => raw.includes(word));
  if (hit || (degrees.length >= 3 && /협력/.test(raw))) {
    return { id: 'regression_A', kind: 'mechanical', status: 'fail', evidence: quote(raw, hit?.[0] ?? '협력') };
  }
  return { id: 'regression_A', kind: 'mechanical', status: 'pass', evidence: '협력 가능성의 높다/낮다/미정 고착이 응답에 없다.' };
}

function regressionB(raw: string, sourceText: string): CriterionResult {
  const terms = ['수수료', '참가비', '체험 참가비'].filter((term) => raw.includes(term) && !sourceText.includes(term));
  if (terms.length === 0) {
    return { id: 'regression_B', kind: 'mechanical', status: 'pass', evidence: '원문에 없는 수수료·참가비를 응답이 단정하지 않았다.' };
  }
  const unhedged = terms.filter((term) => !mentionsAreHedged(raw, term));
  const evidence = terms.map((term) => excerptAround(raw, term)).join(' ');
  if (unhedged.length > 0) return { id: 'regression_B', kind: 'mechanical', status: 'fail', evidence };
  return { id: 'regression_B', kind: 'mechanical', status: 'pass', evidence };
}

function mentionsAreHedged(raw: string, term: string): boolean {
  let from = 0;
  let seen = false;
  while (from < raw.length) {
    const at = raw.indexOf(term, from);
    if (at < 0) break;
    seen = true;
    const window = raw.slice(Math.max(0, at - 40), at + term.length + 40);
    if (!/가설|제안|확인되지|원문에 없|단정하지|모르|미정|아직|의사|주장/.test(window)) return false;
    from = at + term.length;
  }
  return seen;
}

function factGrounding(raw: string, sourceText: string): CriterionResult {
  if (/확정된 사실|사실로 확인|제휴가 확정|계약이 체결/.test(raw)) {
    return { id: 'fact_grounding', kind: 'mechanical', status: 'fail', evidence: quote(raw, /확정된 사실|사실로 확인|제휴가 확정|계약이 체결/) };
  }
  const figure = raw.match(/[1-9]\d*\s*(?:억|만)\s*원?/);
  if (figure && !sourceText.includes(figure[0].replace(/\s/g, ''))) {
    return { id: 'fact_grounding', kind: 'mechanical', status: 'fail', evidence: figure[0] };
  }
  const fee = regressionB(raw, sourceText);
  if (fee.status === 'fail') return { id: 'fact_grounding', kind: 'mechanical', status: 'fail', evidence: fee.evidence };
  return { id: 'fact_grounding', kind: 'mechanical', status: 'pass', evidence: '기계 규칙에서 확정 단정과 원문에 없는 수치가 보이지 않는다.' };
}

function choiceQuality(raw: string): CriterionResult {
  const labels = readChoiceLabels(raw);
  const substantive = labels.filter((label) => !/기타|직접 입력/.test(label));
  const polarity = regressionA(raw).status === 'fail';
  if (polarity || substantive.length < 3 || substantive.length > 5 || !labels.some((label) => /기타|직접 입력/.test(label))) {
    return {
      id: 'choice_quality',
      kind: 'mechanical',
      status: 'fail',
      evidence: labels.join(' | ') || quote(raw, /선택|높다|낮다|미정|질문/),
    };
  }
  return { id: 'choice_quality', kind: 'mechanical', status: 'pass', evidence: labels.join(' | ') };
}

function nextStep(raw: string): CriterionResult {
  const hit = raw.match(/실험|파일럿|확인|제안|인터뷰/);
  if (!hit) return { id: 'next_step_quality', kind: 'mechanical', status: 'fail', evidence: '저비용 확인 행동 표현이 응답에 없다.' };
  return { id: 'next_step_quality', kind: 'mechanical', status: 'pass', evidence: quote(raw, hit[0]) };
}

function contextRetention(raw: string, scenario: QualityScenario, previousQuestion: string): CriterionResult {
  if (!scenario.founderAnswer) {
    return { id: 'context_retention', kind: 'mechanical', status: 'not_run', evidence: '최초 분석에는 이전 창업자 답이 없다.' };
  }
  if (previousQuestion && raw.includes(previousQuestion)) {
    return { id: 'context_retention', kind: 'mechanical', status: 'fail', evidence: previousQuestion };
  }
  const needle = scenario.founderAnswer.slice(0, 12);
  if (!raw.includes(needle)) {
    return { id: 'context_retention', kind: 'mechanical', status: 'fail', evidence: `창업자 답의 앞부분이 응답에 없다: ${needle}` };
  }
  return { id: 'context_retention', kind: 'mechanical', status: 'pass', evidence: excerptAround(raw, needle) };
}

function readChoiceLabels(raw: string): string[] {
  const parsed = parseLoose(raw);
  const choices = parsed?.choices;
  if (!Array.isArray(choices)) return [];
  return choices.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function parseLoose(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function textField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function quote(raw: string, pattern: RegExp | string): string {
  const found = typeof pattern === 'string' ? raw.indexOf(pattern) : raw.search(pattern);
  if (found < 0) return raw.slice(0, 180);
  return raw.slice(found, found + 180).replace(/\s+/g, ' ');
}

function excerptAround(raw: string, needle: string): string {
  const at = raw.indexOf(needle);
  if (at < 0) return needle;
  return raw.slice(Math.max(0, at - 30), at + needle.length + 50).replace(/\s+/g, ' ');
}
