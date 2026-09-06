/**
 * DAY 8-H — Business review result (presentation layer on CeoJudgmentState).
 * Does not replace V3 SoT or gapState.
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  CEO_JUDGMENT_STATUS_LABEL,
  statusEmoji,
  type CeoJudgmentDimensionId,
  type CeoJudgmentState,
  type CeoJudgmentStatus,
} from './ai-pm-ceo-judgment-dimensions';
import {
  pickNextCheckDimension,
  weakestDimensionLabel,
} from './ai-pm-judgment-conclusion';

export type BusinessReviewReadiness = 'ready' | 'supplement_recommended' | 'insufficient';

export type BusinessReviewVerdict = 'go' | 'conditional_go' | 'no_go';

export type BusinessReviewResult = {
  oneLiner: string;
  dimensions: CeoJudgmentState['dimensions'];
  readiness: BusinessReviewReadiness;
  readinessLabel: string;
  readinessEmoji: string;
  aiJudgmentHeadline: string;
  aiJudgmentBody: string;
  primaryGapId: CeoJudgmentDimensionId | null;
  primaryGapLabel: string | null;
  primaryGapSummary: string | null;
  primaryGapWhy: string | null;
  verdict: BusinessReviewVerdict;
  verdictLabel: string;
  verdictEmoji: string;
  verdictExplanation: string;
  nextAction: string;
};

const READINESS_LABEL: Record<BusinessReviewReadiness, { emoji: string; label: string }> = {
  ready: { emoji: '🟢', label: '검토 진행 가능' },
  supplement_recommended: { emoji: '🟡', label: '보완 후 판단 권장' },
  insufficient: { emoji: '🔴', label: '현재 정보로 판단 어려움' },
};

const VERDICT_LABEL: Record<BusinessReviewVerdict, { emoji: string; label: string }> = {
  go: { emoji: '🟢', label: 'GO' },
  conditional_go: { emoji: '🟡', label: '조건부 GO' },
  no_go: { emoji: '🔴', label: 'NO-GO' },
};

function dim(state: CeoJudgmentState, id: CeoJudgmentDimensionId) {
  return state.dimensions[id];
}

function isStrong(status: CeoJudgmentStatus): boolean {
  return status === 'clear';
}

function hasContent(status: CeoJudgmentStatus, summary: string): boolean {
  return status !== 'unknown' && summary.trim().length >= 4;
}

export function computeBusinessReviewReadiness(state: CeoJudgmentState): BusinessReviewReadiness {
  const customer = dim(state, 'customer');
  const problem = dim(state, 'problem');
  const solution = dim(state, 'solution');

  if (customer.status === 'unknown' || problem.status === 'unknown') {
    return 'insufficient';
  }
  if (!hasContent(customer.status, customer.summary) || !hasContent(problem.status, problem.summary)) {
    return 'insufficient';
  }

  if (solution.status === 'unknown' || (solution.status === 'needs_check' && solution.summary.trim().length < 8)) {
    return 'supplement_recommended';
  }

  if (isStrong(customer.status) && isStrong(problem.status) && isStrong(solution.status)) {
    return 'ready';
  }

  const weakId = pickNextCheckDimension(state);
  if (weakId === 'solution' || weakId === 'customerChange') {
    return 'supplement_recommended';
  }

  return 'ready';
}

export function computeBusinessReviewVerdict(
  readiness: BusinessReviewReadiness,
): BusinessReviewVerdict {
  if (readiness === 'insufficient') return 'no_go';
  if (readiness === 'supplement_recommended') return 'conditional_go';
  return 'go';
}

function buildAiJudgmentCopy(state: CeoJudgmentState, readiness: BusinessReviewReadiness): {
  headline: string;
  body: string;
} {
  const clear: string[] = [];
  const weak: string[] = [];

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const d = dim(state, id);
    if (d.status === 'clear') clear.push(CEO_JUDGMENT_DIMENSION_LABELS[id]);
    else if (d.status === 'needs_check') weak.push(CEO_JUDGMENT_DIMENSION_LABELS[id]);
    else weak.push(CEO_JUDGMENT_DIMENSION_LABELS[id]);
  }

  if (readiness === 'insufficient') {
    return {
      headline: '🔴 현재 정보로 판단 어려움',
      body: '고객과 문제에 대한 정보가 아직 충분하지 않아 사업 검토를 확정하기 어렵습니다. 핵심 정보를 먼저 확인해야 합니다.',
    };
  }

  if (readiness === 'supplement_recommended') {
    const weakLabel = weakestDimensionLabel(state) ?? '해결 방법';
    return {
      headline: '🟡 현재 정보 기준 추가 확인 권장',
      body: `${clear.length > 0 ? `${clear.join('과 ')}은(는) 비교적 명확합니다. ` : ''}다만 ${weakLabel}에 대한 확인이 충분하지 않아 현재 단계에서 사업 검토를 확정하기에는 정보가 부족합니다.`,
    };
  }

  return {
    headline: '🟢 현재 정보 기준 검토 진행 가능',
    body: `${clear.join('과 ')}은(는) 비교적 명확합니다. 현재 확인된 정보 기준으로 다음 검증 단계로 진행할 수 있습니다.`,
  };
}

function buildPrimaryGapWhy(id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return '누구를 위한 사업인지 알아야 문제와 해결 방법을 연결할 수 있습니다.';
    case 'problem':
      return '고객이 겪는 문제가 명확해야 해결 방법이 의미 있는지 판단할 수 있습니다.';
    case 'solution':
      return '실제로 어떤 방식으로 문제를 해결하는지 알아야 사업 검토를 확정할 수 있습니다.';
    case 'customerChange':
      return '고객에게 실제로 무엇이 달라지는지 알아야 가치를 판단할 수 있습니다.';
  }
}

function buildPrimaryGapSummary(state: CeoJudgmentState, id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return '누가 이 서비스를 사용하는지 더 구체적으로 확인이 필요합니다.';
    case 'problem':
      return '고객이 겪는 불편이 무엇인지 더 구체적으로 확인이 필요합니다.';
    case 'solution':
      return '현재 엑셀이나 기존 방식으로 관리하는 과정 중, 이 서비스가 실제로 어떤 과정을 대신하거나 바꾸는지 확인이 필요합니다.';
    case 'customerChange':
      return '고객이 이 서비스를 쓰면 실제로 무엇이 좋아지는지 확인이 필요합니다.';
  }
}

function buildVerdictExplanation(
  verdict: BusinessReviewVerdict,
  state: CeoJudgmentState,
): string {
  switch (verdict) {
    case 'go':
      return '현재 확인된 정보 기준으로 다음 검증 단계로 진행할 수 있습니다.';
    case 'conditional_go':
      return '핵심 문제와 고객은 확인되었지만 해결 방식에 대한 확인이 필요합니다. 이 부분을 보완한 뒤 다음 단계로 진행하는 것을 권장합니다.';
    case 'no_go':
      return '현재 확인된 정보만으로는 고객 문제와 해결 방식의 연결이 충분하지 않아 다음 단계로 진행하기 어렵습니다. (사업 실패 선언이 아니라 현재 정보 기준 진행 판단입니다.)';
  }
}

function buildNextAction(verdict: BusinessReviewVerdict, primaryGapId: CeoJudgmentDimensionId | null): string {
  if (verdict === 'go') {
    return '다음 단계로 시장·경쟁 상황을 확인하세요.';
  }
  if (verdict === 'conditional_go' && primaryGapId === 'solution') {
    return '해결 방법을 한 번 더 구체화한 뒤 시장·경쟁 상황을 확인하세요.';
  }
  if (verdict === 'conditional_go') {
    return '부족한 부분을 보완한 뒤 다시 사업 검토를 진행하세요.';
  }
  return '고객과 문제를 먼저 구체적으로 정리한 뒤 다시 검토하세요.';
}

export function buildBusinessReviewResult(state: CeoJudgmentState): BusinessReviewResult {
  const readiness = computeBusinessReviewReadiness(state);
  const verdict = computeBusinessReviewVerdict(readiness);
  const readinessMeta = READINESS_LABEL[readiness];
  const verdictMeta = VERDICT_LABEL[verdict];
  const { headline, body } = buildAiJudgmentCopy(state, readiness);
  const primaryGapId = pickNextCheckDimension(state);

  return {
    oneLiner: state.oneLiner,
    dimensions: state.dimensions,
    readiness,
    readinessLabel: readinessMeta.label,
    readinessEmoji: readinessMeta.emoji,
    aiJudgmentHeadline: headline,
    aiJudgmentBody: body,
    primaryGapId,
    primaryGapLabel: primaryGapId ? CEO_JUDGMENT_DIMENSION_LABELS[primaryGapId] : null,
    primaryGapSummary: primaryGapId ? buildPrimaryGapSummary(state, primaryGapId) : null,
    primaryGapWhy: primaryGapId ? buildPrimaryGapWhy(primaryGapId) : null,
    verdict,
    verdictLabel: verdictMeta.label,
    verdictEmoji: verdictMeta.emoji,
    verdictExplanation: buildVerdictExplanation(verdict, state),
    nextAction: buildNextAction(verdict, primaryGapId),
  };
}

export function formatDimensionLine(id: CeoJudgmentDimensionId, state: CeoJudgmentState): string {
  const d = state.dimensions[id];
  return `${statusEmoji(d.status)} ${CEO_JUDGMENT_STATUS_LABEL[d.status]}`;
}
