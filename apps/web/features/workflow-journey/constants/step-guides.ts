/** Mock step guide metadata — duration + required inputs (Epic 1 Sprint 2). */
export type StepGuideMeta = {
  durationMinutes: number;
  requiredFieldKeys: string[];
};

export const STEP_GUIDE_META: Record<string, StepGuideMeta> = {
  context: {
    durationMinutes: 5,
    requiredFieldKeys: ['projectName', 'oneLiner', 'targetCustomer'],
  },
  market: {
    durationMinutes: 4,
    requiredFieldKeys: ['marketName', 'competitorUrl', 'targetCustomer'],
  },
  competition: {
    durationMinutes: 6,
    requiredFieldKeys: ['competitorUrl', 'differentiation'],
  },
  evidence: {
    durationMinutes: 8,
    requiredFieldKeys: ['sources', 'claims'],
  },
  decision: {
    durationMinutes: 5,
    requiredFieldKeys: ['verdictRationale'],
  },
  execution: {
    durationMinutes: 10,
    requiredFieldKeys: ['nextQuarterActions'],
  },
};

export function getStepGuideMeta(stepId: string): StepGuideMeta {
  return (
    STEP_GUIDE_META[stepId] ?? {
      durationMinutes: 5,
      requiredFieldKeys: ['notes'],
    }
  );
}
