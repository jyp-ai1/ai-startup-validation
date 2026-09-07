/**
 * DAY 8-I P0 FIX-10 — CEO trust: inference ≠ confirmed, no verdict without evidence.
 */

import type {
  CeoJudgmentDimension,
  CeoJudgmentDimensionId,
  CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import type { BusinessReviewReadiness, BusinessReviewVerdict } from './ai-pm-business-review';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';

export type JudgmentKnowledgeSource = 'ceo_confirmed' | 'ai_inference';

const CORE_DIMENSIONS: CeoJudgmentDimensionId[] = ['customer', 'problem', 'solution'];

export function isExplicitCustomerDefinition(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (/주\s*고객|타깃|타겟|대상|포함|만이\s*아니라/.test(t)) return true;
  if (/고객(?:입니다|이고|은|은\s*)/.test(t)) return true;
  if (/^(?:소규모\s*)?(?:양조장|반찬|꽃집).{10,}/.test(t)) return true;
  return t.length >= 24;
}

export function resolveCustomerJudgmentStatus(input: {
  conclusion: string;
  fromInference?: boolean;
  isCorrection?: boolean;
}): { status: 'clear' | 'needs_check'; knowledgeSource: JudgmentKnowledgeSource } {
  if (input.fromInference && !input.isCorrection) {
    return { status: 'needs_check', knowledgeSource: 'ai_inference' };
  }
  if (input.isCorrection || isExplicitCustomerDefinition(input.conclusion)) {
    return { status: 'clear', knowledgeSource: 'ceo_confirmed' };
  }
  return { status: 'needs_check', knowledgeSource: 'ceo_confirmed' };
}

export function dimensionHasCeoEvidence(d: CeoJudgmentDimension): boolean {
  const records = d.evidenceRecords ?? [];
  if (records.some((r) => r.sourceTurnIndex && r.sourceTurnIndex > 0)) return true;
  return (d.sourceTurns?.length ?? 0) > 0;
}

export function isCeoConfirmedDimension(d: CeoJudgmentDimension): boolean {
  if (d.status !== 'clear') return false;
  if ((d as CeoJudgmentDimension & { knowledgeSource?: JudgmentKnowledgeSource }).knowledgeSource === 'ai_inference') {
    return false;
  }
  return dimensionHasCeoEvidence(d);
}

export function countCeoConfirmedCoreDimensions(state: CeoJudgmentState): number {
  let n = 0;
  for (const id of CORE_DIMENSIONS) {
    if (isCeoConfirmedDimension(state.dimensions[id])) n += 1;
  }
  return n;
}

export function computeTrustBasedReadiness(state: CeoJudgmentState): BusinessReviewReadiness {
  const customer = state.dimensions.customer;
  const problem = state.dimensions.problem;
  const solution = state.dimensions.solution;

  if (
    customer.status === 'unknown' ||
    problem.status === 'unknown' ||
    solution.status === 'unknown'
  ) {
    return 'insufficient';
  }

  if (!isCeoConfirmedDimension(customer) || !isCeoConfirmedDimension(problem)) {
    return 'insufficient';
  }

  if (!isCeoConfirmedDimension(solution)) {
    return 'supplement_recommended';
  }

  if (countCeoConfirmedCoreDimensions(state) >= 3) {
    return 'ready';
  }

  return 'insufficient';
}

/** FIX-10: never emit conditional GO — insufficient info → NO-GO only. */
export function computeTrustBasedVerdict(
  readiness: BusinessReviewReadiness,
  state: CeoJudgmentState,
): BusinessReviewVerdict {
  if (!isAiPmJudgmentFix10V1Active()) {
    if (readiness === 'insufficient') return 'no_go';
    if (readiness === 'supplement_recommended') return 'conditional_go';
    return 'go';
  }

  if (readiness === 'insufficient') return 'no_go';
  if (readiness === 'supplement_recommended') return 'no_go';
  if (countCeoConfirmedCoreDimensions(state) >= 3) return 'go';
  return 'no_go';
}

export function inferenceStatusReason(dimensionId: CeoJudgmentDimensionId): string {
  switch (dimensionId) {
    case 'customer':
      return 'AI 추정 — 확인 필요';
    case 'problem':
      return 'AI 추정 — 확인 필요';
    case 'solution':
      return 'AI 추정 — 확인 필요';
    case 'customerChange':
      return 'CEO 주장 — 아직 검증되지 않음';
  }
}
