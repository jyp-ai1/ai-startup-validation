import type { JourneyState, RedeliveryRecord } from './journey-types';

const CHANGE_CONDITIONS = [
  '새 캡처 ID가 있을 것',
  '관찰된 고객 행동이 있을 것',
];

const PRESERVE_REASON = '새 캡처 ID가 없다. 직전 판단 유보를 유지한다.';

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

export function buildRedelivery(
  previous: JourneyState | null,
  next: JourneyState,
): RedeliveryRecord {
  const newAnswers = next.answers.slice(previous?.answers.length ?? 0);
  const newRevisions = next.revisions.slice(previous?.revisions.length ?? 0);
  const material =
    newAnswers.some((answer) => answer.material) || newRevisions.some((revision) => revision.material);
  const hypothesisIds = [
    ...new Set([
      ...newAnswers.map((answer) => answer.hypothesisId),
      ...newRevisions.map((revision) => revision.hypothesisId),
    ]),
  ];
  const included = material
    ? next.answers.filter((answer) => hypothesisIds.includes(answer.hypothesisId))
    : [];
  const includedIds = new Set(included.map((answer) => answer.id));
  const changedSincePrevious = [
    ...newAnswers.map((answer) => answer.id),
    ...newRevisions.map((revision) => revision.id),
  ];

  return {
    id: `relay-${next.answers.length}-${next.revisions.length}`,
    reinvestigation: material ? 'required' : 'skipped',
    sent: false,
    reason: reasonFor(previous, material, newAnswers[0]?.delta, newRevisions[0]?.delta),
    summary: next.understanding.inferred[0]?.text ?? '',
    includedAnswerIds: included.map((answer) => answer.id),
    omittedAnswerIds: next.answers.filter((answer) => !includedIds.has(answer.id)).map((answer) => answer.id),
    hypothesisIds,
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
    return {
      accepted: true,
      text: input.previousText,
      reason: '판단 문장이 그대로다.',
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

function reasonFor(
  previous: JourneyState | null,
  material: boolean,
  answerDelta: string | undefined,
  revisionDelta: string | undefined,
): string {
  if (!previous) {
    return '첫 입력은 이해에만 반영한다. 외부 근거가 없어 조사를 열지 않는다.';
  }
  if (!material || answerDelta === 'duplicate' || revisionDelta === 'duplicate') {
    return '같은 내용이라 재조사를 생략한다.';
  }
  if (answerDelta === 'hypothesis_change' || revisionDelta === 'hypothesis_change') {
    return '핵심 가설이 바뀌었다. 관련 이력과 변경분만 재전달 대상으로 추렸다.';
  }
  return '새 답변을 관련 이력과 함께 재전달 대상으로 추렸다.';
}
