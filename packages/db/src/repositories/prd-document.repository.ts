import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type { CreatePRDInput, PRD, UpdatePRDInput } from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'prd_documents';

type PRDRow = {
  id: string;
  project_id: string;
  title: string;
  status: PRD['status'];
  summary: string | null;
  created_at: string;
  updated_at: string;
};

function toPRD(row: PRDRow): PRD {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreatePRDInput) {
  return {
    project_id: input.projectId,
    title: input.title,
    status: input.status ?? 'DRAFT',
    summary: input.summary ?? null,
  };
}

function toUpdateRow(input: UpdatePRDInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type PRDRepository = BaseRepository<PRD, CreatePRDInput, UpdatePRDInput> & {
  findByProjectId(projectId: ID): Promise<PRD[]>;
};

export class SupabasePRDRepository implements PRDRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<PRD | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toPRD(data as PRDRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<PRD[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as PRDRow[]).map(toPRD);
  }

  async findAll(filter?: Record<string, unknown>): Promise<PRD[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as PRDRow[]).map(toPRD);
  }

  async create(input: CreatePRDInput): Promise<PRD> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toPRD(assertRow(data as PRDRow, 'PRD'));
  }

  async update(id: ID, input: UpdatePRDInput): Promise<PRD> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toPRD(assertRow(data as PRDRow, 'PRD'));
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
