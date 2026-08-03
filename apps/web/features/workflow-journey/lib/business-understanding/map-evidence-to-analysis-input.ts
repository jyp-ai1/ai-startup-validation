/**
 * S14 — AnalysisInput Mapper: Evidence Status → Engine input.
 * Engine never sees Loop. No new Rules.
 */
import type { AnalysisInput, BusinessTypeId, StageId } from '@/lib/analysis-engine/types';
import type { WorkspaceEvidenceStatusMap } from './evidence-status';

export function mapEvidenceStatusToAnalysisInput(input: {
  evidence: WorkspaceEvidenceStatusMap;
  stage?: StageId;
  businessType?: BusinessTypeId;
}): AnalysisInput {
  return {
    stage: input.stage ?? 'idea',
    businessType: input.businessType ?? 'generic',
    evidence: { ...input.evidence },
  };
}
