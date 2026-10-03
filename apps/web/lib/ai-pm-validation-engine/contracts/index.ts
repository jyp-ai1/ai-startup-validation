/** Validation Engine — contract types (P1 schema freeze). Aligned with docs/.../schemas/*.json */

export type GapCompleteness =
  | 'OPEN'
  | 'PARTIAL'
  | 'CLOSED'
  | 'CONFLICT'
  | 'UNKNOWN'
  | 'ASSUMPTION'
  | 'INFERENCE';

export type SlotValueMeta = {
  value: string;
  source?: 'founder' | 'document' | 'inferred' | 'unknown';
  certainty?: GapCompleteness;
  /** L5 internal — Evidence Strength 1 (opinion) … 5 (commitment) */
  evidenceStrength?: 1 | 2 | 3 | 4 | 5;
};

export type BusinessScenarioContract = {
  id: string;
  archetype: string;
  documentText: string;
  groundTruth: Partial<Record<string, SlotValueMeta>>;
  set?: 'development' | 'calibration' | 'regression' | 'holdout' | 'real';
};

export type AnswerBehaviorId =
  | 'normal'
  | 'sparse'
  | 'multi_fact'
  | 'off_slot'
  | 'contradiction'
  | 'correction'
  | 'uncertainty'
  | 'overclaim'
  | 'repeated'
  | 'irrelevant'
  | 'ambiguous'
  | 'partial'
  | 'refusal'
  /** Sprint 2 — Turn 1..5+ scripted preservation path (calibration harness only). */
  | 'longitudinal_f11'
  /** Sprint 2 — revenue assumption → validation → pricing gap (calibration harness only). */
  | 'longitudinal_f04_pricing';

export type AnswerBehaviorContract = {
  id: AnswerBehaviorId;
  description: string;
};

export type StateTransition = {
  slot: string;
  from: GapCompleteness;
  to: GapCompleteness;
  trigger: 'answer' | 'correction' | 'contradiction' | 'off_slot' | 'system';
};

export type ConversationStateContract = {
  gaps: Record<string, GapCompleteness>;
  facts: Record<string, string>;
  transitionLog: StateTransition[];
};

export type ExpectedTurnContract = {
  input: string;
  expectedFacts?: unknown[];
  expectedState?: Record<string, string>;
  expectedGaps?: Record<string, GapCompleteness>;
  acceptableQuestionIntent?: string[];
  forbiddenInterpretations?: string[];
};

export type EvaluationVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'PENDING';

export type EvaluationResultContract = {
  understanding: EvaluationVerdict;
  state: EvaluationVerdict;
  gap: EvaluationVerdict;
  question: EvaluationVerdict;
  reasoning: EvaluationVerdict;
  judgment: EvaluationVerdict;
  failureType: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  stateDrift?: boolean;
  evidenceStrengthMisuse?: boolean;
};
