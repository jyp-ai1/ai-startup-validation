import type { ChatRequest } from '@repo/ai';

/**
 * Decision contract checker. It does not call a model and it does not pick a candidate.
 * A round fails when a fact absent from the current answer is written as an improved judgment.
 */

export const DECISION_CONTRACT_MODEL = 'gpt-4o';

const POSITIVE_ABSENT = ['충분', '충족', '개선'] as const;
const STOP_STEMS = new Set(['대한', '있는', '하는', '이번', '그리고', '그러나', '기타', '직접', '입력', '아직']);
const PARTICLE = /(적인|입니다|합니다|인가|한가|는지|은지|하다|한다|이다|요|다|가|은|는|을|를|이|에|의|와|과|도|만|로|으로)$/u;

const STATE_SYSTEM = [
  '당신은 이번 답의 구간만 변화로 적는다.',
  'currentAnswer에 없는 문장은 변화가 아니다.',
  'span은 currentAnswer의 spanStart부터 spanEnd 직전까지와 같은 문자열이다.',
  '닫힌 질문이 이번 답의 구간으로 갈리지 않으면 unansweredQuestions에 둔다.',
  '선택지를 긍정 사실이나 사업성 개선으로 바꾸지 않는다.',
  'SIMULATION이면 confirmedFacts는 빈 배열이다.',
  '이전 판단의 불확실이 남으면 kept가 그 미확인 id를 가리키고 불확실 또는 미확인을 적는다.',
  '미확인이 남아 있으면 withheld가 유보를 적고 미확인 id를 가리킨다.',
  'added와 modified는 근거 있는 변화 id를 가리킨다.',
  '아이디어와 답에 없는 점포나 접촉은 적지 않는다.',
  '후보와 질문은 만들지 않는다.',
].join('\n');

const SELECTION_SYSTEM = [
  '당신은 근거 있는 변화 id와 미확인 id를 비교해 다음 사업 판단을 하나 고른다.',
  '코드는 후보를 고르지 않는다.',
  'citedIds와 selectionReason에는 장부에 있는 id를 적는다.',
  '다음 질문은 닫힌 질문과 같지 않고, 이전 선택지를 그대로 쓰지 않는다.',
  '답에 없는 사실로 사업성이 개선됐다고 적지 않는다.',
].join('\n');

export type ContractChange = {
  id: string;
  statement: string;
  span: string;
  spanStart: number;
  spanEnd: number;
};

export type ContractQuestion = {
  id: string;
  question: string;
  changeIds: string[];
};

export type ContractUnknown = {
  id: string;
  text: string;
};

export type ContractDelta = {
  kind: 'kept' | 'modified' | 'added' | 'withheld';
  text: string;
  cites: string[];
};

export type DecisionLedger = {
  changes: ContractChange[];
  answeredQuestions: ContractQuestion[];
  unansweredQuestions: ContractQuestion[];
  unconfirmed: ContractUnknown[];
  confirmedFacts: string[];
  delta: ContractDelta[];
  judgmentKept: boolean;
  judgmentText: string;
  answerImpact: string;
};

export type ContractContext = {
  currentAnswer: string;
  originalIdea: string;
  priorAnswers: string[];
  priorJudgment: string;
  closedQuestions: string[];
  priorChoiceLabels: string[][];
  openUncertainties: string[];
  unresolvedMarks: Array<{ text: string; presentInAnswers: boolean }>;
  answerSource: 'simulation' | 'founder';
};

export type ContractVerdict = {
  groundingPass: boolean;
  unknownPass: boolean;
  deltaPass: boolean;
  selectionAllowed: boolean;
  failures: string[];
  groundedChangeIds: string[];
  unknownIds: string[];
};

export type ContractSelection = {
  candidates: Array<{ candidateId: string; judgmentTarget: string; fromNewAnswer: boolean; citedIds: string[] }>;
  selectedCandidateId: string;
  selectionReason: string;
  citedIds: string[];
  nextQuestions: Array<{ text: string; verificationPurpose: string; choices: string[] }>;
};

const GROUNDING = new Set([
  'ledger_format',
  'span_mismatch',
  'ungrounded_choice',
  'unresolved_as_change',
  'positive_without_span',
  'invented_shop_or_contact',
  'duplicate_id',
]);

const UNKNOWN = new Set([
  'simulation_promoted',
  'question_missing',
  'question_both',
  'answered_without_span',
  'unanswered_promoted_positive',
]);

const DELTA = new Set([
  'uncertainty_not_kept',
  'judgment_not_withheld',
  'delta_bad_cite',
  'added_without_change',
  'modified_without_change',
  'withheld_without_unknown',
  'change_not_in_delta',
  'invented_judgment_improvement',
]);

export function evaluateDecisionContract(context: ContractContext, ledger: DecisionLedger | null): ContractVerdict {
  if (!ledger) return verdict(['ledger_format'], [], []);
  const failures: string[] = [];
  const grounded = new Set<string>();
  const seenIds = new Set<string>();
  for (const change of ledger.changes) {
    if (!change.id || seenIds.has(change.id)) failures.push('duplicate_id');
    if (change.id) seenIds.add(change.id);
    if (!spanMatches(context.currentAnswer, change)) {
      failures.push('span_mismatch');
      continue;
    }
    grounded.add(change.id);
    if (matchesAbsentLabel(change.statement, context) && !context.currentAnswer.includes(change.statement)) {
      failures.push('ungrounded_choice');
    }
    if (context.unresolvedMarks.some((mark) => !mark.presentInAnswers && compact(mark.text) === compact(change.statement))) {
      failures.push('unresolved_as_change');
    }
    if (POSITIVE_ABSENT.some((stem) => change.statement.includes(stem) && !change.span.includes(stem))) {
      failures.push('positive_without_span');
    }
  }
  if (inventedPlace([...ledger.changes.map((change) => change.statement), ledger.judgmentText, ledger.answerImpact], context)) {
    failures.push('invented_shop_or_contact');
  }
  const unknownIds = new Set<string>();
  for (const item of [...ledger.unansweredQuestions, ...ledger.unconfirmed]) {
    if (item.id) unknownIds.add(item.id);
  }
  classifyQuestions(context, ledger, grounded, failures);
  if (context.answerSource === 'simulation' && ledger.confirmedFacts.length > 0) failures.push('simulation_promoted');
  const promotedFields = [
    ledger.judgmentText,
    ledger.answerImpact,
    ...ledger.confirmedFacts,
    ...ledger.delta.map((item) => item.text),
    ...ledger.changes.map((change) => change.statement),
  ];
  if (promotesUnanswered(promotedFields, context, ledger)) failures.push('unanswered_promoted_positive');
  classifyDelta(context, ledger, grounded, unknownIds, failures);
  return verdict(failures, [...grounded], [...unknownIds]);
}

export function scoreSelection(
  selection: ContractSelection | null,
  allowedIds: string[],
  closedQuestions: string[],
  priorChoiceLabels: string[][],
): string[] {
  if (!selection) return ['selection_format'];
  const failures: string[] = [];
  const allowed = new Set(allowedIds);
  if (!selection.candidates.some((candidate) => candidate.candidateId === selection.selectedCandidateId)) {
    failures.push('selection_not_in_candidates');
  }
  if (selection.citedIds.length === 0 || selection.citedIds.some((id) => !allowed.has(id))) failures.push('selection_cites_ungrounded');
  if (!selection.citedIds.some((id) => selection.selectionReason.includes(id))) failures.push('selection_reason_missing_id');
  const closed = new Set(closedQuestions.map((question) => compact(question)));
  if (selection.nextQuestions.some((question) => closed.has(compact(question.text)))) failures.push('question_closed_repeat');
  const prior = new Set(priorChoiceLabels.flat().map((label) => compact(label)).filter((label) => label.length > 0));
  if (
    prior.size > 0 &&
    selection.nextQuestions.some((question) => question.choices.length > 0 && question.choices.every((choice) => prior.has(compact(choice))))
  ) {
    failures.push('choices_reused');
  }
  return failures;
}

export function buildStateRequest(input: ContractContext & { priorRisks: string[] }): ChatRequest {
  return {
    model: DECISION_CONTRACT_MODEL,
    temperature: 0.2,
    maxTokens: 1600,
    messages: [
      { role: 'system', content: STATE_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          originalIdea: input.originalIdea,
          priorAnswers: input.priorAnswers,
          currentAnswer: input.currentAnswer,
          answerSource: input.answerSource,
          priorJudgment: input.priorJudgment,
          priorRisks: input.priorRisks,
          openUncertainties: input.openUncertainties,
          closedQuestions: input.closedQuestions,
          priorChoiceLabels: input.priorChoiceLabels,
          unresolvedMarks: input.unresolvedMarks,
          areaOrderIsNotPriority: true,
        }),
      },
    ],
    responseFormat: { type: 'json_schema', schema: stateSchema() },
  };
}

export function buildSelectionRequest(input: {
  ledger: DecisionLedger;
  currentAnswer: string;
  priorRisks: string[];
  closedQuestions: string[];
  priorChoiceLabels: string[][];
}): ChatRequest {
  return {
    model: DECISION_CONTRACT_MODEL,
    temperature: 0.2,
    maxTokens: 1600,
    messages: [
      { role: 'system', content: SELECTION_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          ledger: input.ledger,
          currentAnswer: input.currentAnswer,
          priorRisks: input.priorRisks,
          closedQuestions: input.closedQuestions,
          priorChoiceLabels: input.priorChoiceLabels,
          areaOrderIsNotPriority: true,
        }),
      },
    ],
    responseFormat: { type: 'json_schema', schema: selectionSchema() },
  };
}

export function requestCarriesAnswer(request: ChatRequest, answer: string): boolean {
  if (answer.trim().length === 0) return false;
  const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
  try {
    const parsed = JSON.parse(user) as { currentAnswer?: unknown };
    return parsed.currentAnswer === answer;
  } catch {
    return false;
  }
}

export function parseLedger(raw: string): DecisionLedger | null {
  const row = parseObject(raw);
  if (!row) return null;
  const changes = changesOf(row.changes);
  const answeredQuestions = questionsOf(row.answeredQuestions);
  const unansweredQuestions = questionsOf(row.unansweredQuestions);
  const unconfirmed = unknownsOf(row.unconfirmed);
  const confirmedFacts = stringList(row.confirmedFacts);
  const delta = deltaOf(row.delta);
  const judgmentText = stringField(row.judgmentText);
  const answerImpact = stringField(row.answerImpact);
  if (!changes || !answeredQuestions || !unansweredQuestions || !unconfirmed || !confirmedFacts || !delta) return null;
  if (typeof row.judgmentKept !== 'boolean' || !judgmentText || !answerImpact) return null;
  return { changes, answeredQuestions, unansweredQuestions, unconfirmed, confirmedFacts, delta, judgmentKept: row.judgmentKept, judgmentText, answerImpact };
}

export function parseSelection(raw: string): ContractSelection | null {
  const row = parseObject(raw);
  if (!row) return null;
  const selectedCandidateId = stringField(row.selectedCandidateId);
  const selectionReason = stringField(row.selectionReason);
  const citedIds = stringList(row.citedIds);
  if (!selectedCandidateId || !selectionReason || !citedIds) return null;
  if (!Array.isArray(row.candidates) || row.candidates.length < 2) return null;
  const candidates: ContractSelection['candidates'] = [];
  for (const item of row.candidates) {
    const candidate = parseObject(JSON.stringify(item));
    if (!candidate) return null;
    const candidateId = stringField(candidate.candidateId);
    const judgmentTarget = stringField(candidate.judgmentTarget);
    const candidateCites = stringList(candidate.citedIds);
    if (!candidateId || !judgmentTarget || !candidateCites || typeof candidate.fromNewAnswer !== 'boolean') return null;
    candidates.push({ candidateId, judgmentTarget, fromNewAnswer: candidate.fromNewAnswer, citedIds: candidateCites });
  }
  if (!Array.isArray(row.nextQuestions) || row.nextQuestions.length < 1) return null;
  const nextQuestions: ContractSelection['nextQuestions'] = [];
  for (const item of row.nextQuestions) {
    const question = parseObject(JSON.stringify(item));
    if (!question) return null;
    const text = stringField(question.text);
    const verificationPurpose = stringField(question.verificationPurpose);
    const choices = stringList(question.choices);
    if (!text || !verificationPurpose || !choices || choices.length < 2) return null;
    nextQuestions.push({ text, verificationPurpose, choices });
  }
  return { candidates, selectedCandidateId, selectionReason, citedIds, nextQuestions };
}

function classifyQuestions(context: ContractContext, ledger: DecisionLedger, grounded: Set<string>, failures: string[]): void {
  const answered = new Map(ledger.answeredQuestions.map((item) => [compact(item.question), item]));
  const unanswered = new Map(ledger.unansweredQuestions.map((item) => [compact(item.question), item]));
  for (const question of context.closedQuestions) {
    const key = compact(question);
    const inAnswered = answered.get(key);
    const inUnanswered = unanswered.get(key);
    if (inAnswered && inUnanswered) failures.push('question_both');
    if (!inAnswered && !inUnanswered) failures.push('question_missing');
    if (!inAnswered) continue;
    const labels = labelsFor(question, context);
    const resolved = inAnswered.changeIds.some((id) => {
      if (!grounded.has(id)) return false;
      const change = ledger.changes.find((item) => item.id === id);
      return change ? spanResolves(change.span, labels) : false;
    });
    if (!resolved) failures.push('answered_without_span');
  }
}

function classifyDelta(
  context: ContractContext,
  ledger: DecisionLedger,
  grounded: Set<string>,
  unknownIds: Set<string>,
  failures: string[],
): void {
  const citedChanges = new Set<string>();
  for (const item of ledger.delta) {
    if (item.cites.length === 0 || item.cites.some((id) => !grounded.has(id) && !unknownIds.has(id))) failures.push('delta_bad_cite');
    for (const id of item.cites) if (grounded.has(id)) citedChanges.add(id);
    if ((item.kind === 'added' || item.kind === 'modified') && !item.cites.some((id) => grounded.has(id))) {
      failures.push(item.kind === 'added' ? 'added_without_change' : 'modified_without_change');
    }
    if (item.kind === 'withheld' && !item.cites.some((id) => unknownIds.has(id))) failures.push('withheld_without_unknown');
    if ((item.kind === 'added' || item.kind === 'modified') && POSITIVE_ABSENT.some((stem) => item.text.includes(stem) && !context.currentAnswer.includes(stem))) {
      failures.push('invented_judgment_improvement');
    }
  }
  for (const id of grounded) if (!citedChanges.has(id)) failures.push('change_not_in_delta');
  const kept = ledger.delta.some(
    (item) => item.kind === 'kept' && (item.text.includes('불확실') || item.text.includes('미확인')) && item.cites.some((id) => unknownIds.has(id)),
  );
  if (context.priorJudgment.includes('불확실') && ledger.unansweredQuestions.length > 0 && !kept) failures.push('uncertainty_not_kept');
  const withheld = ledger.delta.some((item) => item.kind === 'withheld' && item.text.includes('유보') && item.cites.some((id) => unknownIds.has(id)));
  if ((ledger.unansweredQuestions.length > 0 || ledger.unconfirmed.length > 0) && !withheld) failures.push('judgment_not_withheld');
  const judgmentFields = [ledger.judgmentText, ledger.answerImpact];
  if (POSITIVE_ABSENT.some((stem) => judgmentFields.some((text) => text.includes(stem) && !context.currentAnswer.includes(stem)))) {
    failures.push('invented_judgment_improvement');
  }
}

function promotesUnanswered(fields: string[], context: ContractContext, ledger: DecisionLedger): boolean {
  for (const item of ledger.unansweredQuestions) {
    const labels = labelsFor(item.question, context);
    const stems = distinctiveStems(labels).filter((stem) => !context.currentAnswer.includes(stem));
    if (stems.length === 0) continue;
    if (fields.some((field) => stems.some((stem) => field.includes(stem)))) return true;
  }
  return false;
}

function spanResolves(span: string, labels: string[]): boolean {
  const stems = distinctiveStems(labels);
  if (stems.length === 0) return false;
  return stems.some((stem) => span.includes(stem));
}

function labelsFor(question: string, context: ContractContext): string[] {
  const key = compact(question);
  const index = context.closedQuestions.findIndex((item) => compact(item) === key);
  return index < 0 ? [] : (context.priorChoiceLabels[index] ?? []);
}

function distinctiveStems(labels: string[]): string[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    for (const stem of stemsOf(label)) counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count === 1).map(([stem]) => stem);
}

function stemsOf(text: string): string[] {
  const stems = new Set<string>();
  for (const chunk of text.split(/[^\uac00-\ud7a3]+/u)) {
    if (chunk.length < 2) continue;
    let stem = chunk;
    for (let pass = 0; pass < 3; pass += 1) {
      const next = stem.replace(PARTICLE, '');
      if (next === stem || next.length < 2) break;
      stem = next;
    }
    if (stem.length >= 2 && !STOP_STEMS.has(stem)) stems.add(stem);
  }
  return [...stems];
}

function matchesAbsentLabel(statement: string, context: ContractContext): boolean {
  const key = compact(statement);
  if (!key) return false;
  const labels = [...context.priorChoiceLabels.flat(), ...context.openUncertainties, context.priorJudgment];
  return labels.some((label) => compact(label) === key);
}

function inventedPlace(fields: string[], context: ContractContext): boolean {
  const source = [context.originalIdea, ...context.priorAnswers, context.currentAnswer].join('\n');
  const written = fields.join('\n');
  return ['점포', '접촉'].some((token) => written.includes(token) && !source.includes(token));
}

function spanMatches(answer: string, change: ContractChange): boolean {
  if (!Number.isInteger(change.spanStart) || !Number.isInteger(change.spanEnd)) return false;
  if (change.spanStart < 0 || change.spanEnd > answer.length || change.spanEnd <= change.spanStart) return false;
  return answer.slice(change.spanStart, change.spanEnd) === change.span && change.span.length > 0;
}

function verdict(failures: string[], groundedChangeIds: string[], unknownIds: string[]): ContractVerdict {
  const unique = [...new Set(failures)];
  const groundingPass = unique.every((item) => !GROUNDING.has(item));
  const unknownPass = unique.every((item) => !UNKNOWN.has(item));
  const deltaPass = unique.every((item) => !DELTA.has(item));
  return {
    groundingPass,
    unknownPass,
    deltaPass,
    selectionAllowed: groundingPass && unknownPass && deltaPass && unique.length === 0,
    failures: unique,
    groundedChangeIds,
    unknownIds,
  };
}

function stateSchema(): Record<string, unknown> {
  const text = { type: 'string' };
  const idList = { type: 'array', items: text };
  return {
    title: 'decision_contract_state',
    type: 'object',
    additionalProperties: false,
    required: ['changes', 'answeredQuestions', 'unansweredQuestions', 'unconfirmed', 'confirmedFacts', 'delta', 'judgmentKept', 'judgmentText', 'answerImpact'],
    properties: {
      changes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'statement', 'span', 'spanStart', 'spanEnd'], properties: { id: text, statement: text, span: text, spanStart: { type: 'integer' }, spanEnd: { type: 'integer' } } } },
      answeredQuestions: { type: 'array', items: questionSchema() },
      unansweredQuestions: { type: 'array', items: questionSchema() },
      unconfirmed: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'text'], properties: { id: text, text } } },
      confirmedFacts: idList,
      delta: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['kind', 'text', 'cites'], properties: { kind: { type: 'string', enum: ['kept', 'modified', 'added', 'withheld'] }, text, cites: idList } } },
      judgmentKept: { type: 'boolean' },
      judgmentText: text,
      answerImpact: text,
    },
  };
}

function questionSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'question', 'changeIds'],
    properties: { id: { type: 'string' }, question: { type: 'string' }, changeIds: { type: 'array', items: { type: 'string' } } },
  };
}

function selectionSchema(): Record<string, unknown> {
  const text = { type: 'string' };
  return {
    title: 'decision_contract_selection',
    type: 'object',
    additionalProperties: false,
    required: ['candidates', 'selectedCandidateId', 'selectionReason', 'citedIds', 'nextQuestions'],
    properties: {
      candidates: {
        type: 'array',
        minItems: 2,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['candidateId', 'judgmentTarget', 'fromNewAnswer', 'citedIds'],
          properties: { candidateId: text, judgmentTarget: text, fromNewAnswer: { type: 'boolean' }, citedIds: { type: 'array', items: text } },
        },
      },
      selectedCandidateId: text,
      selectionReason: text,
      citedIds: { type: 'array', items: text },
      nextQuestions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'verificationPurpose', 'choices'],
          properties: { text, verificationPurpose: text, choices: { type: 'array', minItems: 2, items: text } },
        },
      },
    },
  };
}

function changesOf(value: unknown): ContractChange[] | null {
  if (!Array.isArray(value)) return null;
  const changes: ContractChange[] = [];
  for (const item of value) {
    const row = parseObject(JSON.stringify(item));
    if (!row) return null;
    const id = stringField(row.id);
    const statement = stringField(row.statement);
    const span = typeof row.span === 'string' ? row.span : null;
    if (!id || !statement || span === null || !Number.isInteger(row.spanStart) || !Number.isInteger(row.spanEnd)) return null;
    changes.push({ id, statement, span, spanStart: row.spanStart as number, spanEnd: row.spanEnd as number });
  }
  return changes;
}

function questionsOf(value: unknown): ContractQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const questions: ContractQuestion[] = [];
  for (const item of value) {
    const row = parseObject(JSON.stringify(item));
    if (!row) return null;
    const id = stringField(row.id);
    const question = stringField(row.question);
    const changeIds = stringList(row.changeIds);
    if (!id || !question || !changeIds) return null;
    questions.push({ id, question, changeIds });
  }
  return questions;
}

function unknownsOf(value: unknown): ContractUnknown[] | null {
  if (!Array.isArray(value)) return null;
  const items: ContractUnknown[] = [];
  for (const item of value) {
    const row = parseObject(JSON.stringify(item));
    if (!row) return null;
    const id = stringField(row.id);
    const text = stringField(row.text);
    if (!id || !text) return null;
    items.push({ id, text });
  }
  return items;
}

function deltaOf(value: unknown): ContractDelta[] | null {
  if (!Array.isArray(value)) return null;
  const items: ContractDelta[] = [];
  for (const item of value) {
    const row = parseObject(JSON.stringify(item));
    if (!row) return null;
    const text = stringField(row.text);
    const cites = stringList(row.cites);
    if (!text || !cites || (row.kind !== 'kept' && row.kind !== 'modified' && row.kind !== 'added' && row.kind !== 'withheld')) return null;
    items.push({ kind: row.kind, text, cites });
  }
  return items;
}

function compact(text: string): string {
  return text.replace(/\s+/gu, '').replace(/[?？!！。.,]/gu, '');
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return null;
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

export type EpistemicStatus = 'VERIFIED_FACT' | 'FOUNDER_CLAIM' | 'ASSUMPTION' | 'UNKNOWN';
export type StatementProvenance = 'FOUNDER_INPUT' | 'SIMULATION' | 'EXTERNAL_EVIDENCE' | 'AI_INFERENCE';

const EPISTEMIC_STATUS = new Set<EpistemicStatus>(['VERIFIED_FACT', 'FOUNDER_CLAIM', 'ASSUMPTION', 'UNKNOWN']);
const PROVENANCE = new Set<StatementProvenance>(['FOUNDER_INPUT', 'SIMULATION', 'EXTERNAL_EVIDENCE', 'AI_INFERENCE']);

export type SourcedStatement = {
  text: string;
  epistemicStatus: EpistemicStatus;
  provenance: StatementProvenance;
  spanText?: string | null;
  sourceText?: string | null;
  evidenceId?: string | null;
};

function isEpistemicStatus(value: unknown): value is EpistemicStatus {
  return typeof value === 'string' && EPISTEMIC_STATUS.has(value as EpistemicStatus);
}

function isProvenance(value: unknown): value is StatementProvenance {
  return typeof value === 'string' && PROVENANCE.has(value as StatementProvenance);
}

function simulationText(text: string): boolean {
  return /^\s*SIMULATION\b/u.test(text);
}

/**
 * Separates what the words claim from where the words came from.
 * A span shows the quote exists. It does not verify the business fact.
 * SIMULATION text cannot be relabeled as founder input.
 */
export function settleSavedStatement(input: {
  text: string;
  provenance?: unknown;
  epistemicStatus?: unknown;
  evidenceId?: string | null;
}): { provenance: StatementProvenance; epistemicStatus: EpistemicStatus; evidenceId: string | null } {
  const evidenceId = input.evidenceId?.trim() || null;
  const provenance: StatementProvenance = simulationText(input.text)
    ? 'SIMULATION'
    : isProvenance(input.provenance)
      ? input.provenance
      : 'FOUNDER_INPUT';
  let epistemicStatus: EpistemicStatus = isEpistemicStatus(input.epistemicStatus) ? input.epistemicStatus : 'FOUNDER_CLAIM';
  if (epistemicStatus === 'VERIFIED_FACT' && (provenance !== 'EXTERNAL_EVIDENCE' || !evidenceId)) {
    epistemicStatus = provenance === 'AI_INFERENCE' ? 'ASSUMPTION' : 'FOUNDER_CLAIM';
  }
  return { provenance, epistemicStatus, evidenceId };
}

/** A quote in the source identifies the words. Verification is a separate evidence id. */
export function evaluateSourcedStatement(statement: SourcedStatement): string[] {
  const failures: string[] = [];
  if (statement.spanText && statement.sourceText && !statement.sourceText.includes(statement.spanText)) {
    failures.push('span_not_in_source');
  }
  if (statement.epistemicStatus === 'VERIFIED_FACT') {
    if (statement.provenance !== 'EXTERNAL_EVIDENCE' || !statement.evidenceId) failures.push('span_is_not_verification');
    if (statement.provenance === 'SIMULATION' || statement.provenance === 'FOUNDER_INPUT' || statement.provenance === 'AI_INFERENCE') {
      failures.push('claim_promoted_to_fact');
    }
  }
  if (statement.provenance === 'SIMULATION' && statement.epistemicStatus === 'VERIFIED_FACT') failures.push('simulation_promoted');
  return [...new Set(failures)];
}

export function collapseDuplicateStatements<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of items) {
    const key = item.text.replace(/\s+/g, '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(item);
  }
  return kept;
}
