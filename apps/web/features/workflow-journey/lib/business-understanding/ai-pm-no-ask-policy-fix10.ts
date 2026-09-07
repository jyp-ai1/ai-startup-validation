/**
 * FIX-10 test helper — exposes confirm copy builder without widening no-ask exports.
 */

import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';

const GAP_CONFIRM_LABEL: Record<string, string> = {
  businessOneLiner: '사업 한 줄',
  customerPersona: '핵심 고객',
};

function clipValue(value: string, max = 48): string {
  const t = value.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function buildConfirmTextForTest(
  gapId: string,
  value: string,
  userConfirmed = false,
): string {
  if (isAiPmJudgmentFix10V1Active()) {
    if (gapId === 'businessOneLiner') {
      return `제가 이해한 사업은 「${clipValue(value, 80)}」입니다. 맞나요?`;
    }
    if (gapId === 'customerPersona' && !userConfirmed) {
      return `AI가 「${clipValue(value, 36)}」을(를) 주요 고객으로 추정했습니다. 맞나요?`;
    }
  }
  const label = GAP_CONFIRM_LABEL[gapId] ?? '내용';
  return `${label}은(는) 「${clipValue(value, 36)}」으로 이해했습니다. 맞나요?`;
}
