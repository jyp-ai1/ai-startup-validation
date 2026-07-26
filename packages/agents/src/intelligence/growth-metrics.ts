import type {
  AgentDecisionResult,
  FounderGrowthMetrics,
  ResearchOutput,
} from '../types';

function domainConfidence(research: ResearchOutput, domain: string): number {
  return research.findings.find((f) => f.domain === domain)?.confidence ?? 0;
}

/** AI Growth agent — computes Founder-facing success metrics from research + decision. */
export function computeFounderGrowthMetrics(
  research: ResearchOutput,
  decision: AgentDecisionResult,
  previousSuccessScore?: number,
): FounderGrowthMetrics {
  const market = domainConfidence(research, 'market');
  const customer = domainConfidence(research, 'customer');
  const pricing = domainConfidence(research, 'pricing');
  const investment = domainConfidence(research, 'investment');

  const successScore = Math.min(
    99,
    Math.round(
      market * 0.25 +
        customer * 0.3 +
        pricing * 0.2 +
        investment * 0.1 +
        decision.confidence * 0.15,
    ),
  );

  const successDelta =
    previousSuccessScore != null ? Math.max(0, successScore - previousSuccessScore) : 3;

  const executionRate = Math.min(100, Math.round((market + customer) / 2));
  const learningRate = Math.min(100, Math.round(customer * 0.8 + pricing * 0.2));

  return {
    successScore,
    successDelta,
    businessProgress: { market, customer, pricing, investment },
    executionRate,
    learningRate,
    marketReadiness: market,
    productReadiness: Math.round((customer + pricing) / 2),
    fundraisingReadiness: Math.round((investment + decision.confidence) / 2),
  };
}
