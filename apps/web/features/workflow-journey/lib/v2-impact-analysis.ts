import type { InvestigationTopic } from './v2-next-action-engine';

export type ChangedField = 'idea' | 'problem' | 'customer' | 'mvp' | 'pricing';

export type ImpactLevel = 'stale' | 'reevaluate' | 'none';

const IMPACT_MAP: Record<ChangedField, Record<InvestigationTopic, ImpactLevel>> = {
  idea: {
    market: 'stale',
    competition: 'stale',
    pricing: 'reevaluate',
    differentiation: 'stale',
  },
  problem: {
    market: 'stale',
    competition: 'stale',
    pricing: 'none',
    differentiation: 'reevaluate',
  },
  customer: {
    market: 'reevaluate',
    competition: 'reevaluate',
    pricing: 'stale',
    differentiation: 'reevaluate',
  },
  mvp: {
    market: 'none',
    competition: 'none',
    pricing: 'none',
    differentiation: 'stale',
  },
  pricing: {
    market: 'none',
    competition: 'none',
    pricing: 'stale',
    differentiation: 'none',
  },
};

export function getImpactAnalysis(
  changedField: ChangedField | null,
  isStale: boolean,
): Record<InvestigationTopic, ImpactLevel> {
  const none: Record<InvestigationTopic, ImpactLevel> = {
    market: 'none',
    competition: 'none',
    pricing: 'none',
    differentiation: 'none',
  };
  if (!isStale || !changedField) return none;
  return IMPACT_MAP[changedField];
}

export function hasAnyImpact(impacts: Record<InvestigationTopic, ImpactLevel>): boolean {
  return Object.values(impacts).some((level) => level !== 'none');
}
