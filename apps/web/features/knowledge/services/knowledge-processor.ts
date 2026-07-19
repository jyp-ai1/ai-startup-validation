import {
  buildEvidenceDocumentContent,
  chunkText,
  createKnowledgeRetriever,
  mockEmbed,
  type RetrieverChunk,
} from '@repo/ai/knowledge';
import type { Evidence, KnowledgeResult } from '@repo/types/validation';

import { listEvidence } from '@/features/evidence/services/evidence-service';
import {
  getKnowledgeChunkRepository,
  getKnowledgeDocumentRepository,
} from '@/lib/db/platform';

import {
  findKnowledgeDocumentByEvidence,
  findProjectKnowledgeChunks,
} from './knowledge-service';

function evidenceToDocumentContent(evidence: Evidence): string {
  return buildEvidenceDocumentContent({
    title: evidence.title,
    summary: evidence.summary,
    content: evidence.content,
    sourceName: evidence.sourceName,
    category: evidence.category,
  });
}

async function processSingleEvidence(
  projectId: string,
  evidence: Evidence,
): Promise<{ created: boolean; documentId: string }> {
  const docRepo = getKnowledgeDocumentRepository();
  const chunkRepo = getKnowledgeChunkRepository();

  const existing = await findKnowledgeDocumentByEvidence(evidence.id);
  const content = evidenceToDocumentContent(evidence);

  let document =
    existing ??
    (await docRepo.create({
      projectId,
      sourceType: 'EVIDENCE',
      sourceId: evidence.id,
      title: evidence.title,
      content,
      status: 'PROCESSING',
    }));

  if (existing) {
    document = await docRepo.update(existing.id, {
      title: evidence.title,
      content,
      status: 'PROCESSING',
    });
    await chunkRepo.deleteByDocumentId(document.id);
  }

  try {
    const chunks = chunkText(content);
    const chunkInputs = chunks.map((chunk, index) => ({
      documentId: document.id,
      content: chunk.content,
      chunkIndex: index,
      embedding: mockEmbed(chunk.content),
      metadata: {
        evidenceId: evidence.id,
        documentTitle: evidence.title,
        sourceType: 'EVIDENCE',
        category: evidence.category,
        sourceName: evidence.sourceName,
      },
    }));

    await chunkRepo.createMany(chunkInputs);
    await docRepo.update(document.id, { status: 'COMPLETED' });

    return { created: !existing, documentId: document.id };
  } catch {
    await docRepo.update(document.id, { status: 'FAILED' });
    throw new Error(`Failed to process evidence: ${evidence.title}`);
  }
}

export async function processProjectEvidence(projectId: string): Promise<{
  processed: number;
  created: number;
  updated: number;
}> {
  const evidenceItems = await listEvidence(projectId);
  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const evidence of evidenceItems) {
    const result = await processSingleEvidence(projectId, evidence);
    processed += 1;
    if (result.created) created += 1;
    else updated += 1;
  }

  return { processed, created, updated };
}

export async function searchProjectKnowledge(
  projectId: string,
  question: string,
  topK = 5,
): Promise<KnowledgeResult[]> {
  const indexedChunks = await findProjectKnowledgeChunks(projectId);
  if (indexedChunks.length === 0) return [];

  const retrieverChunks: RetrieverChunk[] = indexedChunks.map((chunk) => ({
    id: chunk.id,
    documentId: chunk.documentId,
    content: chunk.content,
    embedding: chunk.embedding,
    metadata: chunk.metadata,
    documentTitle: chunk.document.title,
    sourceType: chunk.document.sourceType,
  }));

  const retriever = createKnowledgeRetriever(retrieverChunks);
  return retriever.searchChunks(question, retrieverChunks, topK);
}
