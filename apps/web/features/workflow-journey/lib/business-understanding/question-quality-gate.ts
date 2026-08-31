/**
 * TTAEJYO P0 — User-facing question quality gate.
 * Separates internal reframe context (whyNow / digest) from the ask shown in UI.
 * Invalid meta-language candidates → deterministic canonical question by targetGap.
 */

import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import {
  GENERIC_GAP_QUESTION_TEXT,
  isGenericGapQuestionText,
  resolveGapQuestionBinding,
} from './gap-question-map';

/** Patterns that must never appear in founder-facing ask text. */
const META_LANGUAGE_PATTERNS: RegExp[] = [
  /현재\s*이해\s*[(:（]/,
  /다시\s*묻습니다/,
  /핵심\s*공백/,
  /이\s*답변으로는\s*확인/,
  /분석\s*결과를?\s*기준으로/,
  /왜\s*지금\s*이\s*질문/,
  /이번\s*질문\s*[\n·]/,
  /를?\s*기준으로\s*다시/,
  /중간\s*정리\s*후\s*재판단/,
  /사업\s*사실에\s*반영되지\s*않/,
  /남은\s*핵심\s*공백/,
];

export function hasQuestionMetaLanguage(text: string | null | undefined): boolean {
  const q = text?.trim();
  if (!q) return false;
  return META_LANGUAGE_PATTERNS.some((pattern) => pattern.test(q));
}

/** True when text is safe to show as the primary ask (not generic stub, no meta). */
export function isNaturalUserFacingQuestion(text: string | null | undefined): boolean {
  const q = text?.trim();
  if (!q || q.length < 6) return false;
  if (isGenericGapQuestionText(q)) return false;
  if (hasQuestionMetaLanguage(q)) return false;
  return true;
}

/**
 * Apply user-facing quality gate.
 * Valid candidate → unchanged; invalid → canonical gap / issue question.
 */
export function gateUserFacingQuestion(input: {
  candidate: string;
  targetGap?: string | null;
  fallbackIssueId?: AiPmLoopIssueId | null;
}): string {
  const trimmed = input.candidate?.trim() ?? '';
  if (isNaturalUserFacingQuestion(trimmed)) return trimmed;

  const binding = resolveGapQuestionBinding(
    input.targetGap,
    input.fallbackIssueId ?? undefined,
  );
  const canonical = binding.questionText.trim();
  if (isNaturalUserFacingQuestion(canonical)) return canonical;

  return canonical || GENERIC_GAP_QUESTION_TEXT;
}
