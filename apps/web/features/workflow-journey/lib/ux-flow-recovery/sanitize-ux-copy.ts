/**
 * Presentation-only sanitizer for founder-facing UX.
 * Does not change AI PM / V3 semantics.
 */

const INTERNAL_TOKEN_RE =
  /\b(targetGap|gapState|lastDecision|evaluator|fieldKey|rawLine|score|coveragePercent|machine[- ]?readable)\b/gi;

const CAMEL_KEY_RE = /\b[a-z]+[A-Z][A-Za-z0-9]+\b/g;

const COVERAGE_LINE_RE = /이해 상태 커버리지\s*\d+%[^.。]*/g;

export function sanitizeUxCopy(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(COVERAGE_LINE_RE, '')
    .replace(INTERNAL_TOKEN_RE, '')
    .replace(CAMEL_KEY_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

export function hasInternalUxLeak(text: string | null | undefined): boolean {
  if (!text) return false;
  return (
    INTERNAL_TOKEN_RE.test(text) ||
    /targetGap|coveragePercent|evaluator/i.test(text) ||
    CAMEL_KEY_RE.test(text)
  );
}
