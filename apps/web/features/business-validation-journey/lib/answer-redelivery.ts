import { contextRoleLabel } from './present-execution';
import {
  payerLabel,
  revenueLabel,
  type ContextItem,
  type ContextRole,
  type JourneyState,
  type RedeliveryRecord,
} from './journey-types';

const CHANGE_CONDITIONS = ['새 캡처 ID가 있을 것', '관찰된 고객 행동이 있을 것'];

const PRESERVE_REASON = '새 캡처 ID가 없다. 직전 판단 유보를 유지한다.';

const CORE_FIELDS = ['customer', 'problem', 'solution', 'payer', 'revenue'] as const;

export type PageCapture = {
  id: string;
  url: string;
  excerpt: string;
  pageHash: string;
};

export type ModelCallFixture = {
  providerId: string;
  endpoint: string | null;
  modelId: string | null;
  executed: boolean;
  liveCall: boolean;
  captureId?: string | null;
};

export function buildRedelivery(previous: JourneyState | null, next: JourneyState): RedeliveryRecord {
  const newAnswers = next.answers.slice(previous?.answers.length ?? 0);
  const newRevisions = next.revisions.slice(previous?.revisions.length ?? 0);
  const material =
    newAnswers.some((answer) => answer.material) || newRevisions.some((revision) => revision.material);
  const changeClass = classifyChange(previous, material, newAnswers[0]?.delta, newRevisions[0]?.delta);
  const changedSincePrevious = [
    ...newAnswers.map((answer) => answer.id),
    ...newRevisions.map((revision) => revision.id),
  ];
  const items = material ? contextItems(next, newRevisions, changeClass) : omittedOriginals(next);
  const required = requiredRoles(next);
  const readiness = contextReady(
    items,
    changeClass === 'core_hypothesis_change' || changeClass === 'new_claim' || changeClass === 'wording_edit'
      ? required
      : [],
  );
  const inputReady = material && readiness.ready;
  const includedAnswers = items.filter((item) => item.disposition === 'included' && item.role === 'answer');
  const omittedAnswers = items.filter((item) => item.disposition === 'omitted' && item.role === 'answer');

  return {
    id: `relay-${next.answers.length}-${next.revisions.length}`,
    reinvestigation: material ? 'required' : 'skipped',
    changeClass,
    sent: false,
    inputReady,
    inputGap: inputReady ? null : readiness.gap,
    reason: reasonFor(changeClass, inputReady, readiness.gap),
    summary: next.understanding.inferred[0]?.text ?? '',
    items,
    includedAnswerIds: includedAnswers.map((item) => item.id),
    omittedAnswerIds: omittedAnswers.map((item) => item.id),
    hypothesisIds: [
      ...new Set(items.filter((item) => item.disposition === 'included').map((item) => item.hypothesisId)),
    ],
    unknownIds: next.understanding.unknown.map((item) => item.id),
    contradictionIds: next.understanding.contradictions.map((item) => item.id),
    evidenceIds: [],
    changedSincePrevious,
    changeConditions: CHANGE_CONDITIONS,
    researchStatus: 'research_not_run',
    counterReviewStatus: 'counter_review_not_run',
    judgmentChange: 'preserved',
    preserveReason: PRESERVE_REASON,
  };
}

export function contextReady(
  items: ContextItem[],
  requiredRoles: ContextRole[],
): { ready: boolean; gap: string | null } {
  const included = new Set(
    items.filter((item) => item.disposition === 'included').map((item) => item.role),
  );
  const missing = requiredRoles.filter((role) => !included.has(role));
  if (missing.length === 0) return { ready: requiredRoles.length > 0, gap: null };
  return {
    ready: false,
    gap: `관련 맥락이 부족하다. 빠진 역할: ${missing.join(', ')}. 모델 입력을 만들지 않는다.`,
  };
}

export function addCapture(
  existing: PageCapture[],
  next: PageCapture,
): { captures: PageCapture[]; added: boolean; reason: string } {
  if (existing.some((capture) => capture.pageHash === next.pageHash)) {
    return {
      captures: existing,
      added: false,
      reason: '같은 페이지 해시는 새 근거로 세지 않는다.',
    };
  }
  return {
    captures: [...existing, next],
    added: true,
    reason: '새 캡처를 근거 목록에 넣었다. 판단 확정은 아니다.',
  };
}

export function proposeJudgmentChange(input: {
  previousText: string;
  nextText: string;
  causeIds: string[];
}): { accepted: boolean; text: string; reason: string } {
  if (input.nextText === input.previousText) {
    return { accepted: true, text: input.previousText, reason: '판단 문장이 그대로다.' };
  }
  if (/검증된 사실이다|VALIDATED/.test(input.nextText)) {
    return {
      accepted: false,
      text: input.previousText,
      reason: '창업자 진술이나 모델 문장을 검증된 사실로 올리지 않는다.',
    };
  }
  if (input.causeIds.length === 0) {
    return {
      accepted: false,
      text: input.previousText,
      reason: '원인 ID가 없어 직전 판단을 유지한다.',
    };
  }
  return {
    accepted: true,
    text: input.nextText,
    reason: '원인 ID가 있는 문장 변경이다. 검증된 사실은 아니다.',
  };
}

export function classifyResearch(call: ModelCallFixture): 'research_not_run' | 'research_completed' {
  if (!call.executed || !call.liveCall || !call.captureId) return 'research_not_run';
  if (call.providerId !== 'openrouter') return 'research_not_run';
  if (call.modelId !== 'google/gemini-2.5-flash') return 'research_not_run';
  if (call.endpoint !== 'https://openrouter.ai/api/v1/chat/completions') return 'research_not_run';
  return 'research_completed';
}

export function classifyCounterReview(
  call: ModelCallFixture,
): 'counter_review_not_run' | 'counter_review_completed' {
  if (!call.executed || !call.liveCall) return 'counter_review_not_run';
  if (!call.modelId || call.modelId.includes('gemini')) return 'counter_review_not_run';
  if (call.providerId !== 'openai') return 'counter_review_not_run';
  if (call.modelId !== 'gpt-4o-mini') return 'counter_review_not_run';
  if (call.endpoint !== 'https://api.openai.com/v1/chat/completions') return 'counter_review_not_run';
  return 'counter_review_completed';
}

function contextItems(
  state: JourneyState,
  revisions: JourneyState['revisions'],
  changeClass: RedeliveryRecord['changeClass'],
): ContextItem[] {
  const items: ContextItem[] = [];
  for (const field of CORE_FIELDS) {
    const text = fieldText(state, field);
    if (!text) continue;
    items.push({
      id: `intake:${field}`,
      hypothesisId: hypothesisFor(field),
      role: field,
      text,
      disposition: 'included',
      reason: coreReason(field, changeClass),
      relevance: changeClass === 'core_hypothesis_change' ? 'unconfirmed' : 'kept',
    });
  }
  for (const revision of revisions) {
    items.push({
      id: revision.id,
      hypothesisId: revision.hypothesisId,
      role: revision.field === 'business' ? 'business' : revision.field,
      text: `이전: 「${revision.previous}」 이후: 「${revision.next}」`,
      disposition: 'included',
      reason:
        changeClass === 'core_hypothesis_change'
          ? '바뀐 문장과 직전 문장을 함께 둔다. 이전 가설이 새 고객에게 그대로 맞는지 확인하지 않았다.'
          : '바뀐 문장과 직전 문장을 함께 둔다.',
      relevance: changeClass === 'core_hypothesis_change' ? 'unconfirmed' : 'kept',
    });
  }
  for (const answer of state.answers) {
    items.push({
      id: answer.id,
      hypothesisId: answer.hypothesisId,
      role: 'answer',
      text: `${answer.questionText} ${answer.choiceLabel} ${answer.freeText}`.trim(),
      disposition: answer.material ? 'included' : 'omitted',
      reason: answerReason(answer.material, changeClass),
      relevance: changeClass === 'core_hypothesis_change' && answer.material ? 'unconfirmed' : 'kept',
    });
  }
  return items;
}

function omittedOriginals(state: JourneyState): ContextItem[] {
  return state.answers.map((answer) => ({
    id: answer.id,
    hypothesisId: answer.hypothesisId,
    role: 'answer' as const,
    text: answer.choiceLabel,
    disposition: 'omitted' as const,
    reason: '재조사를 열지 않아 모델 입력에서 뺀다. 원본 이력에는 남아 있다.',
    relevance: 'kept' as const,
  }));
}

function requiredRoles(state: JourneyState): ContextRole[] {
  return CORE_FIELDS.filter((field) => Boolean(fieldText(state, field)));
}

function fieldText(state: JourneyState, field: (typeof CORE_FIELDS)[number]): string {
  if (field === 'payer') return payerLabel(state.intake.payer);
  if (field === 'revenue') return revenueLabel(state.intake.revenue);
  return state.intake[field].trim();
}

function hypothesisFor(field: (typeof CORE_FIELDS)[number]): string {
  if (field === 'revenue') return 'h-revenue';
  return `h-${field}`;
}

function coreReason(field: (typeof CORE_FIELDS)[number], changeClass: RedeliveryRecord['changeClass']): string {
  if (changeClass === 'core_hypothesis_change') {
    return `${contextRoleLabel(field)} 문장은 바뀐 고객과의 관련성을 아직 확인하지 않았다. 다시 보기 위해 남긴다. 그대로 유효하다고 보지 않는다.`;
  }
  return `${contextRoleLabel(field)} 가설을 새 답의 맥락으로 함께 둔다.`;
}

function answerReason(material: boolean, changeClass: RedeliveryRecord['changeClass']): string {
  if (!material) return '같은 진술의 반복이라 모델 입력에서 뺀다. 원본 이력에는 남아 있다.';
  if (changeClass === 'core_hypothesis_change') {
    return '이 답은 바뀐 고객과 아직 맞춰 보지 않았다. 관련 맥락으로만 남긴다.';
  }
  return '이 답은 고객·문제·해결책·지불자 가설을 다시 볼 때 함께 둔다.';
}

function classifyChange(
  previous: JourneyState | null,
  material: boolean,
  answerDelta: string | undefined,
  revisionDelta: string | undefined,
): RedeliveryRecord['changeClass'] {
  if (!previous || !material || answerDelta === 'duplicate' || revisionDelta === 'duplicate') return 'none';
  if (answerDelta === 'hypothesis_change' || revisionDelta === 'hypothesis_change') {
    return 'core_hypothesis_change';
  }
  if (answerDelta === 'detail_added') return 'wording_edit';
  return 'new_claim';
}

function reasonFor(
  changeClass: RedeliveryRecord['changeClass'],
  inputReady: boolean,
  gap: string | null,
): string {
  if (changeClass === 'none') {
    return '첫 입력이거나 같은 내용이라 재조사를 생략한다.';
  }
  if (!inputReady) return gap ?? '관련 맥락이 부족해 모델 입력을 만들지 않는다.';
  if (changeClass === 'core_hypothesis_change') {
    return '핵심 가설이 바뀌었다. 고객·문제·해결책·지불자·수익과 관련 답을 함께 골랐다.';
  }
  if (changeClass === 'wording_edit') {
    return '표현이 늘었다. 그 답과 사업 가설을 함께 골랐다. 가설 자체는 바꾸지 않았다.';
  }
  return '새 답변과 사업 가설을 함께 골랐다.';
}
