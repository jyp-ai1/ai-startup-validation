/**
 * DAY 8-G G-1 — CEO-facing question copy in plain language.
 * Internal engine terms may remain in logic; this layer only transforms display text.
 */

const CONSULTING_TERMS =
  /(가치\s*proposition|value\s*proposition|JTBD|검증\s*설계|기대효과|차별적\s*가치|고객\s*가치|제공\s*가치)/gi;

const GAP_QUESTION_OVERRIDES: Record<string, string> = {
  validationTestability:
    '이 서비스를 쓰면 고객에게 가장 좋아지는 점은 무엇인가요?',
  differentiationVsAlternatives:
    '지금 사용하는 방법보다 무엇이 더 편해지나요?',
  solution: '그래서 무엇을 해결하려고 하나요?',
  problemJtbd: '고객이 지금 가장 불편해하는 점은 무엇인가요?',
  customerPersona: '이 서비스를 가장 필요로 하는 사람은 누구인가요?',
  businessOneLiner: '이 사업은 누구에게 무엇을 제공하나요?',
};

const PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [
    /직접\s*배송[^?]*구체적으로\s*어떤\s*가치[^?]*\?/i,
    '이 서비스를 쓰면 고객에게 가장 좋아지는 점은 무엇인가요?',
  ],
  [/고객에게\s*어떤\s*기대효과[^?]*\?/i, '고객에게 무엇이 더 좋아지나요?'],
  [
    /기존\s*대안\s*대비\s*차별적\s*가치[^?]*\?/i,
    '지금 사용하는 방법보다 무엇이 더 편해지나요?',
  ],
  [/문제를\s*해결하는\s*방식\(제공\s*가치\)[^?]*\?/i, '그래서 무엇을 해결하려고 하나요?'],
  [/그\s*차별점이\s*고객에게\s*왜\s*중요한가요\?/i, '고객에게 무엇이 더 좋아지나요?'],
];

export function sanitizeConsultingTerms(text: string): string {
  let out = text.trim();
  if (!out) return out;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    if (pattern.test(out)) {
      out = out.replace(pattern, replacement);
    }
  }
  out = out.replace(CONSULTING_TERMS, (match) => {
    if (/기대효과/i.test(match)) return '더 좋아지는 점';
    if (/차별적\s*가치|고객\s*가치|제공\s*가치/i.test(match)) return '좋아지는 점';
    return '';
  });
  return out.replace(/\s{2,}/g, ' ').replace(/\s+\?/g, '?').trim();
}

export function toHumanLanguageQuestion(
  questionText: string,
  targetGap?: string | null,
): string {
  const trimmed = questionText.trim();
  if (/맞나요\s*[?？]?\s*$/.test(trimmed) || /이해했습니다/.test(trimmed)) {
    return sanitizeConsultingTerms(trimmed);
  }
  const gapOverride = targetGap ? GAP_QUESTION_OVERRIDES[targetGap] : undefined;
  const base = gapOverride ?? questionText;
  return sanitizeConsultingTerms(base);
}
