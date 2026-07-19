import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateKnowledgeChunkInput,
  KnowledgeChunk,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'knowledge_chunks';

type KnowledgeChunkRow = {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
};

function toKnowledgeChunk(row: KnowledgeChunkRow): KnowledgeChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    embedding: Array.isArray(row.embedding) ? row.embedding : [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toInsertRow(input: CreateKnowledgeChunkInput) {
  return {
    document_id: input.documentId,
    content: input.content,
    chunk_index: input.chunkIndex,
    embedding: input.embedding,
    metadata: input.metadata ?? {},
  };
}

export type KnowledgeChunkRepository = BaseRepository<
  KnowledgeChunk,
  CreateKnowledgeChunkInput,
  never
> & {
  findByDocumentId(documentId: ID): Promise<KnowledgeChunk[]>;
  findByProjectId(projectId: ID): Promise<KnowledgeChunk[]>;
  createMany(inputs: CreateKnowledgeChunkInput[]): Promise<KnowledgeChunk[]>;
  deleteByDocumentId(documentId: ID): Promise<void>;
};

export class SupabaseKnowledgeChunkRepository implements KnowledgeChunkRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<KnowledgeChunk | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toKnowledgeChunk(data as KnowledgeChunkRow) : null;
  }

  async findByDocumentId(documentId: ID): Promise<KnowledgeChunk[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as KnowledgeChunkRow[]).map(toKnowledgeChunk);
  }

  async findByProjectId(projectId: ID): Promise<KnowledgeChunk[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*, knowledge_documents!inner(project_id)')
      .eq('knowledge_documents.project_id', projectId);

    assertNoError(error);
    return ((data ?? []) as KnowledgeChunkRow[]).map(toKnowledgeChunk);
  }

  async findAll(): Promise<KnowledgeChunk[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('chunk_index', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as KnowledgeChunkRow[]).map(toKnowledgeChunk);
  }

  async create(input: CreateKnowledgeChunkInput): Promise<KnowledgeChunk> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toKnowledgeChunk(assertRow(data as KnowledgeChunkRow, 'KnowledgeChunk'));
  }

  async createMany(inputs: CreateKnowledgeChunkInput[]): Promise<KnowledgeChunk[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from(TABLE)
      .insert(inputs.map(toInsertRow))
      .select('*');

    assertNoError(error);
    return ((data ?? []) as KnowledgeChunkRow[])
      .map(toKnowledgeChunk)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async update(): Promise<KnowledgeChunk> {
    throw new Error('Knowledge chunks are immutable after creation');
  }

  async delete(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async deleteByDocumentId(documentId: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('document_id', documentId);
    assertNoError(error);
  }

  async exists(id: ID): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select('*', { count: 'exact', head: true });
    assertNoError(error);
    return count ?? 0;
  }
}
