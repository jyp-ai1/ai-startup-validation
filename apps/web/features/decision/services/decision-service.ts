import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { listGrants } from '@/features/grants/services/grant-service';

import { decisionService } from './decision-engine';
import { enrichDecisionInput, statsToDecisionInput } from './decision-input';
import type { DecisionResult } from './decision-types';

export async function generateProjectDecision(
  projectId: string,
): Promise<DecisionResult | null> {
  const stats = await buildProjectDashboardStats(projectId);
  if (!stats) return null;

  const grants = await listGrants(projectId);
  const avgFitScore =
    grants.length > 0
      ? Math.round(grants.reduce((sum, g) => sum + (g.fitScore ?? 0), 0) / grants.length)
      : null;

  const input = enrichDecisionInput(statsToDecisionInput(stats), avgFitScore);
  return decisionService.generateDecision(input);
}

export type { DecisionResult } from './decision-types';
