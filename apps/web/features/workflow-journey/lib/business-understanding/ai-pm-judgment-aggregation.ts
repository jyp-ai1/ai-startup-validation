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
import { finalizeJudgmentPresentation } from './ai-pm-judgment-conclusion';
import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import type { ConversationFactKey } from './conversation-memory';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import type { LivingUnderstandingState } from './living-understanding-state';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const CUSTOMER_CHANGE_CUE_RE =
  /(좋아지|줄일|줄어|감소|단축|편해|불편.*줄|누락|시간|비용|실수|확인\s*시간|배송\s*누락|한\s*곳에서|한눈에)/i;
const SOLUTION_METHOD_CUE_RE =
  /(연결|통합|관리|플랫폼|서비스|제공|만들|구축|해결하려|하려고|시스템|앱|툴)/i;
const CURRENT_ALTERNATIVE_CUE_RE =
  /(엑셀|카카오|카톡|수기|직접\s*관리|기존|지금은|현재는|이미\s*)/i;
const PROBLEM_CUE_RE =
  /(불편|문제|어렵|힘들|분리|따로|없고|부족|번거|복잡)/i;
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
): CeoJudgmentDimension {
  if (!next.summary?.trim()) return prior;
  const statusRank = { unknown: 0, needs_check: 1, clear: 2 };
  const keepPrior =
    prior.status === 'clear' &&
    next.status !== 'clear' &&
    prior.summary.trim().length >= next.summary!.trim().length;
  if (keepPrior) return prior;
  if (statusRank[prior.status] > statusRank[next.status ?? 'unknown'] && prior.summary.trim()) {
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
  if (solutionClaim && !isPending(solutionClaim)) {
    const hasOutcome = CUSTOMER_CHANGE_CUE_RE.test(solutionClaim);
    const hasMethod = SOLUTION_METHOD_CUE_RE.test(solutionClaim);
    if (hasMethod && !hasOutcome) {
      const { status, reason } = toStatus(solutionClaim, 'partial');
      out.solution = {
        id: 'solution',
        label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
        status,
        summary: clip(solutionClaim),
        statusReason: reason,
      };
    } else if (hasOutcome) {
      const { status, reason } = toStatus(solutionClaim, 'strong');
      out.customerChange = {
        id: 'customerChange',
        label: CEO_JUDGMENT_DIMENSION_LABELS.customerChange,
        status,
        summary: clip(solutionClaim),
        statusReason: reason,
      };
      if (hasMethod) {
        out.solution = {
          id: 'solution',
          label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
          status: 'needs_check',
          summary: clip(solutionClaim),
          statusReason: '해결 방향은 보이나 고객 변화와 구분해 추가 확인이 필요함',
        };
      }
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

function factKeyToDimension(
  key: ConversationFactKey,
  answer: string,
): CeoJudgmentDimensionId | null {
  switch (key) {
    case 'customer':
      return 'customer';
    case 'problem':
      return 'problem';
    case 'business':
      return /(하려고|제공|만들|연결|통합|해결|플랫폼|앱|툴|시스템)/.test(answer)
        ? 'solution'
        : null;
    case 'differentiation':
    case 'defensibility':
      return 'solution';
    case 'diffRelevance':
      return 'customerChange';
    case 'competitor':
      return null;
    default:
      return null;
  }
}

function dimensionsFromAnswerText(
  answer: string,
  askedIssueId?: AiPmLoopTurn['issueId'],
  askedGap?: string,
): Partial<Record<CeoJudgmentDimensionId, CeoJudgmentDimension>> {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return {};

  const semantic = interpretAnswerSemantics({
    answer: trimmed,
    askedIssueId: askedIssueId ?? null,
    askedTargetGap: askedGap,
  });

  const out: Partial<Record<CeoJudgmentDimensionId, CeoJudgmentDimension>> = {};

  for (const hit of semantic.facts) {
    const dimId = factKeyToDimension(hit.key, trimmed);
    if (!dimId) continue;
    const { status, reason } = toStatus(trimmed, 'strong');
    out[dimId] = {
      id: dimId,
      label: CEO_JUDGMENT_DIMENSION_LABELS[dimId],
      status,
      summary: clip(trimmed),
      statusReason: reason,
    };
  }

  if (CUSTOMER_CUE_RE.test(trimmed)) {
    const { status, reason } = toStatus(trimmed, CUSTOMER_CUE_RE.test(trimmed) ? 'strong' : 'partial');
    out.customer = mergeDimension(
      out.customer ?? {
        id: 'customer',
        label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
        status: 'unknown',
        summary: '',
      },
      { status, summary: clip(trimmed), statusReason: reason },
    );
  }

  if (PROBLEM_CUE_RE.test(trimmed)) {
    const { status, reason } = toStatus(trimmed, 'strong');
    out.problem = mergeDimension(
      out.problem ?? {
        id: 'problem',
        label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
        status: 'unknown',
        summary: '',
      },
      { status, summary: clip(trimmed), statusReason: reason },
    );
  }

  if (CUSTOMER_CHANGE_CUE_RE.test(trimmed) && !SOLUTION_METHOD_CUE_RE.test(trimmed)) {
    const { status, reason } = toStatus(trimmed, 'strong');
    out.customerChange = {
      id: 'customerChange',
      label: CEO_JUDGMENT_DIMENSION_LABELS.customerChange,
      status,
      summary: clip(trimmed),
      statusReason: reason,
    };
  } else if (SOLUTION_METHOD_CUE_RE.test(trimmed) && !CUSTOMER_CHANGE_CUE_RE.test(trimmed)) {
    const problemDominant =
      PROBLEM_CUE_RE.test(trimmed) &&
      /(불편|어렵|힘들|번거|복잡)/.test(trimmed) &&
      !/(하려고|하려\s*합니다|제공|만들려|연결하|통합하|해결하)/.test(trimmed);
    if (!problemDominant) {
      const { status, reason } = toStatus(trimmed, 'partial');
      out.solution = {
        id: 'solution',
        label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
        status,
        summary: clip(trimmed),
        statusReason: reason,
      };
    }
  } else if (SOLUTION_METHOD_CUE_RE.test(trimmed) && CUSTOMER_CHANGE_CUE_RE.test(trimmed)) {
    const { status, reason } = toStatus(trimmed, 'strong');
    out.customerChange = {
      id: 'customerChange',
      label: CEO_JUDGMENT_DIMENSION_LABELS.customerChange,
      status,
      summary: clip(trimmed),
      statusReason: reason,
    };
    out.solution = {
      id: 'solution',
      label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
      status: 'needs_check',
      summary: clip(trimmed),
      statusReason: '해결 방법은 보이나 고객 변화는 별도 확인이 필요함',
    };
  }

  if (CURRENT_ALTERNATIVE_CUE_RE.test(trimmed) && !CUSTOMER_CHANGE_CUE_RE.test(trimmed)) {
    out.problem = mergeDimension(
      out.problem ?? {
        id: 'problem',
        label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
        status: 'unknown',
        summary: '',
      },
      {
        status: 'needs_check',
        summary: `현재 ${clip(trimmed, 40)} 등으로 관리하는 것으로 이해했습니다`,
        statusReason: '기존 방식 정보 — 문제의 근거로 활용',
      },
    );
  }

  return out;
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
}): CeoJudgmentState {
  if (!isAiPmJudgmentAggregationV1Active()) {
    return emptyCeoJudgmentState(countActionableTurns(input.turns));
  }

  let state = input.prior ?? emptyCeoJudgmentState(countActionableTurns(input.turns));
  state.questionCount = countActionableTurns(input.turns);

  const fromLiving = dimensionFromLiving(input.living);
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    if (fromLiving[id]) {
      state.dimensions[id] = mergeDimension(state.dimensions[id], fromLiving[id]!);
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
    const fromAnswer = dimensionsFromAnswerText(
      last.answer,
      last.issueId,
      last.targetGap,
    );
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      if (fromAnswer[id]) {
        state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!);
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
}): CeoJudgmentState {
  const fromAnswer = dimensionsFromAnswerText(
    input.answer,
    input.issueId,
    input.targetGap,
  );
  let state: CeoJudgmentState = {
    ...input.prior,
    questionCount: input.prior.questionCount + 1,
  };
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    if (fromAnswer[id]) {
      state.dimensions[id] = mergeDimension(state.dimensions[id], fromAnswer[id]!);
    }
  }
  return finalizeJudgmentPresentation(state);
}
