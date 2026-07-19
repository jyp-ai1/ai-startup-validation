import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateGovernmentGrantInput,
  GovernmentGrant,
  GrantListFilter,
  UpdateGovernmentGrantInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'government_grants';

type GovernmentGrantRow = {
  id: string;
  project_id: string;
  name: string;
  organization: string;
  description: string | null;
  category: GovernmentGrant['category'];
  target_stage: GovernmentGrant['targetStage'];
  support_type: GovernmentGrant['supportType'];
  amount: string | null;
  deadline: string | null;
  eligibility: string | null;
  application_url: string | null;
  fit_score: number | null;
  status: GovernmentGrant['status'];
  created_at: string;
  updated_at: string;
};

function toGovernmentGrant(row: GovernmentGrantRow): GovernmentGrant {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    organization: row.organization,
    description: row.description,
    category: row.category,
    targetStage: row.target_stage,
    supportType: row.support_type,
    amount: row.amount,
    deadline: row.deadline,
    eligibility: row.eligibility,
    applicationUrl: row.application_url,
    fitScore: row.fit_score,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateGovernmentGrantInput) {
  return {
    project_id: input.projectId,
    name: input.name,
    organization: input.organization,
    description: input.description ?? null,
    category: input.category ?? null,
    target_stage: input.targetStage ?? null,
    support_type: input.supportType ?? null,
    amount: input.amount ?? null,
    deadline: input.deadline ?? null,
    eligibility: input.eligibility ?? null,
    application_url: input.applicationUrl ?? null,
    fit_score: input.fitScore ?? null,
    status: input.status ?? 'OPEN',
  };
}

function toUpdateRow(input: UpdateGovernmentGrantInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.organization !== undefined ? { organization: input.organization } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.targetStage !== undefined ? { target_stage: input.targetStage } : {}),
    ...(input.supportType !== undefined ? { support_type: input.supportType } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
    ...(input.eligibility !== undefined ? { eligibility: input.eligibility } : {}),
    ...(input.applicationUrl !== undefined
      ? { application_url: input.applicationUrl }
      : {}),
    ...(input.fitScore !== undefined ? { fit_score: input.fitScore } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type GovernmentGrantRepository = BaseRepository<
  GovernmentGrant,
  CreateGovernmentGrantInput,
  UpdateGovernmentGrantInput
> & {
  findByProjectId(
    projectId: ID,
    filter?: GrantListFilter,
  ): Promise<GovernmentGrant[]>;
};

/** Supabase adapter for government_grants table. */
export class SupabaseGovernmentGrantRepository implements GovernmentGrantRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<GovernmentGrant | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toGovernmentGrant(data as GovernmentGrantRow) : null;
  }

  async findByProjectId(
    projectId: ID,
    filter?: GrantListFilter,
  ): Promise<GovernmentGrant[]> {
    let query = this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.targetStage) {
      query = query.eq('target_stage', filter.targetStage);
    }
    if (filter?.supportType) {
      query = query.eq('support_type', filter.supportType);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as GovernmentGrantRow[]).map(toGovernmentGrant);
  }

  async findAll(filter?: Record<string, unknown>): Promise<GovernmentGrant[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as GovernmentGrantRow[]).map(toGovernmentGrant);
  }

  async create(input: CreateGovernmentGrantInput): Promise<GovernmentGrant> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toGovernmentGrant(
      assertRow(data as GovernmentGrantRow, 'GovernmentGrant'),
    );
  }

  async update(
    id: ID,
    input: UpdateGovernmentGrantInput,
  ): Promise<GovernmentGrant> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toGovernmentGrant(
      assertRow(data as GovernmentGrantRow, 'GovernmentGrant'),
    );
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
