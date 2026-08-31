/**
 * TTAEJYO P0 — User-facing question quality gate.
 * Separates internal reframe context (whyNow / digest) from the ask shown in UI.
 * Invalid meta-language / non-answerable candidates → deterministic canonical by targetGap.
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
  /현재\s*이해/,
  /다시\s*묻습니다/,
  /핵심\s*공백/,
  /이\s*답변으로는\s*확인/,
  /분석\s*결과를?\s*기준으로/,
  /분석\s*결과/,
  /검토\s*결과/,
  /판단\s*결과/,
  /왜\s*지금\s*이\s*질문/,
  /이번\s*질문\s*[\n·]/,
  /를?\s*기준으로\s*다시/,
  /중간\s*정리\s*후\s*재판단/,
  /사업\s*사실에\s*반영되지\s*않/,
  /남은\s*핵심\s*공백/,
  /아직\s*확인이?\s*필요/,
  /이\s*내용을?\s*기준으로/,
  /현재\s*상황을?\s*기준으로/,
];

const GENERIC_IMPERATIVE_RE = /(?:알려|설명해|확인해|말씀해)\s*주세요/;

const META_PREFIX_RE =
  /(?:현재\s*이해|다시\s*묻|기준으로\s*다시|핵심\s*공백|아직\s*확인|분석\s*결과|검토\s*결과|판단\s*결과|이\s*내용을?\s*기준|현재\s*상황을?\s*기준)/;

/** Korean interrogative / answer-target cues. */
const ANSWER_TARGET_RE =
  /[?？]|(?:누구|무엇|뭐|왜|어떻|얼마|어디|언제|몇\s|어느|인가요|입니까|나요|습니까|할까요|있나요|있습니까|무엇인가요|무엇입니까)/;

/** Multiple gap-demand signals in one ask. */
const COMPOUND_GAP_DEMAND_RE =
  /(?:누구).{0,48}(?:왜|비용|지불|경쟁|차별)|(?:고객).{0,48}(?:비용|지불|경쟁|차별)|(?:누구).{0,24}(?:이며|이고)/;

export function hasQuestionMetaLanguage(text: string | null | undefined): boolean {
  const q = text?.trim();
  if (!q) return false;
  return META_LANGUAGE_PATTERNS.some((pattern) => pattern.test(q));
}

/** Meta/instruction prefix combined with bare generic imperative (not valid "X 알려 주세요"). */
export function hasMetaPrefixWithGenericImperative(text: string): boolean {
  const q = text.trim();
  if (!GENERIC_IMPERATIVE_RE.test(q)) return false;
  if (/[가-힣]{2,}(?:이|은|는|을|를|인지|에\s*대해).{0,80}알려\s*주세요/.test(q)) {
    return false;
  }
  return META_PREFIX_RE.test(q);
}

/** True when text lacks a clear subject/topic the user should answer about. */
export function lacksClearAnswerTarget(text: string): boolean {
  const q = text.trim();
  if (!q) return true;
  if (isGenericGapQuestionText(q)) return true;

  if (
    /^(?:아직\s*확인이?\s*필요한\s*)?(?:핵심\s*공백이?\s*있습니다\.?\s*)?(?:알려|설명해|확인해|말씀해)\s*주세요\.?\s*$/.test(
      q,
    )
  ) {
    return true;
  }

  if (/기준으로\s*다시\s*(?:말씀해|알려|설명)/.test(q) && !/[?？]/.test(q)) {
    return true;
  }

  if (/[가-힣]{2,}(?:이|은|는|을|를|인지|에\s*대해).{0,80}알려\s*주세요/.test(q)) {
    return false;
  }

  if (ANSWER_TARGET_RE.test(q)) return false;

  if (GENERIC_IMPERATIVE_RE.test(q)) return true;

  return false;
}

/** Compound ask: multiple question marks or multiple gap demands in one surface. */
export function isCompoundAsk(text: string): boolean {
  const q = text.trim();
  const qMarkCount = (q.match(/[?？]/g) ?? []).length;
  if (qMarkCount > 1) return true;
  if (COMPOUND_GAP_DEMAND_RE.test(q)) return true;

  const commaSegments = q.split(/[,，]/).filter((s) => s.trim().length > 4);
  if (commaSegments.length >= 3 && qMarkCount >= 1) return true;

  if (/(?:이고|이며).{0,40}(?:이고|이며)/.test(q)) return true;

  return false;
}

/** True when text is safe to show as the primary ask (natural + answerable + single ask). */
export function isNaturalUserFacingQuestion(text: string | null | undefined): boolean {
  const q = text?.trim();
  if (!q || q.length < 6) return false;
  if (isGenericGapQuestionText(q)) return false;
  if (hasQuestionMetaLanguage(q)) return false;
  if (hasMetaPrefixWithGenericImperative(q)) return false;
  if (lacksClearAnswerTarget(q)) return false;
  if (isCompoundAsk(q)) return false;
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
