import type { ID } from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import { assertNoError, assertRow, type SupabaseClient } from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'user_watchlist';

export const WATCH_TYPES = ['MARKET', 'COMPETITOR', 'GOVERNMENT'] as const;
export type WatchType = (typeof WATCH_TYPES)[number];

export type UserWatchlistEntry = {
  id: ID;
  userId: ID | null;
  projectId: ID;
  watchType: WatchType;
  label: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateWatchlistInput = {
  userId?: ID | null;
  projectId: ID;
  watchType: WatchType;
  label: string;
  payload?: Record<string, unknown>;
};

type WatchlistRow = {
  id: string;
  user_id: string | null;
  project_id: string;
  watch_type: WatchType;
  label: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function toEntry(row: WatchlistRow): UserWatchlistEntry {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    watchType: row.watch_type,
    label: row.label,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UserWatchlistRepository {
  findByProjectId(projectId: ID): Promise<UserWatchlistEntry[]>;
  create(input: CreateWatchlistInput): Promise<UserWatchlistEntry>;
  deleteById(id: ID): Promise<void>;
}

export class SupabaseUserWatchlistRepository implements UserWatchlistRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async findByProjectId(projectId: ID): Promise<UserWatchlistEntry[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as WatchlistRow[]).map(toEntry);
  }

  async create(input: CreateWatchlistInput): Promise<UserWatchlistEntry> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        user_id: input.userId ?? null,
        project_id: input.projectId,
        watch_type: input.watchType,
        label: input.label,
        payload: input.payload ?? {},
      })
      .select('*')
      .single();

    assertNoError(error);
    return toEntry(assertRow(data as WatchlistRow, 'UserWatchlistEntry'));
  }

  async deleteById(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }
}
