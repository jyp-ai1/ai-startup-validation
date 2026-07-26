import type { WorkflowGoalId } from '../types';
import type { V2PersonaId } from '../types/v2-persona';

/** One-line project stage — replaces 8-step workflow rail. */
export const GOAL_PHASE_KEYS: Record<WorkflowGoalId, string> = {
  'business-viability': 'ideaValidation',
  'new-business': 'startupPrep',
  'mvp-development': 'mvpValidation',
  'investment-prep': 'investmentPrep',
  'market-research': 'marketResearch',
};

export const PERSONA_PHASE_KEYS: Record<V2PersonaId, string> = {
  'idea-review': 'ideaValidation',
  'startup-prep': 'startupPrep',
  'company-ops': 'companyOps',
  'investment-prep': 'investmentPrep',
};

export type V2AiPmStatus = 'investigating' | 'analyzing' | 'awaitingApproval' | 'executing';

export function resolveProjectPhaseKey(
  goalId: WorkflowGoalId,
  personaId?: V2PersonaId | null,
): string {
  if (personaId && PERSONA_PHASE_KEYS[personaId]) {
    return PERSONA_PHASE_KEYS[personaId];
  }
  return GOAL_PHASE_KEYS[goalId] ?? 'ideaValidation';
}

export function resolveAiPmStatus(input: {
  approved: boolean;
  hasPendingApproval: boolean;
}): V2AiPmStatus {
  if (input.approved) return 'executing';
  if (input.hasPendingApproval) return 'awaitingApproval';
  return 'analyzing';
}
