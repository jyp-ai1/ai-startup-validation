import type { BaseRepository } from '@repo/core/repository';
import type {
  CreateUserInput,
  ID,
  UpdateUserInput,
  User,
} from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'profiles';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: CreateUserInput | UpdateUserInput): Partial<ProfileRow> {
  return {
    email: 'email' in input ? input.email : undefined,
    full_name: input.fullName,
    avatar_url: input.avatarUrl,
    role: 'role' in input ? input.role : undefined,
  };
}

/** Repository token type — apps depend on this interface, not the implementation. */
export type UserRepository = BaseRepository<
  User,
  CreateUserInput,
  UpdateUserInput
>;

/** Supabase adapter for User / profiles table. */
export class SupabaseUserRepository implements UserRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<User | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toUser(data as ProfileRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<User[]> {
    const query = applyEqFilters(this.client.from(TABLE).select('*'), filter);
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as ProfileRow[]).map(toUser);
  }

  async create(input: CreateUserInput): Promise<User> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toUser(assertRow(data as ProfileRow, 'User'));
  }

  async update(id: ID, input: UpdateUserInput): Promise<User> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toUser(assertRow(data as ProfileRow, 'User'));
  }

  async delete(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async exists(id: ID): Promise<boolean> {
    const user = await this.findById(id);
    return user !== null;
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
