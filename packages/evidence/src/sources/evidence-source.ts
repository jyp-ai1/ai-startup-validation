import type {
  EvidenceCollectQuery,
  EvidenceSourceProvider,
  RawEvidenceSignal,
} from '@repo/types/evidence-engine';

/** Contract for external evidence providers (Google Trends, Reddit, …). */
export interface EvidenceSource {
  readonly provider: EvidenceSourceProvider;
  /** Whether API keys / credentials are configured. */
  isAvailable(): boolean;
  /** Fetch raw signals — no LLM, no interpretation. */
  collect(query: EvidenceCollectQuery): Promise<RawEvidenceSignal[]>;
}
