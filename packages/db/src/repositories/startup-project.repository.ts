import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateStartupProjectInput,
  StartupProject,
  UpdateStartupProjectInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'startup_projects';

type StartupProjectRow = {
  id: string;
  title: string;
  summary: string;
  problem: string | null;
  solution: string | null;
  target_customer: string | null;
  industry: string | null;
  business_model: string | null;
  status: StartupProject['status'];
  created_at: string;
  updated_at: string;
};

function toStartupProject(row: StartupProjectRow): StartupProject {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    problem: row.problem,
    solution: row.solution,
    targetCustomer: row.target_customer,
    industry: row.industry,
    businessModel: row.business_model,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateStartupProjectInput) {
  return {
    title: input.title,
    summary: input.summary,
    problem: input.problem ?? null,
    solution: input.solution ?? null,
    target_customer: input.targetCustomer ?? null,
    industry: input.industry ?? null,
    business_model: input.businessModel ?? null,
    status: input.status ?? 'DRAFT',
  };
}

function toUpdateRow(input: UpdateStartupProjectInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.problem !== undefined ? { problem: input.problem } : {}),
    ...(input.solution !== undefined ? { solution: input.solution } : {}),
    ...(input.targetCustomer !== undefined
      ? { target_customer: input.targetCustomer }
      : {}),
    ...(input.industry !== undefined ? { industry: input.industry } : {}),
    ...(input.businessModel !== undefined
      ? { business_model: input.businessModel }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type StartupProjectRepository = BaseRepository<
  StartupProject,
  CreateStartupProjectInput,
  UpdateStartupProjectInput
>;

/** Supabase adapter for startup_projects table. */
export class SupabaseStartupProjectRepository implements StartupProjectRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<StartupProject | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toStartupProject(data as StartupProjectRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<StartupProject[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as StartupProjectRow[]).map(toStartupProject);
  }

  async create(input: CreateStartupProjectInput): Promise<StartupProject> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toStartupProject(assertRow(data as StartupProjectRow, 'StartupProject'));
  }

  async update(id: ID, input: UpdateStartupProjectInput): Promise<StartupProject> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toStartupProject(assertRow(data as StartupProjectRow, 'StartupProject'));
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
