import type { EmbeddingRequest, EmbeddingResponse } from '../types';

/** Embedding provider port — no vector DB implementation. */
export interface EmbeddingProviderPort {
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  embedBatch?(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]>;
}

export type EmbeddingProviderFactory = () => EmbeddingProviderPort;
