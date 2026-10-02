/**
 * CPO Sprint 1 — Accuracy failure classification (F1–F10).
 */

export type AccuracyFailureType =
  | 'F1_SLOT_MISCLASSIFICATION'
  | 'F2_STATE_OVERWRITE'
  | 'F3_GAP_MISCLASSIFICATION'
  | 'F4_REPEATED_QUESTION'
  | 'F5_BAD_ANSWER_HANDLING'
  | 'F6_CONTRADICTION_HANDLING'
  | 'F7_EVIDENCE_INFERENCE_CONFUSION'
  | 'F8_QUESTION_PRIORITY'
  | 'F9_REASONING'
  | 'F10_JUDGMENT';

export const ACCURACY_FAILURE_LABELS: Record<AccuracyFailureType, string> = {
  F1_SLOT_MISCLASSIFICATION: 'Slot misclassification',
  F2_STATE_OVERWRITE: 'State overwrite / preservation failure',
  F3_GAP_MISCLASSIFICATION: 'Gap misclassification',
  F4_REPEATED_QUESTION: 'Repeated question on CLOSED gap',
  F5_BAD_ANSWER_HANDLING: 'Wrong-slot / irrelevant answer handling',
  F6_CONTRADICTION_HANDLING: 'Contradiction not surfaced',
  F7_EVIDENCE_INFERENCE_CONFUSION: 'Fact vs assumption vs inference',
  F8_QUESTION_PRIORITY: 'Next question priority mismatch',
  F9_REASONING: 'Reasoning accuracy',
  F10_JUDGMENT: 'Business judgment accuracy',
};

export type AccuracyGateId =
  | 'GATE_1_UNDERSTANDING'
  | 'GATE_2_PRESERVATION'
  | 'GATE_3_WRONG_ANSWER'
  | 'GATE_4_REPEAT'
  | 'GATE_5_CONTRADICTION'
  | 'GATE_6_NEXT_QUESTION'
  | 'GATE_7_EVIDENCE'
  | 'GATE_8_REASONING'
  | 'GATE_9_JUDGMENT';
