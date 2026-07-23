import { generateProjectDecision } from '@/features/decision/services/decision-service';

import type { ExecutionPlan } from './orchestrator-types';

/**
 * Decision Trigger — ONLY the orchestrator may invoke Decision Engine.
 * Requires approved execution plan.
 */
export async function triggerDecisionForPlan(plan: ExecutionPlan) {
  if (plan.approvalStatus !== 'APPROVED') {
    throw new Error('Decision requires approved orchestrator plan');
  }

  return generateProjectDecision(plan.projectId);
}
