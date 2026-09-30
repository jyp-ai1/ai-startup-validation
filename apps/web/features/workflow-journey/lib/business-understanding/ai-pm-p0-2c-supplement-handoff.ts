/**
 * P0-2C — After CEO customerChange (validationTestability) supplement, hand off to Final Review.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { pickNextCheckDimension } from './ai-pm-judgment-conclusion';
import type { LivingUnderstandingState } from './living-understanding-state';
import { criticalGapsBlockAnalysis } from './question-causality';

let testOverride: boolean | null = null;

export function setAiPmP02cSupplementHandoffForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmP02cSupplementHandoffActive(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_P0_2C_SUPPLEMENT_HANDOFF === 'false' ||
      process.env?.NEXT_PUBLIC_AI_PM_P0_2C_SUPPLEMENT_HANDOFF === 'false')
  ) {
    return false;
  }
  return true;
}

export function isValidationTestabilitySupplementTarget(targetGap?: string | null): boolean {
  return targetGap === 'validationTestability';
}

/** True when judgment + living state allow closing the understanding loop (Final Review). */
export function shouldHandoffToFinalReview(input: {
  living: LivingUnderstandingState;
  judgment: CeoJudgmentState;
}): boolean {
  if (!isAiPmP02cSupplementHandoffActive()) return false;
  if (criticalGapsBlockAnalysis(input.living)) return false;

  const customer = input.judgment.dimensions.customer;
  const problem = input.judgment.dimensions.problem;
  if (customer.status === 'unknown' || problem.status === 'unknown') return false;
  if (!customer.summary.trim() || !problem.summary.trim()) return false;

  const customerChange = input.judgment.dimensions.customerChange;
  if (customerChange.status !== 'clear' || customerChange.summary.trim().length < 4) {
    return false;
  }

  const solution = input.judgment.dimensions.solution;
  if (solution.status === 'unknown' || solution.summary.trim().length < 4) {
    return false;
  }

  const nextCheck = pickNextCheckDimension(input.judgment);
  if (
    nextCheck === 'customer' ||
    nextCheck === 'problem' ||
    nextCheck === 'customerChange'
  ) {
    return false;
  }

  return true;
}
