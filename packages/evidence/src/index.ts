import { logger } from '@repo/core/logger';

import { EvidencePipeline } from './pipeline/evidence-pipeline';
import { MockEvidenceInterpreter } from './interpreter/mock-evidence-interpreter';
import { createAllMockEvidenceSources } from './sources/mock/mock-evidence-sources';
import { InMemoryEvidenceStore } from './store/in-memory-evidence-store';

/** Pre-wired mock pipeline for dev and Sprint 3.1 QA. */
export function createMockEvidencePipeline(): EvidencePipeline {
  return new EvidencePipeline(
    logger.child('evidence-pipeline'),
    createAllMockEvidenceSources(),
    new InMemoryEvidenceStore(),
    new MockEvidenceInterpreter(),
  );
}

export { EVIDENCE_PACKAGE_VERSION } from './version';

export type { EvidenceSource } from './sources/evidence-source';
export { createMockEvidenceSource, createAllMockEvidenceSources } from './sources/mock/mock-evidence-sources';

export type { EvidenceStore } from './store/evidence-store';
export { InMemoryEvidenceStore } from './store/in-memory-evidence-store';

export type { EvidenceInterpreter } from './interpreter/evidence-interpreter';
export { MockEvidenceInterpreter } from './interpreter/mock-evidence-interpreter';

export { EvidenceCollectorService } from './collector/evidence-collector-service';
export { EvidencePipeline } from './pipeline/evidence-pipeline';
export {
  EvidenceRequiredError,
  assertJudgmentHasEvidence,
  assertEvidenceExists,
  EvidenceInterpreterService,
} from './pipeline/evidence-guards';

export {
  EVIDENCE_SOURCE_PROVIDERS,
  type EvidenceSourceProvider,
  type RawEvidenceSignal,
  type EvidenceInterpretation,
  type JudgmentWithEvidence,
  type EvidenceCollectQuery,
  type EvidenceCollectionResult,
  type EvidenceInterpretationResult,
} from '@repo/types/evidence-engine';
