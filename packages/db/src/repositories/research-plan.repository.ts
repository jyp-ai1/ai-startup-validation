import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateResearchPlanInput,
  ResearchPlan,
  UpdateResearchPlanInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'research_plans';

type ResearchPlanRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  research_type: ResearchPlan['researchType'];
  status: ResearchPlan['status'];
  priority: ResearchPlan['priority'];
  created_at: string;
  updated_at: string;
};

function toResearchPlan(row: ResearchPlanRow): ResearchPlan {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    researchType: row.research_type,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateResearchPlanInput) {
  return {
    project_id: input.projectId,
    title: input.title,
    description: input.description ?? null,
    research_type: input.researchType,
    status: input.status ?? 'TODO',
    priority: input.priority ?? 'MEDIUM',
  };
}

function toUpdateRow(input: UpdateResearchPlanInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.researchType !== undefined
      ? { research_type: input.researchType }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type ResearchPlanRepository = BaseRepository<
  ResearchPlan,
  CreateResearchPlanInput,
  UpdateResearchPlanInput
> & {
  findByProjectId(projectId: ID): Promise<ResearchPlan[]>;
};

/** Supabase adapter for research_plans table. */
export class SupabaseResearchPlanRepository implements ResearchPlanRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<ResearchPlan | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toResearchPlan(data as ResearchPlanRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<ResearchPlan[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as ResearchPlanRow[]).map(toResearchPlan);
  }

  async findAll(filter?: Record<string, unknown>): Promise<ResearchPlan[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as ResearchPlanRow[]).map(toResearchPlan);
  }

  async create(input: CreateResearchPlanInput): Promise<ResearchPlan> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toResearchPlan(assertRow(data as ResearchPlanRow, 'ResearchPlan'));
  }

  async update(id: ID, input: UpdateResearchPlanInput): Promise<ResearchPlan> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toResearchPlan(assertRow(data as ResearchPlanRow, 'ResearchPlan'));
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
