import type { BaseRepository } from '@repo/core/repository';
import type {
  CreateOrganizationInput,
  ID,
  Organization,
  UpdateOrganizationInput,
} from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'organizations';

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type OrganizationRepository = BaseRepository<
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput
>;

/** Supabase adapter for organizations table. */
export class SupabaseOrganizationRepository implements OrganizationRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<Organization | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toOrganization(data as OrganizationRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<Organization[]> {
    const query = applyEqFilters(this.client.from(TABLE).select('*'), filter);
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as OrganizationRow[]).map(toOrganization);
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        name: input.name,
        slug: input.slug,
        owner_id: input.ownerId,
      })
      .select('*')
      .single();

    assertNoError(error);
    return toOrganization(assertRow(data as OrganizationRow, 'Organization'));
  }

  async update(id: ID, input: UpdateOrganizationInput): Promise<Organization> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({
        name: input.name,
        slug: input.slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toOrganization(assertRow(data as OrganizationRow, 'Organization'));
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
