import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateDevelopmentSpecInput,
  DevelopmentSpec,
  UpdateDevelopmentSpecInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'development_specs';

type DevelopmentSpecRow = {
  id: string;
  project_id: string;
  prd_id: string;
  title: string;
  status: DevelopmentSpec['status'];
  summary: string | null;
  created_at: string;
  updated_at: string;
};

function toDevelopmentSpec(row: DevelopmentSpecRow): DevelopmentSpec {
  return {
    id: row.id,
    projectId: row.project_id,
    prdId: row.prd_id,
    title: row.title,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateDevelopmentSpecInput) {
  return {
    project_id: input.projectId,
    prd_id: input.prdId,
    title: input.title,
    status: input.status ?? 'DRAFT',
    summary: input.summary ?? null,
  };
}

function toUpdateRow(input: UpdateDevelopmentSpecInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type DevelopmentSpecRepository = BaseRepository<
  DevelopmentSpec,
  CreateDevelopmentSpecInput,
  UpdateDevelopmentSpecInput
> & {
  findByProjectId(projectId: ID): Promise<DevelopmentSpec[]>;
  findByPRDId(prdId: ID): Promise<DevelopmentSpec[]>;
};

export class SupabaseDevelopmentSpecRepository implements DevelopmentSpecRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<DevelopmentSpec | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toDevelopmentSpec(data as DevelopmentSpecRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<DevelopmentSpec[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecRow[]).map(toDevelopmentSpec);
  }

  async findByPRDId(prdId: ID): Promise<DevelopmentSpec[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('prd_id', prdId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecRow[]).map(toDevelopmentSpec);
  }

  async findAll(filter?: Record<string, unknown>): Promise<DevelopmentSpec[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecRow[]).map(toDevelopmentSpec);
  }

  async create(input: CreateDevelopmentSpecInput): Promise<DevelopmentSpec> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toDevelopmentSpec(assertRow(data as DevelopmentSpecRow, 'DevelopmentSpec'));
  }

  async update(id: ID, input: UpdateDevelopmentSpecInput): Promise<DevelopmentSpec> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toDevelopmentSpec(assertRow(data as DevelopmentSpecRow, 'DevelopmentSpec'));
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
