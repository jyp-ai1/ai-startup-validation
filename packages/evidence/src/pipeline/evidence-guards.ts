import { ValidationError } from '@repo/core/errors';
import type { ID } from '@repo/types';
import type { Evidence } from '@repo/types/validation';
import type {
  EvidenceInterpretation,
  EvidenceInterpretationResult,
  JudgmentWithEvidence,
} from '@repo/types/evidence-engine';

import type { EvidenceInterpreter } from '../interpreter/evidence-interpreter';
import type { EvidenceStore } from '../store/evidence-store';

/** Rule #1 — LaunchLens never answers first. */
export class EvidenceRequiredError extends ValidationError {
  constructor(message = 'LaunchLens never answers first. Evidence is required before judgment.') {
    super(message);
    this.name = 'EvidenceRequiredError';
  }
}

export function assertJudgmentHasEvidence(judgment: JudgmentWithEvidence): void {
  if (!judgment.evidenceIds.length) {
    throw new EvidenceRequiredError(
      `Judgment on "${judgment.topic}" requires at least one linked evidence ID.`,
    );
  }
}

export function assertEvidenceExists(
  evidence: Evidence[],
  requiredIds: ID[],
): void {
  const found = new Set(evidence.map((e) => e.id));
  const missing = requiredIds.filter((id) => !found.has(id));
  if (missing.length) {
    throw new EvidenceRequiredError(
      `Missing evidence IDs: ${missing.join(', ')}`,
    );
  }
}

/** Evidence → Interpretation only. Never creates evidence. */
export class EvidenceInterpreterService {
  constructor(
    private readonly interpreter: EvidenceInterpreter,
    private readonly store: EvidenceStore,
  ) {}

  async interpretByIds(evidenceIds: ID[]): Promise<EvidenceInterpretationResult> {
    if (!evidenceIds.length) {
      throw new EvidenceRequiredError('Cannot interpret without evidence IDs.');
    }

    const evidence = await Promise.all(
      evidenceIds.map((id) => this.store.findById(id)),
    );
    const resolved = evidence.filter((e): e is Evidence => e !== null);

    assertEvidenceExists(resolved, evidenceIds);

    const interpretations = await this.interpreter.interpret(resolved);

    return {
      interpretations,
      evidenceIds,
      interpretedAt: new Date().toISOString(),
    };
  }
}
