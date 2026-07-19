import type { BaseRepository } from '@repo/core/repository';
import type {
  CreateProjectInput,
  ID,
  Project,
  UpdateProjectInput,
} from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'projects';

type ProjectRow = {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ProjectRepository = BaseRepository<
  Project,
  CreateProjectInput,
  UpdateProjectInput
>;

/** Supabase adapter for projects table. */
export class SupabaseProjectRepository implements ProjectRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<Project | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toProject(data as ProjectRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<Project[]> {
    const query = applyEqFilters(this.client.from(TABLE).select('*'), filter);
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as ProjectRow[]).map(toProject);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        name: input.name,
        organization_id: input.organizationId,
      })
      .select('*')
      .single();

    assertNoError(error);
    return toProject(assertRow(data as ProjectRow, 'Project'));
  }

  async update(id: ID, input: UpdateProjectInput): Promise<Project> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({
        name: input.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toProject(assertRow(data as ProjectRow, 'Project'));
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
