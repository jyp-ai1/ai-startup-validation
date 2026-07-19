import { isSupabaseConfigured } from '@repo/db';
import type { KnowledgeChunk, KnowledgeDocument } from '@repo/types/validation';

import {
  getKnowledgeChunkRepository,
  getKnowledgeDocumentRepository,
} from '@/lib/db/platform';

export async function listKnowledgeDocuments(projectId: string): Promise<KnowledgeDocument[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getKnowledgeDocumentRepository();
  return repo.findByProjectId(projectId);
}

export async function findKnowledgeDocument(id: string): Promise<KnowledgeDocument | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getKnowledgeDocumentRepository();
  return repo.findById(id);
}

export async function findKnowledgeDocumentByEvidence(
  evidenceId: string,
): Promise<KnowledgeDocument | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getKnowledgeDocumentRepository();
  return repo.findBySource('EVIDENCE', evidenceId);
}

export async function findKnowledgeChunks(documentId: string): Promise<KnowledgeChunk[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getKnowledgeChunkRepository();
  return repo.findByDocumentId(documentId);
}

export async function findProjectKnowledgeChunks(projectId: string): Promise<
  Array<KnowledgeChunk & { document: KnowledgeDocument }>
> {
  if (!isSupabaseConfigured()) return [];

  const documents = await listKnowledgeDocuments(projectId);
  const chunkRepo = getKnowledgeChunkRepository();
  const results: Array<KnowledgeChunk & { document: KnowledgeDocument }> = [];

  for (const document of documents) {
    if (document.status !== 'COMPLETED') continue;
    const chunks = await chunkRepo.findByDocumentId(document.id);
    for (const chunk of chunks) {
      results.push({ ...chunk, document });
    }
  }

  return results;
}
