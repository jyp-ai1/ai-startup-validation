/**
 * CPO Sprint 2A — Validation Lab row schema (actual AI pipeline output).
 */

import type { InputPerturbationType } from './input-perturbation-types';

export type ValidationLabRow = {
  businessId: string;
  businessSet: string;
  scenario: string;
  perturbation: InputPerturbationType;
  turn: number;

  userInput: string;

  /** UI-facing summary (understanding delta / rationale — not LLM prose) */
  aiVisibleResponse: string | null;

  answerUnderstanding: {
    extractedFacts: unknown[];
    intent: string | null;
    quality: string | null;
    contradictions: unknown[];
  };

  stateBefore: Record<string, string>;
  stateAfter: Record<string, string>;
  gapBefore: Record<string, string>;
  gapAfter: Record<string, string>;

  askedGapId: string | null;
  askedQuestionText: string | null;

  actualNextQuestion: string | null;
  actualNextQuestionTargetGap: string | null;
  nextQuestionReason: string | null;

  /** CPO fills — not CTO auto-PASS */
  expectedInterpretation: string | null;
  expectedState: string | null;
  expectedGap: string | null;
  /** L4: question family / decision purpose, not exact string */
  expectedQuestionFamily: string | null;

  ctoStructuralPass: boolean | null;
  cpoVerdict: 'PENDING_CPO_2PASS';
  failureType: string[];

  gitSha: string | null;
};

export type ValidationLabPack = {
  generatedAt: string;
  sprint: 'SPRINT_2A_VALIDATION_LAB';
  phase: 'PHASE_1_ACTUAL_EVIDENCE';
  dynamicQuestionOrder: true;
  matrix: { businesses: number; perturbations: number; rows: number };
  holdoutPolicy: 'biz-16-17 holdout; biz-14-15 regression (Layer A probe acknowledged contamination)';
  rows: ValidationLabRow[];
};
