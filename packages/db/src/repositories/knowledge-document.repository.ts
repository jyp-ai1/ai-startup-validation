import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateKnowledgeDocumentInput,
  KnowledgeDocument,
  KnowledgeSourceType,
  UpdateKnowledgeDocumentInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'knowledge_documents';

type KnowledgeDocumentRow = {
  id: string;
  project_id: string;
  source_type: KnowledgeDocument['sourceType'];
  source_id: string;
  title: string;
  content: string;
  status: KnowledgeDocument['status'];
  created_at: string;
  updated_at: string;
};

function toKnowledgeDocument(row: KnowledgeDocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateKnowledgeDocumentInput) {
  return {
    project_id: input.projectId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    title: input.title,
    content: input.content,
    status: input.status ?? 'PENDING',
  };
}

function toUpdateRow(input: UpdateKnowledgeDocumentInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type KnowledgeDocumentRepository = BaseRepository<
  KnowledgeDocument,
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput
> & {
  findByProjectId(projectId: ID): Promise<KnowledgeDocument[]>;
  findBySource(
    sourceType: KnowledgeSourceType,
    sourceId: ID,
  ): Promise<KnowledgeDocument | null>;
};

export class SupabaseKnowledgeDocumentRepository implements KnowledgeDocumentRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<KnowledgeDocument | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toKnowledgeDocument(data as KnowledgeDocumentRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<KnowledgeDocument[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as KnowledgeDocumentRow[]).map(toKnowledgeDocument);
  }

  async findBySource(
    sourceType: KnowledgeSourceType,
    sourceId: ID,
  ): Promise<KnowledgeDocument | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle();

    assertNoError(error);
    return data ? toKnowledgeDocument(data as KnowledgeDocumentRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<KnowledgeDocument[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as KnowledgeDocumentRow[]).map(toKnowledgeDocument);
  }

  async create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocument> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toKnowledgeDocument(assertRow(data as KnowledgeDocumentRow, 'KnowledgeDocument'));
  }

  async update(id: ID, input: UpdateKnowledgeDocumentInput): Promise<KnowledgeDocument> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toKnowledgeDocument(assertRow(data as KnowledgeDocumentRow, 'KnowledgeDocument'));
  }

  async delete(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async exists(id: ID): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async count(filter?: Record<string, unknown>): Promise<number> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*', { count: 'exact', head: true }),
      filter,
    );
    const { count, error } = await query;
    assertNoError(error);
    return count ?? 0;
  }
}
