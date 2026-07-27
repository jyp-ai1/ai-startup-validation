import type { Evidence } from '@repo/types/validation';
import type { EvidenceInterpretation } from '@repo/types/evidence-engine';

/**
 * Interprets stored evidence — LLM role is interpretation only.
 * Must NEVER create or invent evidence signals.
 */
export interface EvidenceInterpreter {
  interpret(evidence: Evidence[]): Promise<EvidenceInterpretation[]>;
}
