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
  country: string | null;
  project_goal: StartupProject['projectGoal'];
  project_type: StartupProject['projectType'];
  user_id: string | null;
  is_demo: boolean;
  onboarding_context: Record<string, unknown> | null;
  status: StartupProject['status'];
  deleted_at?: string | null;
  is_pinned?: boolean;
  thumbnail_color?: string | null;
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
    country: row.country,
    projectGoal: row.project_goal,
    projectType: row.project_type ?? 'STARTUP',
    userId: row.user_id,
    isDemo: row.is_demo ?? false,
    onboardingContext: row.onboarding_context ?? null,
    status: row.status,
    isPinned: row.is_pinned ?? false,
    deletedAt: row.deleted_at ?? null,
    thumbnailColor: row.thumbnail_color ?? null,
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
    country: input.country ?? null,
    project_goal: input.projectGoal ?? null,
    project_type: input.projectType ?? 'STARTUP',
    user_id: input.userId ?? null,
    is_demo: input.isDemo ?? false,
    status: input.status ?? 'DRAFT',
    is_pinned: input.isPinned ?? false,
    thumbnail_color: input.thumbnailColor ?? null,
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
    ...(input.projectType !== undefined ? { project_type: input.projectType } : {}),
    ...(input.country !== undefined ? { country: input.country } : {}),
    ...(input.projectGoal !== undefined ? { project_goal: input.projectGoal } : {}),
    ...(input.onboardingContext !== undefined
      ? { onboarding_context: input.onboardingContext }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.isPinned !== undefined ? { is_pinned: input.isPinned } : {}),
    ...(input.thumbnailColor !== undefined ? { thumbnail_color: input.thumbnailColor } : {}),
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
    let query = this.client.from(TABLE).select('*').order('created_at', { ascending: false });

    if (!filter?.includeDeleted) {
      query = query.is('deleted_at', null);
    }
    delete filter?.includeDeleted;

    query = applyEqFilters(query, filter);
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

  async softDelete(id: ID): Promise<StartupProject> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    assertNoError(error);
    return toStartupProject(assertRow(data as StartupProjectRow, 'StartupProject'));
  }

  async restore(id: ID): Promise<StartupProject> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    assertNoError(error);
    return toStartupProject(assertRow(data as StartupProjectRow, 'StartupProject'));
  }

  async duplicate(id: ID): Promise<StartupProject> {
    const source = await this.findById(id);
    if (!source) {
      throw new Error(`Startup project not found: ${id}`);
    }
    return this.create({
      title: `${source.title} (copy)`,
      summary: source.summary,
      problem: source.problem,
      solution: source.solution,
      targetCustomer: source.targetCustomer,
      industry: source.industry,
      businessModel: source.businessModel,
      country: source.country,
      projectGoal: source.projectGoal,
      projectType: source.projectType,
      userId: source.userId,
      isDemo: source.isDemo,
      status: 'DRAFT',
      thumbnailColor: source.thumbnailColor,
    });
  }

  async togglePin(id: ID): Promise<StartupProject> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Startup project not found: ${id}`);
    }
    return this.update(id, { isPinned: !existing.isPinned });
  }

  async archive(id: ID): Promise<StartupProject> {
    return this.update(id, { status: 'ARCHIVED' });
  }

  async unarchive(id: ID): Promise<StartupProject> {
    return this.update(id, { status: 'DRAFT' });
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
