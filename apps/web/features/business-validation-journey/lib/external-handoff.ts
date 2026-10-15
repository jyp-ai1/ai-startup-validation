import { recordExternalAnalysis } from './judgment-development';
import { withCurrentQuestion } from './journey-engine';
import type { AnalysisProvenance, EvidenceKind, JourneyState } from './journey-types';

export const HANDOFF_BOUNDARY = {
  liveModelCall: false,
  apiKeyUsed: false,
  readsAiPage: false,
  verifiedFact: false,
} as const;

export function prepareAnalysisRequest(state: JourneyState, now: string) {
  const executionId = `handoff-${(state.externalNotes?.length ?? 0) + 1}-${now}`;
  return {
    executionId,
    liveModelCall: false as const,
    prompt: renderPrompt(state, executionId, false),
  };
}

export function acceptPastedAnalysis(
  state: JourneyState,
  input: {
    executionId: string;
    text: string;
    providerLabel: string;
    provenance?: AnalysisProvenance;
    evidenceKind?: EvidenceKind;
    sourceLabel?: string;
    citedExcerpt?: string | null;
    now: string;
    failed?: boolean;
  },
): { state: JourneyState; accepted: boolean; reason: string } {
  const result = recordExternalAnalysis(state, input);
  if (!result.accepted) return { state: result.state, accepted: false, reason: result.reason };
  const refreshed = withCurrentQuestion(result.state);
  const comparisons = refreshed.judgmentComparisons ?? [];
  const last = comparisons.at(-1);
  const nextComparisons = last
    ? comparisons.map((item, index) =>
        index === comparisons.length - 1
          ? {
              ...item,
              nextQuestionId: refreshed.nextQuestion?.uncertaintyId ?? null,
              questionSelectionReason: refreshed.nextQuestion?.whyDifferent ?? refreshed.repeatBlockedReason,
            }
          : item,
      )
    : comparisons;
  return {
    state: { ...refreshed, judgmentComparisons: nextComparisons },
    accepted: true,
    reason: result.reason,
  };
}

export function nextHandoffInput(state: JourneyState) {
  const executionId = `handoff-next-${(state.externalNotes?.length ?? 0) + 1}`;
  const answered = state.answers.map((answer) => answer.uncertaintyId);
  return {
    executionId,
    liveModelCall: false as const,
    includesAnswerIds: state.answers.map((answer) => answer.id),
    priorExecutionIds: (state.externalNotes ?? []).map((note) => note.executionId),
    judgmentText: state.judgmentText,
    verifiedFact: false as const,
    prompt: renderPrompt(state, executionId, true),
    alreadyAnswered: answered,
  };
}

function renderPrompt(state: JourneyState, executionId: string, followUp: boolean) {
  const answers = state.answers
    .map((answer) => `${answer.uncertaintyId} ${answer.questionText} 답: ${answer.freeText || answer.choiceLabel}`)
    .join('\n');
  const notes = (state.externalNotes ?? [])
    .map((note) => `${note.executionId} ${note.provenance} ${note.claimStatus} 참고(사실 아님) 실분석 성공 아님: ${note.text}`)
    .join('\n');
  const comparisons = (state.judgmentComparisons ?? [])
    .map((item) => `${item.id} 변경 ${item.judgmentChanged ? '예' : '아니오'}: ${item.reason}`)
    .join('\n');
  const revisions = state.revisions
    .map((revision) => `${revision.field} ${revision.previous} -> ${revision.next}`)
    .join('\n');
  return [
    `실행 ID ${executionId}`,
    'ALABOM이 이 문장을 모델 API나 AI 웹 화면에 보내지 않는다. 사용자가 직접 옮긴다.',
    `고객: ${state.intake.customer}`,
    `문제 가설: ${state.intake.problem}`,
    `지불자: ${state.intake.payer || '미정'}`,
    `수익: ${state.intake.revenue || '미정'}`,
    revisions ? `변경 이력:\n${revisions}` : '변경 이력 없음',
    '고객이 바뀌면 이전 문제 가설을 새 고객의 검증된 문제로 옮기지 않는다.',
    answers ? `이미 답한 질문:\n${answers}` : '이미 답한 질문 없음',
    '이미 답한 질문 ID는 다시 묻지 않는다.',
    notes ? `이전 참고:\n${notes}` : '이전 참고 없음',
    comparisons ? `판단 비교:\n${comparisons}` : '판단 비교 없음',
    state.nextQuestion
      ? `지금 판단을 바꿀 수 있는 질문: ${state.nextQuestion.uncertaintyId} ${state.nextQuestion.prompt}`
      : '추가로 물을 질문이 없다. 판단을 유보한다.',
    followUp
      ? '새 답변이 문제 가설, 지불자 가설, 다음 검증 행동을 바꾸는지 적는다. 동의는 사실 검증이 아니다.'
      : '반대 근거와 부족한 근거를 구분해 적는다. 동의는 사실 검증이 아니다.',
  ].join('\n');
}
