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
  options?: { preferUserExtract?: boolean },
): CeoJudgmentDimension {
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
  return {
    ...prior,
    ...next,
    label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
    summary: next.summary?.trim() ? clip(next.summary) : prior.summary,
  };
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
      { interpretedMeaning: string; evidence: string; reason: string }
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
      { interpretedMeaning: string; evidence: string; reason: string }
    >
  > = {};

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const hit = extracted[id];
    if (!hit) continue;
    const strength =
      id === 'customerChange' || id === 'problem' ? 'strong' : 'partial';
    const { status, reason } = toStatus(hit.summary, strength);
    out[id] = {
      id,
      label: CEO_JUDGMENT_DIMENSION_LABELS[id],
      status: id === 'solution' && hit.reason.includes('needs_check') ? 'needs_check' : status,
      summary: hit.summary,
      statusReason: hit.reason || reason,
    };
    meta[id] = {
      interpretedMeaning: hit.interpretedMeaning,
      evidence: hit.evidence,
      reason: hit.reason,
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

  if (CUSTOMER_CUE_RE.test(trimmed) && !out.customer && !askedGap) {
    const { status, reason } = toStatus(trimmed, 'partial');
    out.customer = {
      id: 'customer',
      label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
      status,
      summary: clip(trimmed),
      statusReason: reason,
    };
    meta.customer = {
      interpretedMeaning: '고객 단서 — 세분 추출 실패, 전체 답변에서 보수적 반영',
      evidence: trimmed,
      reason: reason ?? 'CEO 답변에 구체적으로 나타남',
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

  if (!incremental) {
    const fromLiving = dimensionFromLiving(input.living);
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      if (fromLiving[id]) {
        state.dimensions[id] = mergeDimension(state.dimensions[id], fromLiving[id]!);
      }
    }
  }

  const actionable = input.turns.filter(
    (t) =>
      !t.superseded &&
      t.intent !== 'why_meta' &&
      t.intent !== 'mid_judgment' &&
      t.intent !== 'nonsense',
  );
  const last = actionable[actionable.length - 1];
  if (last?.answer?.trim()) {
    const multiFact =
      last.answer.includes('하고') ||
      last.answer.includes('해서') ||
      (last.answer.match(/[,，]/g)?.length ?? 0) >= 1;
    const { dimensions: fromAnswer, frozen } = dimensionsFromAnswerText(
      last.answer,
      last.issueId,
      last.targetGap,
      multiFact,
    );
    if (frozen) {
      if (isInferenceRiskAnswer(last.answer)) {
        for (const id of ['problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
          state.dimensions[id] = {
            ...state.dimensions[id],
            status: 'unknown',
            summary: '',
            statusReason: 'CEO가 구체적으로 확인하지 않음',
          };
        }
      }
    } else {
      for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
        if (fromAnswer[id]) {
          state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!, {
            preferUserExtract: true,
          });
        }
      }
    }
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

  const { dimensions: fromAnswer, frozen } = dimensionsFromAnswerText(
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
  };

  if (frozen) {
    if (isInferenceRiskAnswer(input.answer)) {
      for (const id of ['problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
        state.dimensions[id] = {
          ...state.dimensions[id],
          status: 'unknown',
          summary: '',
          statusReason: 'CEO가 구체적으로 확인하지 않음',
        };
      }
    }
    return finalizeJudgmentPresentation(state);
  }

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    if (fromAnswer[id]) {
      state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!, {
        preferUserExtract: true,
      });
    }
  }
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
  const { meta, dimensions: fromAnswerDims } = answerDims;

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
    allowedDimensions: Object.keys(fromAnswerDims) as CeoJudgmentDimensionId[],
  });

  if (traceEntries.length === 0 && answer.trim()) {
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      if (fromAnswerDims[id] === undefined) continue;
      const before = prior.dimensions[id];
      const after = state.dimensions[id];
      const changeType = classifyJudgmentChangeType({
        before: { status: before.status, summary: before.summary },
        after: { status: after.status, summary: after.summary },
      });
      if (changeType === 'UNCHANGED') continue;
      traceEntries.push({
        sourceTurnId: input.sourceTurnId ?? last?.appliedAt ?? `turn-${actionable.length}`,
        question,
        answer,
        interpretedMeaning: meta[id]?.interpretedMeaning ?? `${id} dimension update`,
        evidence: meta[id]?.evidence ?? answer.trim(),
        affectedDimension: id,
        previousJudgment: { status: before.status, summary: before.summary },
        newJudgment: { status: after.status, summary: after.summary },
        changeType: !before.summary.trim() && after.summary.trim() ? 'NEW' : 'CHANGED',
        reason: meta[id]?.reason ?? after.statusReason ?? 'judgment sync',
        knownPriorInfo: before.summary || undefined,
        newlyAddedInfo: after.summary || undefined,
      });
    }
  }

  return { state, traceEntries, dimensionMeta };
}
