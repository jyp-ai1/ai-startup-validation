import type { GeneratedEvidenceItem, ResearchResultPayload } from './research-agent-types';

/** Agent output → structured evidence — does NOT call Decision Engine. */
export function buildEvidenceFromResult(result: ResearchResultPayload): GeneratedEvidenceItem[] {
  return result.evidence.map((item) => ({ ...item }));
}

export function countEvidence(result: ResearchResultPayload | null): number {
  return result?.evidence.length ?? 0;
}
