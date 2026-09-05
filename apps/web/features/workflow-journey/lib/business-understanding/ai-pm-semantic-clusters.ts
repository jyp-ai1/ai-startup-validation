/**
 * DAY 8-B — Semantic question clusters (UX dedup units, not gap replacements).
 * Cluster dedup is a soft ranking penalty — never a hard block.
 */

export type SemanticClusterId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

const GAP_TO_CLUSTER: Record<string, SemanticClusterId> = {
  problemJtbd: 'C1',
  problemFrequencySeverity: 'C1',
  customerPersona: 'C1',
  alternativesCompetitors: 'C2',
  differentiationVsAlternatives: 'C3',
  differentiationHypothesis: 'C3',
  validationTestability: 'C3',
  executionConstraints: 'C3',
  solution: 'C4',
  marketSizeEvidence: 'C5',
  marketChannel: 'C5',
  payer: 'C6',
  revenueModel: 'C6',
  pricingHint: 'C6',
  businessOneLiner: 'C1',
  categoryScope: 'C1',
};

/** Map gap fieldKey → semantic cluster. Unknown gaps return null. */
export function gapSemanticCluster(gapId: string | null | undefined): SemanticClusterId | null {
  const key = gapId?.trim();
  if (!key) return null;
  return GAP_TO_CLUSTER[key] ?? null;
}

/** Soft penalty score when repeating the same cluster (lower = deprioritize). */
export const SAME_CLUSTER_SOFT_PENALTY = 15_000;
