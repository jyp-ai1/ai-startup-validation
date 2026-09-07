/**
 * DAY 8-I P0 — Question Target → Judgment Dimension binding.
 * Ensures CEO answers map to the dimension the question was asking about.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import { isAiPmJudgmentTargetBindingV1Active } from './ai-pm-judgment-target-binding-v1';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

const GAP_TO_DIMENSION: Record<string, CeoJudgmentDimensionId> = {
  customerPersona: 'customer',
  businessOneLiner: 'solution',
  categoryScope: 'solution',
  problemJtbd: 'problem',
  problemFrequencySeverity: 'problem',
  solution: 'solution',
  validationTestability: 'customerChange',
  differentiationVsAlternatives: 'solution',
  differentiationHypothesis: 'solution',
  alternativesCompetitors: 'solution',
  executionConstraints: 'solution',
  marketChannel: 'problem',
  marketSizeEvidence: 'problem',
  payer: 'customer',
  revenueModel: 'solution',
  pricingHint: 'solution',
};

const ISSUE_TO_DIMENSION: Record<AiPmLoopIssueId, CeoJudgmentDimensionId> = {
  customer_definition: 'customer',
  problem_definition: 'problem',
  bm_design: 'solution',
  market_validation: 'problem',
  competitor_analysis: 'solution',
};

const CORRECTION_CUSTOMER_RE =
  /(?:고객|타깃|타겟|대상)(?:은|이)?\s*(?:양조|반찬|꽃집|가게|사장|소상공인|포함|만이\s*아니)/i;
const CORRECTION_PROBLEM_RE =
  /(?:사실|정정|아니(?:라)?)\s*(?:문제|불편|누락|확인\s*시간)/i;

const VAGUE_INFERENCE_RE =
  /(?:~?\s*만\s*말했|정확히\s*말하지\s*않|말하기\s*어렵|원하는\s*건\s*(?:정확히\s*)?말하지)/i;

const PARTIAL_UNKNOWN_RE =
  /(?:아직\s*(?:모르|측정|확인)|모르겠(?:습니다|어요)?|잘\s*모르|측정하지\s*못)/i;

const DOC_ECHO_RE =
  /^서비스:\s*주문부터\s*배송까지|^대상:\s*소규모\s*양조장/i;

export type JudgmentAnswerContext = {
  answer: string;
  targetGap?: string | null;
  issueId?: AiPmLoopIssueId | null;
  allowMultiFact?: boolean;
};

export function resolveJudgmentTargetDimension(
  input: JudgmentAnswerContext,
): CeoJudgmentDimensionId | null {
  if (!isAiPmJudgmentTargetBindingV1Active()) return null;

  const gap = input.targetGap?.trim();
  if (gap && GAP_TO_DIMENSION[gap]) return GAP_TO_DIMENSION[gap];

  if (input.issueId && ISSUE_TO_DIMENSION[input.issueId]) {
    return ISSUE_TO_DIMENSION[input.issueId];
  }

  return null;
}

/** Detect customer correction — must update customer, not customerChange. */
export function isCustomerCorrectionAnswer(answer: string): boolean {
  const t = answer.trim();
  return CORRECTION_CUSTOMER_RE.test(t) || /(?:포함|만이\s*아니라|외에\s*).*(?:양조|반찬|꽃집|가게)/.test(t);
}

/** Detect problem correction — must update problem. */
export function isProblemCorrectionAnswer(answer: string): boolean {
  return CORRECTION_PROBLEM_RE.test(answer.trim());
}

/** CEO explicitly declined to provide info — do not reuse prior inference. */
export function isVagueOrUnknownAnswer(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 4) return true;
  if (/^(모름|몰라요|모르겠|잘\s*모르)\.?$/i.test(t)) return true;
  return false;
}

/** Inference-risk: CEO said they don't know what customer wants — clear stale inference. */
export function isInferenceRiskAnswer(answer: string): boolean {
  return VAGUE_INFERENCE_RE.test(answer.trim());
}

/** Partial unknown about a specific slot — freeze only, keep unrelated dimensions. */
export function isPartialUnknownAnswer(answer: string): boolean {
  const t = answer.trim();
  if (!PARTIAL_UNKNOWN_RE.test(t) || isInferenceRiskAnswer(answer)) return false;
  // Third-party problem description ("양조장들은 … 잘 모르고") is not CEO declining to answer
  if (t.length >= 24 && /(?:들은|들이|들의|고객|양조|가게|사장|업체)/.test(t)) {
    return false;
  }
  return true;
}

const QUESTION_BACK_RE =
  /^(?:그(?:런데|러면)?\s*)?(?:고객|문제|해결|대상|타깃|타겟|누구|뭐(?:가|야)?|무엇).{0,24}(?:누군|뭔데|무엇|어떤|뭐야|뭐죠|말(?:이|씀)?)\s*[?？]?$/i;

/** CEO pushed the question back — not a definitional answer (FIX-10). */
export function isQuestionBackAnswer(answer: string): boolean {
  const t = answer.trim().replace(/\s+/g, ' ');
  if (t.length < 4) return false;
  if (QUESTION_BACK_RE.test(t)) return true;
  if (/\?$/.test(t) && /(?:누군|뭔데|무슨\s*말|무엇(?:인|이)?(?:데|야)?)/.test(t)) {
    return /(?:고객|문제|해결|대상|타깃|타겟)/.test(t) || t.length <= 28;
  }
  return false;
}

/** Document spine echo — must not overwrite user extract. */
export function isDocumentEchoSummary(summary: string): boolean {
  const t = summary.trim();
  if (t.length > 80 && DOC_ECHO_RE.test(t)) return true;
  if (DOC_ECHO_RE.test(t)) return true;
  return false;
}

/** Same normalized text copied across dimensions — semantic copy FAIL. */
export function isSemanticCopy(a: string, b: string): boolean {
  const na = a.trim().replace(/\s+/g, ' ');
  const nb = b.trim().replace(/\s+/g, ' ');
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function filterToTargetDimension(
  hits: Partial<Record<CeoJudgmentDimensionId, unknown>>,
  target: CeoJudgmentDimensionId | null,
  allowMultiFact: boolean,
): Partial<Record<CeoJudgmentDimensionId, unknown>> {
  if (!target || allowMultiFact) return hits;
  const hit = hits[target];
  if (!hit) return {};
  return { [target]: hit };
}
