import type { Logger } from '@repo/core/logger';

import { EvidenceCollectorService } from '../collector/evidence-collector-service';
import type { EvidenceInterpreter } from '../interpreter/evidence-interpreter';
import { EvidenceInterpreterService } from '../pipeline/evidence-guards';
import type { EvidenceSource } from '../sources/evidence-source';
import type { EvidenceStore } from '../store/evidence-store';

import type {
  EvidenceCollectQuery,
  EvidenceCollectionResult,
  EvidenceInterpretationResult,
  EvidenceSourceProvider,
} from '@repo/types/evidence-engine';
import type { ID } from '@repo/types';

/**
 * Collector → Store → Interpreter pipeline.
 *
 * Collection and interpretation are strictly separated:
 * - Collector gathers raw signals from providers
 * - Store persists evidence
 * - Interpreter adds meaning (LLM) — never creates evidence
 */
export class EvidencePipeline {
  private readonly collector: EvidenceCollectorService;
  private readonly interpreterService: EvidenceInterpreterService;

  constructor(
    logger: Logger,
    sources: EvidenceSource[],
    store: EvidenceStore,
    interpreter: EvidenceInterpreter,
  ) {
    this.collector = new EvidenceCollectorService(logger, sources, store);
    this.interpreterService = new EvidenceInterpreterService(interpreter, store);
  }

  /** Step 1: Collect raw evidence from providers. */
  async collect(
    query: EvidenceCollectQuery,
    providers?: EvidenceSourceProvider[],
  ): Promise<EvidenceCollectionResult> {
    return this.collector.collect(query, providers);
  }

  /** Step 2: Interpret stored evidence (LLM). Never creates evidence. */
  async interpret(evidenceIds: ID[]): Promise<EvidenceInterpretationResult> {
    return this.interpreterService.interpretByIds(evidenceIds);
  }

  listAvailableProviders(): EvidenceSourceProvider[] {
    return this.collector.listAvailableProviders();
  }
}
