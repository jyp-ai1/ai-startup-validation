import { NOT_ESTABLISHED, UNREVIEWED_HYPOTHESIS } from './founder-source';
import { planAnswerEffect } from './plan-journey';
import { shortIdeaAnswerEffect } from './short-idea-review';
import type {
  AnalysisProvenance,
  EvidenceKind,
  ExternalNote,
  FounderAnswer,
  HypothesisJudgment,
  JudgmentComparison,
  JourneyState,
  ModelClaimStatus,
} from './journey-types';

export type ClaimReading = 'supports_problem' | 'contradicts_problem' | 'unrelated';

const NOT_VALIDATED = '검증된 사실이 아니다. 사업성 판단은 유보한다.';

export function readClaim(text: string): ClaimReading {
  if (/문제는 없|문제가 없|이미 한 화면|발생하지 않|해당하지 않/.test(text)) return 'contradicts_problem';
  if (/(주문|배송|발주)/.test(text) && /(누락|분리|나뉘)/.test(text)) return 'supports_problem';
  return 'unrelated';
}

export function recordExternalAnalysis(
  state: JourneyState,
  input: {
    executionId: string;
    text: string;
    provenance?: AnalysisProvenance;
    evidenceKind?: EvidenceKind;
    sourceLabel?: string;
    providerLabel?: string;
    citedExcerpt?: string | null;
    now: string;
    failed?: boolean;
  },
): { state: JourneyState; accepted: boolean; reason: string; comparison: JudgmentComparison } {
  const text = input.text.trim();
  const executionId = input.executionId.trim();
  const sourceLabel = (input.sourceLabel ?? input.providerLabel ?? '').trim();
  const provenance = input.provenance ?? 'test_fixture';
  const evidenceKind = input.evidenceKind ?? 'model_claim';
  const notes = state.externalNotes ?? [];

  const missing: string[] = [];
  if (input.failed || !text) missing.push('원문');
  if (!executionId) missing.push('실행 ID');
  if (!sourceLabel) missing.push('출처');
  if (missing.length > 0) {
    return reject(
      state,
      input.now,
      executionId || null,
      provenance,
      sourceLabel || null,
      text,
      `빠진 항목: ${missing.join(', ')}. 실제 분석 성공으로 기록하지 않고 이전 판단을 유지한다.`,
      missing,
    );
  }
  if (notes.some((note) => note.executionId === executionId)) {
    return reject(state, input.now, executionId, provenance, sourceLabel, text, '같은 실행 ID의 문장은 다시 보관하지 않는다. 이전 판단과 원문을 유지한다.', []);
  }

  const reading = readClaim(text);
  const excerpt = input.citedExcerpt?.trim() || null;
  const founderIds = founderEvidenceIds(state);
  const conflict = isConflict(state, reading);
  const independent = (evidenceKind === 'order_record' || evidenceKind === 'interview_verbatim') && Boolean(excerpt);
  const claimStatus: ModelClaimStatus = reading === 'unrelated' ? 'unassessed' : 'CLAIM';
  const judgmentChanged = conflict || (independent && reading !== 'unrelated');
  const nextJudgmentText = judgmentChanged
    ? developedJudgment(executionId, reading, conflict, evidenceKind)
    : state.judgmentText;
  const hypothesisIds = ['h-customer', 'h-problem'];
  const affected = reading === 'unrelated' ? [] : ['h-problem'];
  const reason = reasonForReading(reading, conflict, independent, evidenceKind, executionId);
  const userDeclaredReal = provenance === 'user_declared';
  const comparison = comparisonBase({
    id: `cmp-${notes.length + 1}-${input.now}`,
    executionId,
    kind: 'external_analysis',
    provenance,
    userDeclaredReal,
    originalSecured: true,
    sourceLabel,
    originalText: text,
    hypothesisIds,
    receivedAt: input.now,
    previousJudgmentText: state.judgmentText,
    nextJudgmentText,
    judgmentChanged,
    claimStatus,
    affectedHypothesisIds: affected,
    evidenceIds: conflict ? founderIds : excerpt ? [executionId] : [],
    reason,
    uncertaintyId: state.nextQuestion?.uncertaintyId ?? null,
    uncertaintyResolved: false,
    nextQuestionId: null,
    questionSelectionReason: null,
  });
  const note: ExternalNote = {
    executionId,
    origin: 'user_paste',
    liveModelCall: false,
    providerLabel: input.providerLabel?.trim() || sourceLabel,
    provenance,
    evidenceKind,
    sourceLabel,
    text,
    citedExcerpt: excerpt,
    verifiedFact: false,
    realAnalysisSuccess: false,
    systemVerified: false,
    userDeclaredReal,
    claimStatus,
    judgmentChanged,
    receivedAt: input.now,
    questionId: state.nextQuestion?.uncertaintyId ?? null,
    hypothesisIds,
    status: 'reference',
  };
  const hypothesisJudgments = judgmentChanged
    ? mergeProblem(state.hypothesisJudgments ?? [], conflict ? 'held' : reading === 'supports_problem' ? 'supported' : 'contradicted', comparison.id, executionId, nextJudgmentText, reason)
    : state.hypothesisJudgments;

  return {
    accepted: true,
    reason,
    comparison,
    state: {
      ...state,
      judgmentText: nextJudgmentText,
      judgmentStatus: 'judgment_deferred',
      judgmentHoldReason: reason,
      hypothesisJudgments,
      externalNotes: [...notes, note],
      judgmentComparisons: [...(state.judgmentComparisons ?? []), comparison],
    },
  };
}

export function compareFounderAnswer(before: JourneyState, after: JourneyState, answer: FounderAnswer): JourneyState {
  const planEffect = planAnswerEffect(answer);
  const shortEffect = planEffect ? null : shortIdeaAnswerEffect(answer, after.intake);
  const answerEffect = planEffect ?? shortEffect;
  const resolved = answerEffect ? false : uncertaintyResolved(answer);
  let nextText = after.judgmentText;
  let judgmentChanged = false;
  let reason = resolved
    ? `${answer.uncertaintyId}에 대한 답은 기록했다. 창업자 진술이라 사업 판단 문장을 바꾸지 않는다. ${NOT_VALIDATED}`
    : `${answer.uncertaintyId}에 대한 답은 기존 불확실성을 해소하지 않는다. 같은 질문을 반복하지 않고 판단 문장은 유지한다.`;
  let stance: HypothesisJudgment['stance'] | null = null;
  let affected: string[] = [];
  if (answerEffect) {
    judgmentChanged = answerEffect.judgmentChanged;
    nextText = answerEffect.judgmentChanged ? answerEffect.nextText : after.judgmentText;
    reason = answerEffect.reason;
    stance = answerEffect.held ? 'held' : null;
    affected = answerEffect.affected;
  } else if (answer.uncertaintyId === 'u-customer-scope' && answer.choiceId === 'does_not_apply') {
    judgmentChanged = true;
    nextText = `「${after.intake.customer}」에게 기존 문제 가설이 해당하지 않는다는 창업자 진술이다. 그 진술을 검증된 사실로 올리지 않는다. ${NOT_VALIDATED}`;
    reason = nextText;
    stance = 'contradicted';
  }
  const comparison = comparisonBase({
    id: `cmp-answer-${answer.id}`,
    executionId: null,
    kind: 'founder_answer',
    provenance: null,
    userDeclaredReal: false,
    originalSecured: Boolean(answer.freeText || answer.choiceLabel),
    sourceLabel: 'founder_answer',
    originalText: answer.freeText || answer.choiceLabel,
    hypothesisIds: [answer.hypothesisId],
    receivedAt: answer.receivedAt,
    previousJudgmentText: before.judgmentText,
    nextJudgmentText: nextText,
    judgmentChanged,
    claimStatus: 'CLAIM',
    affectedHypothesisIds: affected.length > 0 ? affected : judgmentChanged ? ['h-problem'] : [],
    evidenceIds: [answer.id],
    reason,
    uncertaintyId: answer.uncertaintyId,
    uncertaintyResolved: resolved,
    nextQuestionId: after.nextQuestion?.uncertaintyId ?? null,
    questionSelectionReason: after.nextQuestion?.whyDifferent ?? after.repeatBlockedReason,
  });
  const hypothesisJudgments = stance
    ? mergeProblem(after.hypothesisJudgments ?? [], stance, comparison.id, answer.id, nextText, reason)
    : after.hypothesisJudgments;
  return {
    ...after,
    judgmentText: nextText,
    judgmentHoldReason: reason,
    hypothesisJudgments,
    judgmentComparisons: [...(after.judgmentComparisons ?? []), comparison],
  };
}

export function compareCustomerChange(before: JourneyState, after: JourneyState): JourneyState {
  const revision = after.revisions.at(-1);
  if (!revision?.material || revision.field !== 'customer') return after;
  const nextText = `고객이 「${revision.previous}」에서 「${revision.next}」로 바뀌었다. 이전 문제 가설은 새 고객의 검증된 문제가 아니다. 적용 범위를 다시 연다. ${NOT_VALIDATED}`;
  const reason = `고객 변경으로 h-problem의 적용 범위를 다시 연다. 「${revision.previous}」에 대해 남긴 근거를 「${revision.next}」의 검증된 문제로 옮기지 않는다.`;
  const comparison = comparisonBase({
    id: `cmp-${revision.id}`,
    executionId: null,
    kind: 'customer_change',
    provenance: null,
    userDeclaredReal: false,
    originalSecured: true,
    sourceLabel: 'founder_revision',
    originalText: `${revision.previous} -> ${revision.next}`,
    hypothesisIds: ['h-customer', 'h-problem'],
    receivedAt: revision.receivedAt,
    previousJudgmentText: before.judgmentText,
    nextJudgmentText: nextText,
    judgmentChanged: true,
    claimStatus: null,
    affectedHypothesisIds: ['h-customer', 'h-problem'],
    evidenceIds: (before.externalNotes ?? []).map((note) => note.executionId),
    reason,
    uncertaintyId: 'h-customer',
    uncertaintyResolved: false,
    nextQuestionId: after.nextQuestion?.uncertaintyId ?? null,
    questionSelectionReason: after.nextQuestion?.whyDifferent ?? null,
  });
  return {
    ...after,
    judgmentText: nextText,
    judgmentHoldReason: reason,
    judgmentComparisons: [...(after.judgmentComparisons ?? []), comparison],
  };
}

function reject(
  state: JourneyState,
  now: string,
  executionId: string | null,
  provenance: AnalysisProvenance,
  sourceLabel: string | null,
  text: string,
  reason: string,
  missing: string[],
): { state: JourneyState; accepted: boolean; reason: string; comparison: JudgmentComparison } {
  return {
    state,
    accepted: false,
    reason,
    comparison: comparisonBase({
      id: `cmp-rejected-${now}`,
      executionId,
      kind: 'rejected',
      provenance,
      userDeclaredReal: false,
      originalSecured: Boolean(text),
      sourceLabel,
      originalText: text || null,
      hypothesisIds: [],
      receivedAt: now,
      previousJudgmentText: state.judgmentText,
      nextJudgmentText: state.judgmentText,
      judgmentChanged: false,
      claimStatus: null,
      affectedHypothesisIds: [],
      evidenceIds: [],
      reason,
      uncertaintyId: state.nextQuestion?.uncertaintyId ?? null,
      uncertaintyResolved: false,
      nextQuestionId: state.nextQuestion?.uncertaintyId ?? null,
      questionSelectionReason: state.nextQuestion?.whyDifferent ?? null,
      missing,
    }),
  };
}

function developedJudgment(executionId: string, reading: ClaimReading, conflict: boolean, evidenceKind: EvidenceKind): string {
  if (conflict) {
    return `실행 ${executionId}의 문장은 창업자가 남긴 근거와 충돌한다. 두 문장을 모두 남긴다. 어느 쪽도 검증된 사실이 아니다. 문제 가설은 유보한다.`;
  }
  const direction = reading === 'supports_problem' ? '문제 가설과 같은 방향' : '문제 가설과 어긋나는 방향';
  return `실행 ${executionId}의 ${evidenceKind} 발췌는 ${direction}의 주장이다. 대상 가설은 h-problem이다. CLAIM이며 ${NOT_VALIDATED} 문장이 바뀐 것만으로 판단이 개선된 것은 아니다.`;
}

function reasonForReading(
  reading: ClaimReading,
  conflict: boolean,
  independent: boolean,
  evidenceKind: EvidenceKind,
  executionId: string,
): string {
  if (conflict) return `실행 ${executionId}가 기존 근거와 충돌한다. 가설은 held이고 검증된 사실로 올리지 않는다.`;
  if (reading === 'unrelated') return '이 문장은 문제 가설, 지불자 가설, 다음 검증을 바꾸지 않는다. 미평가로 남긴다.';
  if (!independent) return `출처가 ${evidenceKind}이다. CLAIM으로 남기고 가설 태도와 판단 문장은 바꾸지 않는다. 근거와 가설의 연결은 검토하지 않았다.`;
  return `실행 ${executionId}의 발췌가 h-problem 서술을 바꾼다. CLAIM이며 검증된 사실은 아니다. 연결이 정당하다고 평가하지 않았다.`;
}

function isConflict(state: JourneyState, reading: ClaimReading): boolean {
  const problem = (state.hypothesisJudgments ?? []).find((item) => item.hypothesisId === 'h-problem');
  const founderSupports = founderSupportsProblem(state);
  if (reading === 'contradicts_problem' && (founderSupports || problem?.stance === 'supported')) return true;
  if (reading === 'supports_problem' && problem?.stance === 'contradicted') return true;
  return false;
}

function founderSupportsProblem(state: JourneyState): boolean {
  return state.answers.some(
    (answer) =>
      answer.material &&
      answer.uncertaintyId === 'u-evidence' &&
      answer.choiceId !== 'unknown' &&
      answer.grade !== 'unknown' &&
      answer.grade !== 'no_evidence',
  );
}

function founderEvidenceIds(state: JourneyState): string[] {
  return state.answers.filter((answer) => answer.material).map((answer) => answer.id);
}

function uncertaintyResolved(answer: FounderAnswer): boolean {
  if (answer.choiceId === 'unknown' || answer.choiceId === 'no_scene' || answer.choiceId === 'cannot') return false;
  if (answer.grade === 'unknown' || answer.grade === 'no_evidence') return false;
  return true;
}

function mergeProblem(
  prior: HypothesisJudgment[],
  stance: HypothesisJudgment['stance'],
  sourceId: string,
  causeId: string,
  after: string,
  reason: string,
): HypothesisJudgment[] {
  const previous = prior.find((item) => item.hypothesisId === 'h-problem');
  const judgment: HypothesisJudgment = {
    hypothesisId: 'h-problem',
    before: previous?.after ?? UNREVIEWED_HYPOTHESIS,
    after,
    stance,
    causeId,
    sourceId,
    reason,
    verifiedFact: false,
    notEstablished: [...NOT_ESTABLISHED],
  };
  const next = prior.filter((item) => item.hypothesisId !== 'h-problem');
  next.push(judgment);
  return next;
}

function comparisonBase(
  input: Omit<JudgmentComparison, 'liveVerified' | 'realAnalysisSuccess' | 'verifiedFact' | 'validated' | 'systemVerified' | 'improvementAssessed' | 'linkJustified' | 'missing'> & {
    missing?: string[];
  },
): JudgmentComparison {
  return {
    ...input,
    missing: input.missing ?? [],
    liveVerified: false,
    realAnalysisSuccess: false,
    verifiedFact: false,
    validated: false,
    systemVerified: false,
    improvementAssessed: false,
    linkJustified: false,
  };
}
