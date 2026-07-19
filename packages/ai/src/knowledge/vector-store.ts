export type VectorRecord = {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
};

export type VectorSearchResult = {
  id: string;
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type VectorSearchOptions = {
  topK?: number;
  filter?: Record<string, unknown>;
};

/** Vector storage port — real vector DB adapters deferred to future sprint. */
export interface VectorStore {
  insert(records: VectorRecord[]): Promise<void>;
  search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  delete(documentId: string): Promise<void>;
}

const DEFAULT_DIMENSIONS = 64;

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic mock embedding for local similarity search. */
export function mockEmbed(text: string, dimensions = DEFAULT_DIMENSIONS): number[] {
  const vector = new Array(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  for (const token of tokens) {
    const index = hashToken(token) % dimensions;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/** In-memory mock vector store backed by deterministic embeddings. */
export class MockVectorStore implements VectorStore {
  private records: VectorRecord[] = [];

  async insert(records: VectorRecord[]): Promise<void> {
    const normalized = records.map((record) => ({
      ...record,
      embedding:
        record.embedding.length > 0 ? record.embedding : mockEmbed(record.content),
    }));
    this.records.push(...normalized);
  }

  async search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const topK = options?.topK ?? 5;
    const queryVector = mockEmbed(query);

    const scored = this.records
      .filter((record) => matchesFilter(record.metadata, options?.filter))
      .map((record) => ({
        id: record.id,
        documentId: record.documentId,
        content: record.content,
        score: cosineSimilarity(queryVector, record.embedding),
        metadata: record.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  async delete(documentId: string): Promise<void> {
    this.records = this.records.filter((record) => record.documentId !== documentId);
  }

  load(records: VectorRecord[]): void {
    this.records = records.map((record) => ({
      ...record,
      embedding:
        record.embedding.length > 0 ? record.embedding : mockEmbed(record.content),
    }));
  }
}

function matchesFilter(
  metadata: Record<string, unknown> | undefined,
  filter: Record<string, unknown> | undefined,
): boolean {
  if (!filter) return true;
  if (!metadata) return false;

  return Object.entries(filter).every(([key, value]) => metadata[key] === value);
}
