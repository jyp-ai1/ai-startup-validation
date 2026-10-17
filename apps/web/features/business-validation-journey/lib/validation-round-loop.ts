import type { AnalysisProvenance, ExternalNote, JourneyState } from './journey-types';
import { compareWebReviews, type WebReviewComparison } from './web-review-comparison';

export type LoopPhase =
  | 'GPT 원문 대기'
  | 'Gemini 원문 대기'
  | 'Founder 검토 대기'
  | '다음 회차 준비 완료'
  | '보류';

/**
 * 피드백 대기는 Founder 검토 대기와 같다.
 * 재조회 준비는 다음 회차가 GPT 원문 대기로 열리는 것이다.
 * 취합 대기는 저장 상태가 아니다. 두 원문이 모두 있을 때만 취합을 기록한다.
 */
export const LOOP_PHASE_NOTE =
  '피드백 대기는 Founder 검토 대기와 같다. 재조회 준비는 다음 회차가 GPT 원문 대기로 열리는 것이다. 취합 결과는 그 회차의 GPT 원문과 Gemini 원문이 모두 있을 때만 기록한다.';

export type LoopRound = {
  projectId: string;
  roundId: string;
  roundNumber: number;
  phase: LoopPhase;
  businessSnapshot: string;
  gptText: string | null;
  geminiText: string | null;
  gptRecordedAt: string | null;
  geminiRecordedAt: string | null;
  provenance: AnalysisProvenance | null;
  aggregation: WebReviewComparison | null;
  unresolvedQuestions: string[];
  founderFeedback: string | null;
  feedbackAt: string | null;
  changesFromPrevious: string[];
  sealed: boolean;
};

export type ValidationLoop = {
  projectId: string;
  liveModelCall: false;
  stopped: boolean;
  rounds: LoopRound[];
};

export type LoopResult = {
  state: JourneyState;
  accepted: boolean;
  reason: string;
};

function projectId(state: JourneyState): string {
  const business = state.intake.business.trim() || 'untitled';
  return `session:${business}`;
}

function intakeSnapshot(state: JourneyState): string {
  return [
    `사업: ${state.intake.business}`,
    `고객: ${state.intake.customer}`,
    `문제: ${state.intake.problem}`,
  ].join('\n');
}

function openQuestions(comparison: WebReviewComparison): string[] {
  const labels = [...comparison.conflict, ...comparison.insufficient]
    .map((line) => line.split(':')[0]?.trim() ?? '')
    .filter((label) => /^[SA]\d/.test(label));
  return [...new Set(labels)];
}

function blankRound(id: string, roundNumber: number, snapshot: string, changes: string[]): LoopRound {
  return {
    projectId: id,
    roundId: `r${roundNumber}`,
    roundNumber,
    phase: 'GPT 원문 대기',
    businessSnapshot: snapshot,
    gptText: null,
    geminiText: null,
    gptRecordedAt: null,
    geminiRecordedAt: null,
    provenance: null,
    aggregation: null,
    unresolvedQuestions: [],
    founderFeedback: null,
    feedbackAt: null,
    changesFromPrevious: changes,
    sealed: false,
  };
}

function withLoop(state: JourneyState, loop: ValidationLoop): JourneyState {
  return { ...state, validationLoop: loop };
}

function replaceRound(loop: ValidationLoop, round: LoopRound): ValidationLoop {
  return {
    ...loop,
    rounds: loop.rounds.map((item) => (item.roundId === round.roundId ? round : item)),
  };
}

export function readValidationLoop(state: JourneyState): ValidationLoop | null {
  return state.validationLoop ?? null;
}

export function openRound(loop: ValidationLoop | null): LoopRound | null {
  if (!loop || loop.stopped) return null;
  return loop.rounds.find((round) => !round.sealed) ?? null;
}

function noteFor(round: LoopRound, slot: 'gpt' | 'gemini', now: string): ExternalNote {
  const text = slot === 'gpt' ? round.gptText ?? '' : round.geminiText ?? '';
  return {
    executionId: `loop-${round.roundId}-${slot}`,
    origin: 'user_paste',
    liveModelCall: false,
    providerLabel: slot === 'gpt' ? 'gpt_web' : 'gemini_web',
    provenance: round.provenance ?? 'user_declared',
    evidenceKind: 'model_claim',
    sourceLabel: `${round.roundId} ${slot === 'gpt' ? 'GPT 웹' : 'Gemini 웹'}`,
    text,
    citedExcerpt: null,
    verifiedFact: false,
    realAnalysisSuccess: false,
    systemVerified: false,
    userDeclaredReal: round.provenance === 'user_declared',
    claimStatus: 'unassessed',
    judgmentChanged: false,
    receivedAt: now,
    questionId: null,
    hypothesisIds: [],
    status: 'reference',
  };
}

function putNote(state: JourneyState, note: ExternalNote): JourneyState {
  const notes = (state.externalNotes ?? []).filter((item) => item.executionId !== note.executionId);
  return { ...state, externalNotes: [...notes, note] };
}

function ensure(state: JourneyState): { state: JourneyState; loop: ValidationLoop; round: LoopRound } {
  const existing = state.validationLoop;
  if (existing) {
    const round = openRound(existing);
    if (!round) {
      return { state, loop: existing, round: existing.rounds[existing.rounds.length - 1] };
    }
    return { state, loop: existing, round };
  }
  const id = projectId(state);
  const round = blankRound(id, 1, intakeSnapshot(state), []);
  const loop: ValidationLoop = { projectId: id, liveModelCall: false, stopped: false, rounds: [round] };
  return { state: withLoop(state, loop), loop, round };
}

export function storeLoopOriginal(
  state: JourneyState,
  input: { slot: 'gpt' | 'gemini'; text: string; now: string; provenance?: AnalysisProvenance },
): LoopResult {
  const text = input.text.trim();
  if (!text) {
    return { state, accepted: false, reason: '원문이 비어 있다. 이전 회차와 판단을 유지한다.' };
  }
  const ready = ensure(state);
  if (ready.loop.stopped || ready.round.sealed) {
    return { state: ready.state, accepted: false, reason: '보류되었거나 닫힌 회차에는 원문을 넣지 않는다.' };
  }
  if (input.slot === 'gemini' && !ready.round.gptText) {
    return {
      state: ready.state,
      accepted: false,
      reason: 'GPT 원문이 없다. Gemini 단계를 완료로 두지 않는다.',
    };
  }

  const provenance = input.provenance ?? 'user_declared';
  let round: LoopRound = { ...ready.round, provenance };
  if (input.slot === 'gpt') {
    round = {
      ...round,
      gptText: text,
      gptRecordedAt: input.now,
      phase: 'Gemini 원문 대기',
    };
  } else {
    round = {
      ...round,
      geminiText: text,
      geminiRecordedAt: input.now,
    };
  }

  if (round.gptText && round.geminiText) {
    const aggregation = compareWebReviews(round.gptText, round.geminiText);
    round = {
      ...round,
      phase: 'Founder 검토 대기',
      aggregation,
      unresolvedQuestions: openQuestions(aggregation),
    };
  } else {
    round = { ...round, aggregation: null, unresolvedQuestions: [] };
  }

  const loop = replaceRound(ready.loop, round);
  const next = putNote(withLoop(ready.state, loop), noteFor(round, input.slot, input.now));
  const reason = round.phase === 'Founder 검토 대기'
    ? `${round.roundId} 두 원문을 취합했다. 사실 상태는 미확인이다. GPT를 다시 조회하지 않았다.`
    : `${round.roundId} ${input.slot === 'gpt' ? 'GPT' : 'Gemini'} 원문을 보관했다. 모델 호출은 없다.`;
  return { state: next, accepted: true, reason };
}

export function reaggregateOpenRound(state: JourneyState): { state: JourneyState; updated: boolean } {
  return { state, updated: false };
}

export function submitRoundFeedback(
  state: JourneyState,
  input: { text: string; now: string },
): LoopResult {
  const text = input.text.trim();
  const loop = state.validationLoop;
  const round = openRound(loop ?? null);
  if (!loop || !round) {
    return { state, accepted: false, reason: '열린 회차가 없다. 피드백으로 조회 완료를 만들지 않는다.' };
  }
  if (round.phase !== 'Founder 검토 대기' || !round.aggregation) {
    return { state, accepted: false, reason: '취합 전이다. 피드백만으로 GPT 재조회나 Gemini 반론을 완료로 두지 않는다.' };
  }
  if (!text) {
    return { state, accepted: false, reason: '피드백이 비어 있다. 회차와 사실 상태를 유지한다.' };
  }

  const sealed: LoopRound = {
    ...round,
    phase: '다음 회차 준비 완료',
    founderFeedback: text,
    feedbackAt: input.now,
    sealed: true,
  };
  const nextRound = blankRound(
    loop.projectId,
    round.roundNumber + 1,
    [
      round.businessSnapshot,
      `이전 회차: ${round.roundId}`,
      `Founder 피드백: ${text}`,
      `미해결 질문: ${round.unresolvedQuestions.join(', ') || '없음'}`,
      '이 입력으로 GPT 웹 조회를 다시 한다. 이전 회차 원문은 유지한다. ALABOM은 이 문장을 모델 API에 보내지 않는다.',
    ].join('\n'),
    [
      `${round.roundId}의 원문과 취합은 유지한다.`,
      'Founder 피드백을 이번 회차 입력에 넣었다.',
      'GPT 원문은 아직 없다.',
    ],
  );
  nextRound.unresolvedQuestions = [...round.unresolvedQuestions];
  const nextLoop: ValidationLoop = {
    ...loop,
    rounds: [...loop.rounds.filter((item) => item.roundId !== round.roundId), sealed, nextRound],
  };
  return {
    state: withLoop(state, nextLoop),
    accepted: true,
    reason: '피드백을 다음 회차 입력에 넣었다. GPT 원문은 아직 없다. 사실 상태는 미확인이다.',
  };
}

export function holdValidationLoop(state: JourneyState, now: string): LoopResult {
  void now;
  const loop = state.validationLoop;
  const round = openRound(loop ?? null);
  if (!loop || !round) {
    return { state, accepted: false, reason: '열린 회차가 없다.' };
  }
  const held: LoopRound = { ...round, phase: '보류', sealed: true };
  return {
    state: withLoop(state, { ...loop, stopped: true, rounds: replaceRound(loop, held).rounds }),
    accepted: true,
    reason: 'Founder가 반복을 보류했다. 새 회차를 만들지 않는다. 검증 완료로 두지 않는다.',
  };
}
