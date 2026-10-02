import type { ExtractedFact } from '@repo/types/domain/answer-review';

import type { EvaluationVerdict } from './contracts';
import { inferEvidenceStrengthFromText } from './evidence-strength';

/** L5 — Evidence Strength → risk signals (no separate L6). */
export function evaluateL5FromFacts(input: {
  userAnswer: string;
  extractedFacts: ExtractedFact[];
  stageReadinessAllowsCloseout?: boolean;
}): {
  reasoning: EvaluationVerdict;
  judgment: EvaluationVerdict;
  evidenceStrengthMisuse: boolean;
  failureType: string[];
} {
  const failureType: string[] = [];
  let evidenceStrengthMisuse = false;
  let reasoning: EvaluationVerdict = 'PASS';
  let judgment: EvaluationVerdict = 'PASS';

  const strength = inferEvidenceStrengthFromText(input.userAnswer);
  const weakLanguage = /같아요|아마|불확실|모르/.test(input.userAnswer);

  for (const f of input.extractedFacts) {
    if (weakLanguage && f.evidenceClass === 'FACT' && strength <= 2) {
      evidenceStrengthMisuse = true;
      failureType.push('F04_FACT_ASSUMPTION_CONFUSION');
      reasoning = 'FAIL';
    }
    if (strength <= 1 && f.evidenceClass === 'FACT') {
      evidenceStrengthMisuse = true;
      failureType.push('F05_INFERENCE_AS_FACT');
      reasoning = 'FAIL';
    }
  }

  if (
    input.stageReadinessAllowsCloseout &&
    strength <= 2 &&
    input.extractedFacts.some((f) => f.evidenceClass === 'FACT')
  ) {
    failureType.push('F15_PREMATURE_JUDGMENT');
    judgment = 'FAIL';
  }

  return { reasoning, judgment, evidenceStrengthMisuse, failureType };
}
