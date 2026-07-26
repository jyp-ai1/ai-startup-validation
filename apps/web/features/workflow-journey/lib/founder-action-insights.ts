/** Rule-based AI PM comments after each Action Workspace answer (pre-LLM). */

const INSIGHTS: Record<string, Record<number, string>> = {
  interview: {
    0: 'insightInterviewPain',
    1: 'insightInterviewPricing',
    2: 'insightInterviewAlt',
  },
  pricing: {
    0: 'insightPricingSensitivity',
    1: 'insightPricingTrust',
    2: 'insightPricingPayment',
  },
  competitor: {
    0: 'insightCompetitorAlt',
    1: 'insightCompetitorGap',
    2: 'insightCompetitorEdge',
  },
  landing: {
    0: 'insightLandingValue',
    1: 'insightLandingCta',
  },
  generic: {
    0: 'insightGenericSignal',
  },
};

export function resolveActionAnswerInsightKey(
  kind: string,
  stepIndex: number,
): string {
  const kindInsights = INSIGHTS[kind] ?? INSIGHTS.generic;
  const keys = Object.keys(kindInsights).map(Number).sort((a, b) => a - b);
  const matched = keys.filter((index) => index <= stepIndex).pop();
  const step = matched ?? keys[0] ?? 0;
  return kindInsights[step] ?? 'insightGenericSignal';
}
