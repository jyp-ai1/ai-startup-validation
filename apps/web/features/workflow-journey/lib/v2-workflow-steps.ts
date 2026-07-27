import type { V2EvidenceField, V2ValidationEvidence } from './v2-validation-store';
import { isEvidenceFieldFilled } from './v2-validation-store';

export type WorkflowStepId =
  | 'idea'
  | 'problem'
  | 'customer'
  | 'market'
  | 'competition'
  | 'bm'
  | 'mvp'
  | 'review';

export type WorkflowStepStatus = 'done' | 'active' | 'pending' | 'inProgress';

export const WORKFLOW_NAV_STEPS: WorkflowStepId[] = [
  'idea',
  'problem',
  'customer',
  'market',
  'competition',
  'bm',
  'mvp',
];

export const INPUT_STEP_FIELDS: Partial<Record<WorkflowStepId, V2EvidenceField | 'idea'>> = {
  idea: 'idea',
  problem: 'problem',
  customer: 'customer',
  bm: 'pricing',
  mvp: 'mvp',
};

export function stepUsesEvidenceField(step: WorkflowStepId): step is keyof typeof INPUT_STEP_FIELDS {
  return step in INPUT_STEP_FIELDS;
}

export function getStepField(step: WorkflowStepId): V2EvidenceField | 'idea' | null {
  return INPUT_STEP_FIELDS[step] ?? null;
}

export function isInputStepFilled(step: WorkflowStepId, evidence: V2ValidationEvidence): boolean {
  const field = getStepField(step);
  if (!field) return false;
  return isEvidenceFieldFilled(field, evidence);
}

export function getStepStatus(
  step: WorkflowStepId,
  activeStep: WorkflowStepId,
  evidence: V2ValidationEvidence,
  reviewCount: number,
): WorkflowStepStatus {
  if (step === activeStep) return 'active';

  if (step === 'market' || step === 'competition') {
    if (reviewCount > 0) return 'done';
    return 'pending';
  }

  if (step === 'review') {
    if (reviewCount > 0) return 'done';
    return 'pending';
  }

  if (isInputStepFilled(step, evidence)) return 'done';
  return 'pending';
}

export function getDefaultActiveStep(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): WorkflowStepId {
  if (!isEvidenceFieldFilled('idea', evidence)) return 'idea';

  for (const step of WORKFLOW_NAV_STEPS) {
    if (step === 'market' || step === 'competition') {
      if (reviewCount === 0) return 'market';
      continue;
    }
    if (!isInputStepFilled(step, evidence)) return step;
  }

  if (reviewCount === 0) return 'market';
  return 'review';
}

export function getNextRecommendedStep(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): WorkflowStepId {
  if (!isEvidenceFieldFilled('customer', evidence)) return 'customer';
  if (!isEvidenceFieldFilled('pricing', evidence)) return 'bm';
  if (reviewCount === 0) return 'market';
  if (!isEvidenceFieldFilled('problem', evidence)) return 'problem';
  return 'review';
}
