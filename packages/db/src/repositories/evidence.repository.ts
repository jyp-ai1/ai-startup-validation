import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateEvidenceInput,
  Evidence,
  EvidenceListFilter,
  UpdateEvidenceInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'evidence';

type EvidenceRow = {
  id: string;
  project_id: string;
  research_id: string | null;
  title: string;
  source_type: Evidence['sourceType'];
  source_name: string | null;
  source_url: string | null;
  summary: string;
  content: string | null;
  category: Evidence['category'];
  confidence: Evidence['confidence'];
  published_date: string | null;
  created_at: string;
  updated_at: string;
};

function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    projectId: row.project_id,
    researchId: row.research_id,
    title: row.title,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    summary: row.summary,
    content: row.content,
    category: row.category,
    confidence: row.confidence,
    publishedDate: row.published_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateEvidenceInput) {
  return {
    project_id: input.projectId,
    research_id: input.researchId ?? null,
    title: input.title,
    source_type: input.sourceType ?? null,
    source_name: input.sourceName ?? null,
    source_url: input.sourceUrl ?? null,
    summary: input.summary,
    content: input.content ?? null,
    category: input.category,
    confidence: input.confidence ?? 'MEDIUM',
    published_date: input.publishedDate ?? null,
  };
}

function toUpdateRow(input: UpdateEvidenceInput) {
  return {
    ...(input.researchId !== undefined ? { research_id: input.researchId } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.sourceType !== undefined ? { source_type: input.sourceType } : {}),
    ...(input.sourceName !== undefined ? { source_name: input.sourceName } : {}),
    ...(input.sourceUrl !== undefined ? { source_url: input.sourceUrl } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.publishedDate !== undefined
      ? { published_date: input.publishedDate }
      : {}),
    updated_at: new Date().toISOString(),
  };
}

export type EvidenceRepository = BaseRepository<
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput
> & {
  findByProjectId(
    projectId: ID,
    filter?: EvidenceListFilter,
  ): Promise<Evidence[]>;
};

/** Supabase adapter for evidence table. */
export class SupabaseEvidenceRepository implements EvidenceRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<Evidence | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toEvidence(data as EvidenceRow) : null;
  }

  async findByProjectId(
    projectId: ID,
    filter?: EvidenceListFilter,
  ): Promise<Evidence[]> {
    let query = this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.sourceType) {
      query = query.eq('source_type', filter.sourceType);
    }
    if (filter?.confidence) {
      query = query.eq('confidence', filter.confidence);
    }

    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as EvidenceRow[]).map(toEvidence);
  }

  async findAll(filter?: Record<string, unknown>): Promise<Evidence[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as EvidenceRow[]).map(toEvidence);
  }

  async create(input: CreateEvidenceInput): Promise<Evidence> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toEvidence(assertRow(data as EvidenceRow, 'Evidence'));
  }

  async update(id: ID, input: UpdateEvidenceInput): Promise<Evidence> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toEvidence(assertRow(data as EvidenceRow, 'Evidence'));
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
