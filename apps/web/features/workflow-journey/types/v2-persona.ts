import type { WorkflowGoalId } from '../types';

export const V2_PERSONA_COOKIE = 'V2_PERSONA_ID';

/** V2 STEP 0 — four persona cards (Sprint 0 UX Reset). */
export const V2_PERSONA_IDS = [
  'idea-review',
  'startup-prep',
  'company-ops',
  'investment-prep',
] as const;

export type V2PersonaId = (typeof V2_PERSONA_IDS)[number];

export function isV2PersonaId(value: string): value is V2PersonaId {
  return (V2_PERSONA_IDS as readonly string[]).includes(value);
}

/** Maps persona → existing workflow engine goal (engines unchanged). */
export const PERSONA_TO_GOAL: Record<V2PersonaId, WorkflowGoalId> = {
  'idea-review': 'business-viability',
  'startup-prep': 'new-business',
  'company-ops': 'business-viability',
  'investment-prep': 'investment-prep',
};

/** Personas that skip validation and go straight to workspace list. */
export const PERSONA_SKIP_VALIDATION: ReadonlySet<V2PersonaId> = new Set([]);

export function getPersonaNextRoute(personaId: V2PersonaId): string {
  if (PERSONA_SKIP_VALIDATION.has(personaId)) {
    return '/workspace';
  }
  return '/workflow';
}
