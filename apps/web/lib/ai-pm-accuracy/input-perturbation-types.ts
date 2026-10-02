/**
 * CPO Sprint 2 — input perturbation catalog (Track C).
 * Applied per turn in multi-business scripts; not a fixed global question order.
 */

export const INPUT_PERTURBATION_TYPES = [
  'normal',
  'sparse',
  'verbose',
  'multi_fact',
  'off_slot',
  'contradiction',
  'unsupported_claim',
  'uncertainty',
  'correction',
  'refusal',
  'repeated',
  'mixed',
] as const;

export type InputPerturbationType = (typeof INPUT_PERTURBATION_TYPES)[number];

export const INPUT_PERTURBATION_LABELS: Record<InputPerturbationType, string> = {
  normal: '정상',
  sparse: '불완전',
  verbose: '장황',
  multi_fact: 'multi-fact',
  off_slot: 'off-slot',
  contradiction: 'contradiction',
  unsupported_claim: 'unsupported claim',
  uncertainty: 'uncertainty (WTP 등)',
  correction: 'correction',
  refusal: 'refusal / 모름',
  repeated: 'repeated answer',
  mixed: 'mixed (multi-type in one session)',
};

/** Harness invariants commonly checked per perturbation (CPO rubric hints). */
export const PERTURBATION_INVARIANT_HINTS: Record<InputPerturbationType, string[]> = {
  normal: ['L1 facts grounded in utterance'],
  sparse: ['L2 PARTIAL/OPEN not over-closed'],
  verbose: ['L1 extract semantic core without blob duplication'],
  multi_fact: ['L1 split customer/user/payer/problem/revenue'],
  off_slot: ['Gate off-slot — no slot contamination', 'L3 re-ask asked gap'],
  contradiction: ['Gate CONTRADICTED + clarify'],
  unsupported_claim: ['FACT not assigned to overclaim'],
  uncertainty: ['ASSUMPTION not FACT; revenueModel vs pricingHint'],
  correction: ['L2 supersede/correct prior fact'],
  refusal: ['L3 probe same gap without inventing facts'],
  repeated: ['L3 F4 no repeat on CLOSED gap'],
  mixed: ['L1–L3 combined stress across turns'],
};

/** CPO Sprint 2A — 10 lab perturbations (Phase 1 capture). */
export const VALIDATION_LAB_PERTURBATIONS: InputPerturbationType[] = [
  'normal',
  'sparse',
  'multi_fact',
  'off_slot',
  'contradiction',
  'repeated',
  'uncertainty',
  'unsupported_claim',
  'correction',
  'mixed',
];
