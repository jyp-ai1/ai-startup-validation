/**
 * CPO Sprint 2 — Failure taxonomy F01–F16 (cross-business tracking).
 * Maps to engine harness codes F1–F10 where applicable.
 */

import type { AccuracyFailureType } from './failure-taxonomy';

export type Sprint2FailureCode =
  | 'F01_CUSTOMER_POLLUTION'
  | 'F02_PROBLEM_POLLUTION'
  | 'F03_PAYER_USER_CONFUSION'
  | 'F04_FACT_ASSUMPTION_CONFUSION'
  | 'F05_INFERENCE_AS_FACT'
  | 'F06_CLOSED_STATE_REGRESSION'
  | 'F07_OPEN_GAP_MISSED'
  | 'F08_WRONG_GAP_PRIORITY'
  | 'F09_REPEATED_QUESTION'
  | 'F10_OFF_SLOT_MISHANDLING'
  | 'F11_CONTRADICTION_MISHANDLING'
  | 'F12_CORRECTION_ROLLBACK'
  | 'F13_MULTI_FACT_LOSS'
  | 'F14_UNSUPPORTED_CLAIM_ACCEPTANCE'
  | 'F15_PREMATURE_JUDGMENT'
  | 'F16_WRONG_NEXT_QUESTION_RATIONALE';

export const SPRINT2_FAILURE_LABELS: Record<Sprint2FailureCode, string> = {
  F01_CUSTOMER_POLLUTION: 'Customer slot pollution',
  F02_PROBLEM_POLLUTION: 'Problem slot pollution',
  F03_PAYER_USER_CONFUSION: 'Payer / user / buyer confusion',
  F04_FACT_ASSUMPTION_CONFUSION: 'Fact vs assumption confusion',
  F05_INFERENCE_AS_FACT: 'Inference treated as fact',
  F06_CLOSED_STATE_REGRESSION: 'CLOSED gap wrongly opened or kept closed when should reopen',
  F07_OPEN_GAP_MISSED: 'OPEN gap missed (should stay open)',
  F08_WRONG_GAP_PRIORITY: 'Wrong next-gap priority (L4)',
  F09_REPEATED_QUESTION: 'Repeated question on sufficient CLOSED gap',
  F10_OFF_SLOT_MISHANDLING: 'Off-slot answer mishandling',
  F11_CONTRADICTION_MISHANDLING: 'Contradiction not surfaced / resolved',
  F12_CORRECTION_ROLLBACK: 'Correction not applied to state',
  F13_MULTI_FACT_LOSS: 'Multi-fact utterance collapsed to single blob',
  F14_UNSUPPORTED_CLAIM_ACCEPTANCE: 'Overclaim stored as FACT',
  F15_PREMATURE_JUDGMENT: 'Judgment or closeout before evidence',
  F16_WRONG_NEXT_QUESTION_RATIONALE: 'Next question reason not aligned with gaps',
};

/** Harness F1–F10 → suggested Sprint 2 codes (one failure may map to multiple). */
export const HARNESS_TO_SPRINT2: Partial<Record<AccuracyFailureType, Sprint2FailureCode[]>> = {
  F1_SLOT_MISCLASSIFICATION: ['F01_CUSTOMER_POLLUTION', 'F02_PROBLEM_POLLUTION', 'F13_MULTI_FACT_LOSS'],
  F2_STATE_OVERWRITE: ['F06_CLOSED_STATE_REGRESSION'],
  F3_GAP_MISCLASSIFICATION: ['F06_CLOSED_STATE_REGRESSION', 'F07_OPEN_GAP_MISSED'],
  F4_REPEATED_QUESTION: ['F09_REPEATED_QUESTION'],
  F5_BAD_ANSWER_HANDLING: ['F10_OFF_SLOT_MISHANDLING'],
  F6_CONTRADICTION_HANDLING: ['F11_CONTRADICTION_MISHANDLING'],
  F7_EVIDENCE_INFERENCE_CONFUSION: ['F04_FACT_ASSUMPTION_CONFUSION', 'F05_INFERENCE_AS_FACT'],
  F8_QUESTION_PRIORITY: ['F08_WRONG_GAP_PRIORITY', 'F16_WRONG_NEXT_QUESTION_RATIONALE'],
};

export function sprint2CodesFromHarness(types: AccuracyFailureType[]): Sprint2FailureCode[] {
  const out = new Set<Sprint2FailureCode>();
  for (const t of types) {
    for (const c of HARNESS_TO_SPRINT2[t] ?? []) out.add(c);
  }
  return [...out];
}
