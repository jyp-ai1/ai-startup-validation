/**
 * Re-verify #3 — CPO independent expected guidance (NOT verdict).
 * CPO fills Verdict after reading Actual @ matching git SHA.
 */

export const CPO_REVERIFY_3_ROW_GUIDANCE: Record<string, string> = {
  'golden-c-wrong-slot:1': [
    'competitor = FACT, value "배달앱" (explicit 경쟁사)',
    'revenue = FACT, value "월 매출 3천만원" (no competitor clause)',
    'customerPersona = OPEN',
    'revenueModel = PARTIAL (operational revenue snapshot, not full BM)',
  ].join('\n'),
  'golden-h-wtp-assumption:1': [
    'WTP rhetoric → ASSUMPTION (not FACT)',
    'pricingHint = PARTIAL',
    'revenueModel = OPEN (must not receive WTP assumption)',
    'no customerPersona CLOSED from WTP-only answer',
  ].join('\n'),
};

export function reverify3Key(scenarioId: string, turn: number): string {
  return `${scenarioId}:${turn}`;
}
