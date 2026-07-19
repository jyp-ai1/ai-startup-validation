import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  BusinessPlan,
  CreateBusinessPlanInput,
  UpdateBusinessPlanInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'business_plans';

type BusinessPlanRow = {
  id: string;
  project_id: string;
  title: string;
  status: BusinessPlan['status'];
  summary: string | null;
  created_at: string;
  updated_at: string;
};

function toBusinessPlan(row: BusinessPlanRow): BusinessPlan {
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

function toInsertRow(input: CreateBusinessPlanInput) {
  return {
    project_id: input.projectId,
    title: input.title,
    status: input.status ?? 'DRAFT',
    summary: input.summary ?? null,
  };
}

function toUpdateRow(input: UpdateBusinessPlanInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type BusinessPlanRepository = BaseRepository<
  BusinessPlan,
  CreateBusinessPlanInput,
  UpdateBusinessPlanInput
> & {
  findByProjectId(projectId: ID): Promise<BusinessPlan[]>;
};

export class SupabaseBusinessPlanRepository implements BusinessPlanRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<BusinessPlan | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toBusinessPlan(data as BusinessPlanRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<BusinessPlan[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as BusinessPlanRow[]).map(toBusinessPlan);
  }

  async findAll(filter?: Record<string, unknown>): Promise<BusinessPlan[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as BusinessPlanRow[]).map(toBusinessPlan);
  }

  async create(input: CreateBusinessPlanInput): Promise<BusinessPlan> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toBusinessPlan(assertRow(data as BusinessPlanRow, 'BusinessPlan'));
  }

  async update(id: ID, input: UpdateBusinessPlanInput): Promise<BusinessPlan> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toBusinessPlan(assertRow(data as BusinessPlanRow, 'BusinessPlan'));
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
