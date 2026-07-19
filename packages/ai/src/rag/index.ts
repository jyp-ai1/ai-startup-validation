export type Document = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type Chunk = {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
};

export type SearchResult = {
  chunk: Chunk;
  score: number;
  document?: Document;
};

export type RetrievalQuery = {
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
};

/** RAG retriever port — implementation deferred (vector DB in future sprint). */
export interface RetrieverPort {
  retrieve(query: RetrievalQuery): Promise<SearchResult[]>;
  addDocuments?(documents: Document[]): Promise<void>;
  deleteDocument?(documentId: string): Promise<void>;
}

export type DocumentChunker = {
  chunk(document: Document, options?: { maxTokens?: number; overlap?: number }): Chunk[];
};
