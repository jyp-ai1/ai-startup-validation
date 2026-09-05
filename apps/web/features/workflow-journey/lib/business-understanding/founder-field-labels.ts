/**
 * DAY 6 — CEO-facing field labels (presentation layer only).
 * Maps internal domain/gap keys → Korean product language. Never expose raw keys in UI.
 */
import { BUSINESS_UNDERSTANDING_DOMAIN } from './understanding-contract';

/** CEO language aligned with build-ceo-six-surfaces GAP_LABELS + product copy. */
const FOUNDER_FIELD_LABEL: Record<string, string> = {
  businessOneLiner: '사업 한 줄',
  categoryScope: '시장 범위',
  customerPersona: '고객 페르소나',
  payer: '구매자',
  problemJtbd: '핵심 문제',
  problemFrequencySeverity: '문제 빈도·심각도',
  solution: '솔루션',
  differentiationHypothesis: '차별 가설',
  revenueModel: '수익 모델',
  pricingHint: '가격',
  marketChannel: '시장',
  marketSizeEvidence: '수요',
  alternativesCompetitors: '대안/경쟁',
  differentiationVsAlternatives: '차별점',
  topRisks: '리스크',
  validationTestability: '검증 가능성',
  executionConstraints: '역량·제약',
  evidenceStrengthSummary: '근거 강도',
  currentJudgment: '현재 판단',
  nextAction: '다음 행동',
};

const INTERNAL_FIELD_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** All registered internal domain keys — used to detect leaks in user-facing copy. */
export const INTERNAL_DOMAIN_KEYS = new Set<string>(
  BUSINESS_UNDERSTANDING_DOMAIN.map((d) => d.key),
);

/** Korean label for a domain/gap field — never returns the raw internal key. */
export function founderFieldLabel(fieldKey: string): string {
  const trimmed = fieldKey.trim();
  return FOUNDER_FIELD_LABEL[trimmed] ?? '확인 항목';
}

/** True when text looks like an internal camelCase schema key. */
export function isInternalFieldKey(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (INTERNAL_DOMAIN_KEYS.has(trimmed)) return true;
  return INTERNAL_FIELD_KEY_PATTERN.test(trimmed) && /[A-Z]/.test(trimmed);
}
