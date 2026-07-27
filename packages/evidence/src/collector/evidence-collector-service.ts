import type { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';
import type {
  EvidenceCollectQuery,
  EvidenceCollectionResult,
  EvidenceSourceProvider,
} from '@repo/types/evidence-engine';

import type { EvidenceSource } from '../sources/evidence-source';
import type { EvidenceStore } from '../store/evidence-store';

/** Orchestrates provider collection → store. No LLM in this path. */
export class EvidenceCollectorService extends BaseService {
  constructor(
    logger: Logger,
    private readonly sources: EvidenceSource[],
    private readonly store: EvidenceStore,
  ) {
    super(logger);
  }

  async collect(
    query: EvidenceCollectQuery,
    providers?: EvidenceSourceProvider[],
  ): Promise<EvidenceCollectionResult> {
    const active = this.resolveSources(providers);
    const signals = (
      await Promise.all(
        active.map(async (source) => {
          try {
            return await source.collect(query);
          } catch (err) {
            this.logError('Evidence source failed', {
              provider: source.provider,
              error: err instanceof Error ? err.message : String(err),
            });
            return [];
          }
        }),
      )
    ).flat();

    const evidence = await this.store.saveFromSignals(query.projectId, signals);

    this.logInfo('Evidence collected', {
      projectId: query.projectId,
      count: evidence.length,
      providers: active.map((s) => s.provider),
    });

    return {
      projectId: query.projectId,
      evidence,
      collectedAt: new Date().toISOString(),
      providers: active.map((s) => s.provider),
    };
  }

  listAvailableProviders(): EvidenceSourceProvider[] {
    return this.sources.filter((s) => s.isAvailable()).map((s) => s.provider);
  }

  private resolveSources(
    providers?: EvidenceSourceProvider[],
  ): EvidenceSource[] {
    const available = this.sources.filter((s) => s.isAvailable());
    if (!providers?.length) return available;
    return available.filter((s) => providers.includes(s.provider));
  }
}
