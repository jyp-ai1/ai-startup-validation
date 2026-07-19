import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  Competitor,
  CreateCompetitorInput,
  UpdateCompetitorInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'competitors';

type CompetitorRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  website: string | null;
  category: Competitor['category'];
  target_customer: string | null;
  business_model: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  differentiation: string | null;
  market_position: Competitor['marketPosition'];
  created_at: string;
  updated_at: string;
};

function toCompetitor(row: CompetitorRow): Competitor {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    website: row.website,
    category: row.category,
    targetCustomer: row.target_customer,
    businessModel: row.business_model,
    pricing: row.pricing,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    differentiation: row.differentiation,
    marketPosition: row.market_position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateCompetitorInput) {
  return {
    project_id: input.projectId,
    name: input.name,
    description: input.description ?? null,
    website: input.website ?? null,
    category: input.category,
    target_customer: input.targetCustomer ?? null,
    business_model: input.businessModel ?? null,
    pricing: input.pricing ?? null,
    strengths: input.strengths ?? null,
    weaknesses: input.weaknesses ?? null,
    differentiation: input.differentiation ?? null,
    market_position: input.marketPosition ?? null,
  };
}

function toUpdateRow(input: UpdateCompetitorInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.targetCustomer !== undefined
      ? { target_customer: input.targetCustomer }
      : {}),
    ...(input.businessModel !== undefined
      ? { business_model: input.businessModel }
      : {}),
    ...(input.pricing !== undefined ? { pricing: input.pricing } : {}),
    ...(input.strengths !== undefined ? { strengths: input.strengths } : {}),
    ...(input.weaknesses !== undefined ? { weaknesses: input.weaknesses } : {}),
    ...(input.differentiation !== undefined
      ? { differentiation: input.differentiation }
      : {}),
    ...(input.marketPosition !== undefined
      ? { market_position: input.marketPosition }
      : {}),
    updated_at: new Date().toISOString(),
  };
}

export type CompetitorRepository = BaseRepository<
  Competitor,
  CreateCompetitorInput,
  UpdateCompetitorInput
> & {
  findByProjectId(projectId: ID): Promise<Competitor[]>;
};

/** Supabase adapter for competitors table. */
export class SupabaseCompetitorRepository implements CompetitorRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<Competitor | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toCompetitor(data as CompetitorRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<Competitor[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as CompetitorRow[]).map(toCompetitor);
  }

  async findAll(filter?: Record<string, unknown>): Promise<Competitor[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as CompetitorRow[]).map(toCompetitor);
  }

  async create(input: CreateCompetitorInput): Promise<Competitor> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toCompetitor(assertRow(data as CompetitorRow, 'Competitor'));
  }

  async update(id: ID, input: UpdateCompetitorInput): Promise<Competitor> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toCompetitor(assertRow(data as CompetitorRow, 'Competitor'));
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
