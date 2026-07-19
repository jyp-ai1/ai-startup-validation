import type { KnowledgeResult } from '@repo/types/validation';

import { mockEmbed, cosineSimilarity, type VectorStore, MockVectorStore } from './vector-store';

export type RetrieverChunk = {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  documentTitle: string;
  sourceType: string;
};

export type KnowledgeRetrieverOptions = {
  topK?: number;
  vectorStore?: VectorStore;
};

/** Knowledge retriever — mock similarity search over indexed chunks. */
export class KnowledgeRetriever {
  constructor(private readonly vectorStore: VectorStore = new MockVectorStore()) {}

  loadChunks(chunks: RetrieverChunk[]): void {
    if (this.vectorStore instanceof MockVectorStore) {
      this.vectorStore.load(
        chunks.map((chunk) => ({
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          embedding: chunk.embedding.length > 0 ? chunk.embedding : mockEmbed(chunk.content),
          metadata: {
            ...chunk.metadata,
            documentTitle: chunk.documentTitle,
            sourceType: chunk.sourceType,
          },
        })),
      );
    }
  }

  async query(question: string, options?: KnowledgeRetrieverOptions): Promise<KnowledgeResult[]> {
    const topK = options?.topK ?? 5;
    const store = options?.vectorStore ?? this.vectorStore;
    const results = await store.search(question, { topK });

    return results.map((result) => ({
      title: String(result.metadata?.documentTitle ?? 'Knowledge Chunk'),
      content: result.content,
      source: String(result.metadata?.sourceType ?? 'EVIDENCE'),
      score: Number(result.score.toFixed(4)),
      documentId: result.documentId,
      chunkId: result.id,
    }));
  }

  /** Direct search without VectorStore when embeddings are already loaded in memory. */
  searchChunks(question: string, chunks: RetrieverChunk[], topK = 5): KnowledgeResult[] {
    const queryVector = mockEmbed(question);

    return chunks
      .map((chunk) => {
        const embedding =
          chunk.embedding.length > 0 ? chunk.embedding : mockEmbed(chunk.content);
        return {
          title: chunk.documentTitle,
          content: chunk.content,
          source: chunk.sourceType,
          score: Number(cosineSimilarity(queryVector, embedding).toFixed(4)),
          documentId: chunk.documentId,
          chunkId: chunk.id,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export function createKnowledgeRetriever(chunks: RetrieverChunk[] = []): KnowledgeRetriever {
  const retriever = new KnowledgeRetriever();
  if (chunks.length > 0) {
    retriever.loadChunks(chunks);
  }
  return retriever;
}
