import type { ID } from '@repo/types';
import type {
  Evidence,
  EvidenceListFilter,
  CreateEvidenceInput,
} from '@repo/types/validation';
import type {
  EvidenceSourceProvider,
  RawEvidenceSignal,
} from '@repo/types/evidence-engine';

import type { EvidenceStore } from './evidence-store';

const PROVIDER_SOURCE_TYPE: Record<
  EvidenceSourceProvider,
  Evidence['sourceType']
> = {
  GOOGLE_TRENDS: 'STATISTICS',
  PRODUCT_HUNT: 'WEBSITE',
  CRUNCHBASE: 'REPORT',
  GITHUB: 'WEBSITE',
  NEWS: 'NEWS',
  REDDIT: 'ARTICLE',
  COMPETITOR: 'WEBSITE',
  YOUTUBE: 'ARTICLE',
  SEARCH_VOLUME: 'STATISTICS',
};

function signalToEvidence(
  projectId: ID,
  signal: RawEvidenceSignal,
  index: number,
): Evidence {
  const id = `ev-${signal.provider.toLowerCase()}-${index}-${Date.now()}`;
  const now = new Date().toISOString();
  return {
    id,
    projectId,
    researchId: null,
    title: signal.title,
    sourceType: PROVIDER_SOURCE_TYPE[signal.provider],
    sourceName: signal.provider.replace(/_/g, ' '),
    sourceUrl: signal.sourceUrl ?? null,
    summary: signal.signal,
    content: signal.metric ? `Metric: ${signal.metric}` : null,
    category: signal.category,
    confidence: 'MEDIUM',
    publishedDate: signal.fetchedAt,
    createdAt: now,
    updatedAt: now,
  };
}

/** In-memory store for dev, tests, and mock pipeline. */
export class InMemoryEvidenceStore implements EvidenceStore {
  private readonly records = new Map<ID, Evidence>();

  async saveFromSignals(
    projectId: ID,
    signals: RawEvidenceSignal[],
  ): Promise<Evidence[]> {
    return Promise.all(
      signals.map(async (signal, index) => {
        const evidence = signalToEvidence(projectId, signal, index);
        this.records.set(evidence.id, evidence);
        return evidence;
      }),
    );
  }

  async create(input: CreateEvidenceInput): Promise<Evidence> {
    const id = `ev-manual-${Date.now()}`;
    const now = new Date().toISOString();
    const evidence: Evidence = {
      id,
      projectId: input.projectId,
      researchId: input.researchId ?? null,
      title: input.title,
      sourceType: input.sourceType ?? null,
      sourceName: input.sourceName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      summary: input.summary,
      content: input.content ?? null,
      category: input.category,
      confidence: input.confidence ?? 'MEDIUM',
      publishedDate: input.publishedDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(id, evidence);
    return evidence;
  }

  async findById(id: ID): Promise<Evidence | null> {
    return this.records.get(id) ?? null;
  }

  async findByProjectId(
    projectId: ID,
    filter?: EvidenceListFilter,
  ): Promise<Evidence[]> {
    let list = [...this.records.values()].filter(
      (e) => e.projectId === projectId,
    );
    if (filter?.category) {
      list = list.filter((e) => e.category === filter.category);
    }
    if (filter?.sourceType) {
      list = list.filter((e) => e.sourceType === filter.sourceType);
    }
    if (filter?.confidence) {
      list = list.filter((e) => e.confidence === filter.confidence);
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
