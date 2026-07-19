export { chunkText, buildEvidenceDocumentContent, type ChunkTextOptions, type TextChunk } from './chunker';
export {
  MockVectorStore,
  mockEmbed,
  cosineSimilarity,
  type VectorStore,
  type VectorRecord,
  type VectorSearchResult,
  type VectorSearchOptions,
} from './vector-store';
export {
  KnowledgeRetriever,
  createKnowledgeRetriever,
  type RetrieverChunk,
  type KnowledgeRetrieverOptions,
} from './retriever';
