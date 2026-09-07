/**
 * DAY 8-G G-4 — Judgment aggregation (presentation layer).
 * Reads V3 living + turns; never writes gapState.
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  emptyCeoJudgmentState,
  type CeoJudgmentDimension,
  type CeoJudgmentDimensionId,
  type CeoJudgmentState,
  type CeoJudgmentStatus,
} from './ai-pm-ceo-judgment-dimensions';
import { extractDimensionSummaries } from './ai-pm-dimension-extract';
import { finalizeJudgmentPresentation } from './ai-pm-judgment-conclusion';
import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';
import {
  isDocumentEchoSummary,
  isInferenceRiskAnswer,
  isPartialUnknownAnswer,
  isVagueOrUnknownAnswer,
} from './ai-pm-judgment-target-binding';
import {
  buildJudgmentTraceEntries,
  classifyJudgmentChangeType,
  type JudgmentTraceEntry,
} from './ai-pm-judgment-trace';
import { mergeDimensionAccumulative } from './ai-pm-judgment-accumulative-merge';
import { isAiPmJudgmentMeaningModelV1Active } from './ai-pm-judgment-meaning-model-v1';
import { isAiPmJudgmentFix5V1Active } from './ai-pm-judgment-fix5-v1';
import { mergeStructuredSolutionDimension } from './ai-pm-judgment-structured-solution';
import { isAiPmJudgmentFix6V1Active } from './ai-pm-judgment-fix6-v1';
import { isAiPmJudgmentFix7V1Active } from './ai-pm-judgment-fix7-v1';
import { isAiPmJudgmentFix8V1Active } from './ai-pm-judgment-fix8-v1';
import {
  mergeCanonicalCustomer,
  mergeCanonicalCustomerChange,
  mergeCanonicalProblem,
} from './ai-pm-judgment-canonical-state';
import {
  applyEvidenceToDimension,
  type JudgmentEvidenceRecord,
} from './ai-pm-judgment-evidence-model';
import {
  extractProblemPriorityCorrection,
  isProblemPriorityCorrection,
  mergeProblemPriorityCorrection,
} from './ai-pm-judgment-problem-correction';
import { isCustomerCorrectionAnswer } from './ai-pm-judgment-target-binding';
import { isMetaConfirmationAnswer } from './ai-pm-answer-meta-slots';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import { evaluateAnswerQuality } from './understanding-contract';
import type { LivingUnderstandingState } from './living-understanding-state';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const CUSTOMER_CHANGE_CUE_RE =
  /(좋아지|줄일|줄어|감소|단축|편해|불편.*줄|누락|시간|비용|실수|확인\s*시간|배송\s*누락|한\s*곳에서|한눈에)/i;
const SOLUTION_METHOD_CUE_RE =
  /(연결|통합|관리|플랫폼|서비스|제공|만들|구축|해결하려|하려고|시스템|앱|툴)/i;
const CURRENT_ALTERNATIVE_CUE_RE =
  /(엑셀|카카오|카톡|수기|직접\s*관리|기존|지금은|현재는|이미\s*)/i;
const CUSTOMER_CUE_RE =
  /(소상공인|사장|고객|가게|양조|반찬|꽃집|배송|CEO|PM|스타트업)/i;

function clip(text: string, max = 72): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function isPending(value: string | null | undefined): boolean {
  const v = value?.trim() ?? '';
  return !v || v === SHARED_UNDERSTANDING_PENDING || v.includes('아직 확인');
}

function toStatus(
  value: string,
  strength: 'strong' | 'partial',
): { status: CeoJudgmentStatus; reason?: string } {
  if (!value.trim() || value.trim().length < 4) {
    return { status: 'unknown', reason: '아직 확인되지 않음' };
  }
  if (strength === 'strong') {
    return { status: 'clear', reason: 'CEO 답변에 구체적으로 나타남' };
  }
  return { status: 'needs_check', reason: '방향은 보이나 구체성이 더 필요함' };
}

function mergeDimension(
  prior: CeoJudgmentDimension,
  next: Partial<CeoJudgmentDimension>,
  options?: {
    preferUserExtract?: boolean;
    sourceTurnIndex?: number;
    answer?: string;
    evidence?: string;
    interpretedMeaning?: string;
    isCorrection?: boolean;
  },
): CeoJudgmentDimension {
  if (
    (isAiPmJudgmentFix7V1Active() || isAiPmJudgmentFix8V1Active()) &&
    prior.id === 'customerChange'
  ) {
    next = {
      ...next,
      status: 'needs_check',
      evidenceType: next.evidenceType ?? prior.evidenceType,
    };
  }
  if (
    isAiPmJudgmentFix8V1Active() &&
    prior.id === 'customerChange' &&
    next.summary?.trim()
  ) {
    return mergeCanonicalCustomerChange(prior, {
      conclusion: next.summary,
      evidence: options?.evidence ?? next.summary,
      sourceTurnIndex: options?.sourceTurnIndex,
      evidenceType: next.evidenceType,
    });
  }
  if (
    isAiPmJudgmentFix8V1Active() &&
    prior.id === 'customer' &&
    next.summary?.trim()
  ) {
    return mergeCanonicalCustomer(prior, {
      conclusion: next.summary,
      evidence: options?.evidence ?? next.summary,
      sourceTurnIndex: options?.sourceTurnIndex,
      isCorrection: options?.isCorrection,
    });
  }
  if (
    isAiPmJudgmentFix8V1Active() &&
    prior.id === 'problem' &&
    options?.answer &&
    isProblemPriorityCorrection(options.answer)
  ) {
    const correction = extractProblemPriorityCorrection(options.answer);
    if (correction) {
      return mergeProblemPriorityCorrection(
        prior,
        correction,
        options.sourceTurnIndex,
        options.answer,
      );
    }
  }
  if (
    isAiPmJudgmentFix8V1Active() &&
    prior.id === 'problem' &&
    next.summary?.trim() &&
    options?.evidence
  ) {
    return mergeCanonicalProblem(prior, {
      conclusion: next.summary,
      evidence: options.evidence,
      meaning: options.interpretedMeaning ?? next.summary,
      sourceTurnIndex: options?.sourceTurnIndex,
      isSeverity: /10%|심각/.test(options.evidence),
    });
  }
  if (next.evidenceType === 'hypothesis' || next.evidenceType === 'expectation') {
    const isExpectation = next.evidenceType === 'expectation';
    const merged = {
      ...prior,
      ...next,
      label: isExpectation ? '고객 기대효과' : '고객 변화 가설',
      status: 'needs_check' as const,
      evidenceType: next.evidenceType,
      statusReason: isExpectation
        ? 'CEO 기대효과 주장 — 검증 전'
        : 'CEO가 세운 가설 — 검증 전',
    };
    if (isAiPmJudgmentFix6V1Active() && options?.evidence) {
      return applyEvidenceToDimension(merged, {
        conclusion: next.summary,
        summary: next.summary,
        records: [
          {
            span: options.evidence,
            meaning: next.summary ?? options.evidence,
            role: 'primary',
            sourceTurnIndex: options.sourceTurnIndex,
          },
        ],
        sourceTurnIndex: options.sourceTurnIndex,
      });
    }
    return merged;
  }
  if (
    isAiPmJudgmentFix6V1Active() &&
    prior.id === 'problem' &&
    options?.answer &&
    isProblemPriorityCorrection(options.answer)
  ) {
    const correction = extractProblemPriorityCorrection(options.answer);
    if (correction) {
      return mergeProblemPriorityCorrection(
        prior,
        correction,
        options.sourceTurnIndex,
        options.answer,
      );
    }
  }
  if (
    isAiPmJudgmentFix5V1Active() &&
    prior.id === 'solution' &&
    next.summary?.trim()
  ) {
    return mergeStructuredSolutionDimension(prior, next.summary, options?.sourceTurnIndex);
  }
  if (
    isAiPmJudgmentMeaningModelV1Active() &&
    prior.id === 'problem' &&
    next.summary?.trim() &&
    !isAiPmJudgmentFix8V1Active()
  ) {
    return mergeDimensionAccumulative(prior, next);
  }
  if (
    isAiPmJudgmentMeaningModelV1Active() &&
    prior.id === 'solution' &&
    next.summary?.trim() &&
    !isAiPmJudgmentFix5V1Active()
  ) {
    return mergeDimensionAccumulative(prior, next);
  }
  if (!next.summary?.trim()) return prior;

  if (isDocumentEchoSummary(next.summary) && prior.summary.trim() && !isDocumentEchoSummary(prior.summary)) {
    return prior;
  }

  const statusRank = { unknown: 0, needs_check: 1, clear: 2 };
  const userWins =
    options?.preferUserExtract &&
    next.summary.trim().length >= 4 &&
    !isDocumentEchoSummary(next.summary);

  if (userWins && next.status === 'clear') {
    return {
      ...prior,
      ...next,
      label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
      summary: clip(next.summary!),
    };
  }

  const keepPrior =
    prior.status === 'clear' &&
    next.status !== 'clear' &&
    prior.summary.trim().length >= next.summary!.trim().length &&
    !userWins;
  if (keepPrior) return prior;
  if (statusRank[prior.status] > statusRank[next.status ?? 'unknown'] && prior.summary.trim() && !userWins) {
    return prior;
  }
  const merged: CeoJudgmentDimension = {
    ...prior,
    ...next,
    label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
    summary: next.summary?.trim() ? clip(next.summary) : prior.summary,
  };

  if (isAiPmJudgmentFix6V1Active() && next.summary?.trim() && options?.evidence) {
    const record: JudgmentEvidenceRecord = {
      span: options.evidence,
      meaning: options.interpretedMeaning ?? next.summary,
      role: options.isCorrection ? 'primary' : 'supporting',
      sourceTurnIndex: options.sourceTurnIndex,
    };
    const withEvidence = applyEvidenceToDimension(merged, {
      conclusion: options.isCorrection ? next.summary : merged.currentConclusion ?? next.summary,
      summary: merged.summary,
      records: [record],
      sourceTurnIndex: options.sourceTurnIndex,
      correctionApplied: options.isCorrection ?? merged.correctionApplied,
    });
    return withEvidence;
  }

  return merged;
}

function claimSummary(living: LivingUnderstandingState, fieldKey: string): string {
  const claim = living.claims.find((c) => c.fieldKey === fieldKey);
  return claim?.value?.trim() ?? '';
}

function dimensionFromLiving(living: LivingUnderstandingState): Partial<
  Record<CeoJudgmentDimensionId, CeoJudgmentDimension>
> {
  const out: Partial<Record<CeoJudgmentDimensionId, CeoJudgmentDimension>> = {};

  const customerSpine = living.spine.customer?.trim() ?? '';
  if (!isPending(customerSpine)) {
    const { status, reason } = toStatus(customerSpine, 'strong');
    out.customer = {
      id: 'customer',
      label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
      status,
      summary: clip(customerSpine),
      statusReason: reason,
    };
  } else {
    const persona = claimSummary(living, 'customerPersona');
    if (persona) {
      const { status, reason } = toStatus(persona, 'partial');
      out.customer = {
        id: 'customer',
        label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
        status,
        summary: clip(persona),
        statusReason: reason,
      };
    }
  }

  const problemSpine = living.spine.problem?.trim() ?? '';
  if (!isPending(problemSpine)) {
    const { status, reason } = toStatus(problemSpine, 'strong');
    out.problem = {
      id: 'problem',
      label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
      status,
      summary: clip(problemSpine),
      statusReason: reason,
    };
  } else {
    const jtbd = claimSummary(living, 'problemJtbd');
    if (jtbd) {
      const { status, reason } = toStatus(jtbd, 'partial');
      out.problem = {
        id: 'problem',
        label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
        status,
        summary: clip(jtbd),
        statusReason: reason,
      };
    }
  }

  const solutionClaim = claimSummary(living, 'solution');
  if (solutionClaim && !isPending(solutionClaim) && !isDocumentEchoSummary(solutionClaim)) {
    const hasMethod = SOLUTION_METHOD_CUE_RE.test(solutionClaim);
    if (hasMethod) {
      const { status, reason } = toStatus(solutionClaim, 'partial');
      out.solution = {
        id: 'solution',
        label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
        status,
        summary: clip(solutionClaim),
        statusReason: reason,
      };
    }
  }

  const diffRel = claimSummary(living, 'validationTestability') || claimSummary(living, 'differentiationVsAlternatives');
  if (diffRel && CUSTOMER_CHANGE_CUE_RE.test(diffRel)) {
    const { status, reason } = toStatus(diffRel, 'partial');
    out.customerChange = {
      id: 'customerChange',
      label: CEO_JUDGMENT_DIMENSION_LABELS.customerChange,
      status,
      summary: clip(diffRel),
      statusReason: reason,
    };
  }

  return out;
}

function dimensionsFromAnswerText(
  answer: string,
  askedIssueId?: AiPmLoopTurn['issueId'],
  askedGap?: string,
  allowMultiFact?: boolean,
): {
  dimensions: Partial<Record<CeoJudgmentDimensionId, CeoJudgmentDimension>>;
  meta: Partial<
    Record<
      CeoJudgmentDimensionId,
      {
        interpretedMeaning: string;
        evidence: string;
        reason: string;
        evidenceType?: 'fact' | 'hypothesis' | 'expectation';
      }
    >
  >;
  frozen: boolean;
} {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return { dimensions: {}, meta: {}, frozen: false };

  const quality = evaluateAnswerQuality(trimmed);
  if (quality.quality === 'UNKNOWN' || isPartialUnknownAnswer(trimmed) || isInferenceRiskAnswer(trimmed)) {
    return { dimensions: {}, meta: {}, frozen: true };
  }

  const extracted = extractDimensionSummaries(trimmed, {
    targetGap: askedGap,
    issueId: askedIssueId,
    allowMultiFact,
  });
  const out: Partial<Record<CeoJudgmentDimensionId, CeoJudgmentDimension>> = {};
  const meta: Partial<
    Record<
      CeoJudgmentDimensionId,
      {
        interpretedMeaning: string;
        evidence: string;
        reason: string;
        evidenceType?: 'fact' | 'hypothesis' | 'expectation';
      }
    >
  > = {};

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const hit = extracted[id];
    if (!hit) continue;
    const strength =
      id === 'problem' ? 'strong' : id === 'customerChange' ? 'strong' : 'partial';
    const { status, reason } = toStatus(hit.summary, strength);
    const isHypothesis = hit.evidenceType === 'hypothesis';
    const isExpectation = hit.evidenceType === 'expectation';
    const resolvedStatus =
      (isAiPmJudgmentFix7V1Active() || isAiPmJudgmentFix8V1Active()) &&
      id === 'customerChange'
        ? 'needs_check'
        : isHypothesis || isExpectation
          ? 'needs_check'
          : id === 'solution' && hit.reason.includes('needs_check')
            ? 'needs_check'
            : status;
    out[id] = {
      id,
      label:
        isHypothesis && id === 'customerChange'
          ? '고객 변화 가설'
          : isExpectation && id === 'customerChange'
            ? '고객 기대효과'
            : CEO_JUDGMENT_DIMENSION_LABELS[id],
      status: resolvedStatus,
      summary: hit.summary,
      statusReason: isHypothesis
        ? 'CEO가 세운 가설 — 검증 전'
        : isExpectation
          ? 'CEO 기대효과 주장 — 검증 전'
          : hit.reason || reason,
      evidenceType: hit.evidenceType ?? 'fact',
    };
    meta[id] = {
      interpretedMeaning: hit.interpretedMeaning,
      evidence: hit.evidence,
      reason: hit.reason,
      evidenceType: hit.evidenceType,
    };
  }

  if (CURRENT_ALTERNATIVE_CUE_RE.test(trimmed) && !out.problem && !CUSTOMER_CHANGE_CUE_RE.test(trimmed)) {
    const altSummary = `현재 ${clip(trimmed, 40)} 등으로 관리하는 것으로 이해했습니다`;
    out.problem = {
      id: 'problem',
      label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
      status: 'needs_check',
      summary: altSummary,
      statusReason: '기존 방식 정보 — 문제의 근거로 활용',
    };
    meta.problem = {
      interpretedMeaning: '기존 대안/관리 방식을 문제 맥락으로 해석',
      evidence: trimmed,
      reason: '기존 방식 정보 — 문제의 근거로 활용',
    };
  }

  return { dimensions: out, meta, frozen: false };
}

function countActionableTurns(turns: AiPmLoopTurn[]): number {
  return turns.filter(
    (t) =>
      !t.superseded &&
      t.intent !== 'why_meta' &&
      t.intent !== 'mid_judgment' &&
      t.intent !== 'nonsense' &&
      Boolean(t.answer?.trim()),
  ).length;
}

export function buildCeoJudgmentState(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  prior?: CeoJudgmentState | null;
  lastReview?: AnswerReview | null;
  /** When true, skip living spine merge — prior already reflects accumulated state. */
  incremental?: boolean;
}): CeoJudgmentState {
  if (!isAiPmJudgmentAggregationV1Active()) {
    return emptyCeoJudgmentState(countActionableTurns(input.turns));
  }

  const incremental = input.incremental ?? Boolean(input.prior);
  let state = input.prior
    ? {
        ...input.prior,
        dimensions: {
          customer: { ...input.prior.dimensions.customer },
          problem: { ...input.prior.dimensions.problem },
          solution: { ...input.prior.dimensions.solution },
          customerChange: { ...input.prior.dimensions.customerChange },
        },
      }
    : emptyCeoJudgmentState(countActionableTurns(input.turns));
  state.questionCount = countActionableTurns(input.turns);

  // FIX-3: Judgment dimensions come ONLY from CEO answers — never from living/document spine.

  const actionable = input.turns.filter(
    (t) =>
      !t.superseded &&
      t.intent !== 'why_meta' &&
      t.intent !== 'mid_judgment' &&
      t.intent !== 'nonsense',
  );
  const turnsToApply =
    incremental && input.prior
      ? actionable.slice(-1)
      : actionable.filter((t) => Boolean(t.answer?.trim()));

  for (let ti = 0; ti < turnsToApply.length; ti += 1) {
    const turn = turnsToApply[ti]!;
    if (!turn.answer?.trim()) continue;
    const turnIndex = actionable.indexOf(turn) + 1;
    const multiFact =
      turn.answer.includes('하고') ||
      turn.answer.includes('해서') ||
      (turn.answer.match(/[,，]/g)?.length ?? 0) >= 1;
    const { dimensions: fromAnswer, meta, frozen } = dimensionsFromAnswerText(
      turn.answer,
      turn.issueId,
      turn.targetGap,
      multiFact,
    );
    if (frozen) {
      continue;
    }
    const lastUpdated: CeoJudgmentDimensionId[] = [];
    const recentCorrections = [...(state.recentCorrections ?? [])];
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      if (fromAnswer[id]) {
        const isCorrection =
          (id === 'customer' && isCustomerCorrectionAnswer(turn.answer)) ||
          (id === 'problem' && isProblemPriorityCorrection(turn.answer));
        if (isCorrection && !recentCorrections.includes(id)) {
          recentCorrections.push(id);
        }
        state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!, {
          preferUserExtract: true,
          sourceTurnIndex: turnIndex,
          answer: turn.answer,
          evidence: meta[id]?.evidence,
          interpretedMeaning: meta[id]?.interpretedMeaning,
          isCorrection,
        });
        lastUpdated.push(id);
      }
    }
    if (lastUpdated.length > 0) {
      state.lastUpdatedDimensions = lastUpdated;
      state.recentCorrections = recentCorrections;
    }
    state.currentTurnIndex = turnIndex;
  }

  if (
    state.dimensions.solution.status !== 'unknown' &&
    state.dimensions.customerChange.status === 'unknown' &&
    state.dimensions.solution.summary &&
    SOLUTION_METHOD_CUE_RE.test(state.dimensions.solution.summary) &&
    !CUSTOMER_CHANGE_CUE_RE.test(state.dimensions.solution.summary)
  ) {
    state.dimensions.customerChange = {
      ...state.dimensions.customerChange,
      status: 'unknown',
      summary: '',
      statusReason: '해결 방법은 있으나 고객에게 달라지는 점은 아직 확인되지 않음',
    };
  }

  return finalizeJudgmentPresentation(state);
}

export function applyAnswerToJudgment(input: {
  prior: CeoJudgmentState;
  answer: string;
  issueId?: AiPmLoopTurn['issueId'];
  targetGap?: string;
  allowMultiFact?: boolean;
}): CeoJudgmentState {
  const multiFact =
    input.allowMultiFact ??
    (input.answer.includes('하고') ||
      input.answer.includes('해서') ||
      (input.answer.match(/[,，]/g)?.length ?? 0) >= 1);

  const { dimensions: fromAnswer, meta, frozen } = dimensionsFromAnswerText(
    input.answer,
    input.issueId,
    input.targetGap,
    multiFact,
  );
  let state: CeoJudgmentState = {
    ...input.prior,
    dimensions: {
      customer: { ...input.prior.dimensions.customer },
      problem: { ...input.prior.dimensions.problem },
      solution: { ...input.prior.dimensions.solution },
      customerChange: { ...input.prior.dimensions.customerChange },
    },
    questionCount: input.prior.questionCount + 1,
    recentCorrections: [...(input.prior.recentCorrections ?? [])],
  };

  if (frozen) {
    return finalizeJudgmentPresentation(state);
  }

  const lastUpdated: CeoJudgmentDimensionId[] = [];
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    if (fromAnswer[id]) {
      const isCorrection =
        (id === 'customer' && isCustomerCorrectionAnswer(input.answer)) ||
        (id === 'problem' && isProblemPriorityCorrection(input.answer));
      if (isCorrection && !state.recentCorrections!.includes(id)) {
        state.recentCorrections!.push(id);
      }
      state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!, {
        preferUserExtract: true,
        answer: input.answer,
        evidence: meta[id]?.evidence,
        interpretedMeaning: meta[id]?.interpretedMeaning,
        isCorrection,
      });
      lastUpdated.push(id);
    }
  }
  if (lastUpdated.length > 0) {
    state.lastUpdatedDimensions = lastUpdated;
  }
  state.currentTurnIndex = input.prior.currentTurnIndex;
  return finalizeJudgmentPresentation(state);
}

export type BuildCeoJudgmentWithTraceResult = {
  state: CeoJudgmentState;
  traceEntries: JudgmentTraceEntry[];
  dimensionMeta: Partial<
    Record<
      CeoJudgmentDimensionId,
      { interpretedMeaning: string; evidence: string; reason: string; knownPriorInfo?: string }
    >
  >;
};

export function buildCeoJudgmentStateWithTrace(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  prior?: CeoJudgmentState | null;
  lastReview?: AnswerReview | null;
  sourceTurnId?: string;
  question?: string;
  answer?: string;
  /** Pre-turn judgment — when set, used as trace baseline instead of prior. */
  beforeState?: CeoJudgmentState | null;
}): BuildCeoJudgmentWithTraceResult {
  const actionable = input.turns.filter(
    (t) =>
      !t.superseded &&
      t.intent !== 'why_meta' &&
      t.intent !== 'mid_judgment' &&
      t.intent !== 'nonsense',
  );
  const last = actionable[actionable.length - 1];
  const answer = input.answer ?? last?.answer ?? '';
  const question = input.question ?? last?.askedQuestionText ?? '';

  const prior =
    input.beforeState ??
    input.prior ??
    emptyCeoJudgmentState(Math.max(0, countActionableTurns(input.turns) - 1));

  const state = buildCeoJudgmentState({
    living: input.living,
    turns: input.turns,
    prior,
    lastReview: input.lastReview,
    incremental: Boolean(input.beforeState ?? input.prior),
  });

  const multiFact =
    answer.includes('하고') ||
    answer.includes('해서') ||
    (answer.match(/[,，]/g)?.length ?? 0) >= 1;
  const answerDims = answer.trim()
    ? dimensionsFromAnswerText(answer, last?.issueId, last?.targetGap, multiFact)
    : { meta: {}, frozen: false, dimensions: {} };
  const { meta, dimensions: fromAnswerDims, frozen } = answerDims;

  if (isMetaConfirmationAnswer(answer)) {
    return { state, traceEntries: [], dimensionMeta: {} };
  }

  const extractedDimensionIds = Object.keys(fromAnswerDims) as CeoJudgmentDimensionId[];

  const dimensionMeta: BuildCeoJudgmentWithTraceResult['dimensionMeta'] = {};
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    if (!fromAnswerDims[id]) continue;
    const entry = meta[id];
    if (entry) {
      dimensionMeta[id] = {
        ...entry,
        knownPriorInfo: prior.dimensions[id].summary || undefined,
      };
    }
  }

  const traceEntries = buildJudgmentTraceEntries({
    sourceTurnId: input.sourceTurnId ?? last?.appliedAt ?? `turn-${actionable.length}`,
    question,
    answer,
    prior,
    next: state,
    dimensionMeta,
    allowedDimensions: frozen ? [] : extractedDimensionIds,
  });

  if (!frozen && traceEntries.length === 0 && answer.trim()) {
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      if (fromAnswerDims[id] === undefined) continue;
      const before = prior.dimensions[id];
      const after = state.dimensions[id];
      const changeType = classifyJudgmentChangeType({
        before: { status: before.status, summary: before.summary },
        after: { status: after.status, summary: after.summary },
      });
      if (changeType === 'UNCHANGED') {
        traceEntries.push({
          sourceTurnId: input.sourceTurnId ?? last?.appliedAt ?? `turn-${actionable.length}`,
          question,
          answer,
          interpretedMeaning: meta[id]?.interpretedMeaning ?? `${id} dimension update`,
          evidence: meta[id]?.evidence ?? answer.trim(),
          affectedDimension: id,
          previousJudgment: { status: before.status, summary: before.summary },
          newJudgment: { status: after.status, summary: after.summary },
          changeType: 'CONFIRMED',
          reason: meta[id]?.reason ?? after.statusReason ?? 'judgment sync',
          knownPriorInfo: before.summary || undefined,
        });
        continue;
      }
      traceEntries.push({
        sourceTurnId: input.sourceTurnId ?? last?.appliedAt ?? `turn-${actionable.length}`,
        question,
        answer,
        interpretedMeaning: meta[id]?.interpretedMeaning ?? `${id} dimension update`,
        evidence: meta[id]?.evidence ?? answer.trim(),
        affectedDimension: id,
        previousJudgment: { status: before.status, summary: before.summary },
        newJudgment: { status: after.status, summary: after.summary },
        changeType:
          !before.summary.trim() && after.summary.trim() ? 'NEW' : changeType === 'NEW' ? 'NEW' : 'CHANGED',
        reason: meta[id]?.reason ?? after.statusReason ?? 'judgment sync',
        knownPriorInfo: before.summary || undefined,
        newlyAddedInfo:
          changeType === 'NEW' || changeType === 'CHANGED' || changeType === 'STRENGTHENED'
            ? after.summary
            : undefined,
      });
    }
  }

  return { state, traceEntries, dimensionMeta };
}
