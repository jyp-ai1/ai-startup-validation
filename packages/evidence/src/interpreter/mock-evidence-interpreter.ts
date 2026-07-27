import type { Evidence } from '@repo/types/validation';
import type { EvidenceInterpretation } from '@repo/types/evidence-engine';

import type { EvidenceInterpreter } from './evidence-interpreter';

/**
 * Template-based interpreter — no LLM calls in Sprint 3.1.
 * Real LLM wiring lands in Sprint 3.2 via @repo/ai.
 */
export class MockEvidenceInterpreter implements EvidenceInterpreter {
  async interpret(evidence: Evidence[]): Promise<EvidenceInterpretation[]> {
    const now = new Date().toISOString();
    return evidence.map((item, index) => ({
      id: `interp-${item.id}-${index}`,
      evidenceId: item.id,
      meaning: `Based on "${item.title}", this supports refining your ${item.category.toLowerCase()} hypothesis.`,
      whyItMatters: `${item.sourceName ?? 'Source'} data (${item.summary}) affects decision confidence on ${item.category}.`,
      confidence: item.confidence,
      interpretedAt: now,
    }));
  }
}
