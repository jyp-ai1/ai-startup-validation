/**
 * DAY 8-F — Question presentation metadata (not V3 SoT).
 */

export type AiPmQuestionPresentationType = 'open' | 'confirm';

export type AiPmConfirmBinding = {
  gapId: string;
  proposedValue: string;
  sourceTurnAppliedAt?: string;
};

export type AiPmQuestionPresentation = {
  questionType: AiPmQuestionPresentationType;
  confirmBinding?: AiPmConfirmBinding;
};

const CONFIRM_QUESTION_RE = /맞나요\s*[?？]?\s*$/;
const CONFIRM_POLLUTION_RE =
  /^(네\s*[,，]?\s*맞|맞습니다|yes\b|ok\b|b\s*가\s*네\s*맞)/i;

const INTERNAL_WHY_RE =
  /\b(semantic repeat|memory_document|memory_user|no-ask|targetGap|gapId|gapState|routing|policy|MOVE|CONFIRM)\b/i;

export function isConfirmPollutionValue(value: string | null | undefined): boolean {
  const t = value?.trim() ?? '';
  if (!t) return true;
  if (CONFIRM_POLLUTION_RE.test(t)) return true;
  if (t.length <= 3) return true;
  return false;
}

export function inferQuestionPresentationType(
  questionText: string,
  explicit?: AiPmQuestionPresentationType,
): AiPmQuestionPresentationType {
  if (explicit) return explicit;
  return CONFIRM_QUESTION_RE.test(questionText.trim()) ? 'confirm' : 'open';
}

/** CEO-facing whyNow — strips engine diagnostics. */
export function sanitizeCeoWhyNow(text: string | null | undefined): string {
  let t = text?.trim() ?? '';
  if (!t) return '다음 판단을 위해 아래 내용을 확인하고 싶습니다.';
  if (INTERNAL_WHY_RE.test(t)) {
    t = t.replace(/\([^)]*(semantic repeat|memory_|no-ask)[^)]*\)/gi, '');
    t = t.replace(INTERNAL_WHY_RE, '').replace(/\s+/g, ' ').trim();
  }
  if (!t || t.length < 8) {
    return '방금 말씀하신 내용을 바탕으로 확인합니다.';
  }
  return t;
}

const CONFIRM_KNOWN_VALUE_RE = /「([^」]+)」/;

/** Parse proposed value from confirm question copy when decision metadata is missing. */
export function extractConfirmKnownValueFromQuestion(
  questionText: string | null | undefined,
): string | null {
  const match = questionText?.match(CONFIRM_KNOWN_VALUE_RE);
  const value = match?.[1]?.trim() ?? '';
  return value && !isConfirmPollutionValue(value) ? value : null;
}

export function defaultConfirmWhyNow(): string {
  return '방금 말씀하신 내용을 바탕으로 확인합니다.';
}
