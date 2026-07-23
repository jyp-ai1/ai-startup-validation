import type { DecisionResult } from '@/features/decision';

import type { ExecutiveInboxItem } from './executive-types';

/** Mock executive inbox — structure for future AI-driven alerts. */
export function buildExecutiveInbox(decision: DecisionResult): ExecutiveInboxItem[] {
  const items: ExecutiveInboxItem[] = [
    {
      id: 'inbox-market',
      type: 'MARKET_UPDATE',
      titleKey: 'inbox.marketGrowth.title',
      summaryKey: 'inbox.marketGrowth.summary',
      occurredAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      priority: 'HIGH',
      read: false,
    },
    {
      id: 'inbox-competitor',
      type: 'COMPETITOR_INVESTMENT',
      titleKey: 'inbox.competitorInvestment.title',
      summaryKey: 'inbox.competitorInvestment.summary',
      occurredAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
      priority: 'MEDIUM',
      read: false,
    },
    {
      id: 'inbox-policy',
      type: 'POLICY_CHANGE',
      titleKey: 'inbox.policyChange.title',
      summaryKey: 'inbox.policyChange.summary',
      occurredAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
      priority: 'MEDIUM',
      read: true,
    },
  ];

  if (decision.explanation.evidenceCoverage.overallPercent < 70) {
    items.unshift({
      id: 'inbox-evidence',
      type: 'EVIDENCE_DROP',
      titleKey: 'inbox.evidenceDrop.title',
      summaryKey: 'inbox.evidenceDrop.summary',
      occurredAt: new Date().toISOString(),
      priority: 'HIGH',
      read: false,
    });
  }

  return items.slice(0, 5);
}
