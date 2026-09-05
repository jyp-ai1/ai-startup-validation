/**
 * DAY 8-B — One-line Question Trace for CPO UX verification.
 */

import type { AiPmCeoIntent } from './ai-pm-intent-policy';
import type { NextQuestionDecision } from './decide-next-question-from-review';

export type QuestionTraceInput = {
  ceoInput?: string | null;
  intent?: AiPmCeoIntent | string | null;
  understanding?: string | null;
  judgment?: string | null;
  uncertainty?: string | null;
  policy?: string | null;
  decision?: NextQuestionDecision | null;
  question?: string | null;
};

/** Compact one-line trace: CEO input → … → Question */
export function formatQuestionTrace(input: QuestionTraceInput): string {
  const parts: string[] = [];
  if (input.ceoInput?.trim()) {
    parts.push(`CEO: "${input.ceoInput.trim().slice(0, 40)}${input.ceoInput.length > 40 ? '…' : ''}"`);
  }
  if (input.intent) parts.push(`Intent=${input.intent}`);
  if (input.understanding?.trim()) {
    parts.push(`Understanding="${input.understanding.trim().slice(0, 36)}…"`);
  }
  if (input.judgment?.trim()) {
    parts.push(`Judgment="${input.judgment.trim().slice(0, 36)}…"`);
  }
  if (input.uncertainty?.trim()) parts.push(`Uncertainty="${input.uncertainty.trim().slice(0, 28)}"`);
  if (input.policy?.trim()) parts.push(`Policy=${input.policy.trim()}`);
  if (input.decision?.targetGapId) parts.push(`Decision→${input.decision.targetGapId}`);
  if (input.question?.trim()) {
    parts.push(`Q="${input.question.trim().slice(0, 40)}${input.question.length > 40 ? '…' : ''}"`);
  }
  return parts.join(' → ');
}
