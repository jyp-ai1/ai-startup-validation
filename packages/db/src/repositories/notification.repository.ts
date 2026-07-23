import type { ID } from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import { assertNoError, assertRow, type SupabaseClient } from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'notifications';

export const NOTIFICATION_PRIORITIES = ['CRITICAL', 'WARNING', 'INFO', 'SUCCESS'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CATEGORIES = [
  'MARKET',
  'COMPETITOR',
  'GOVERNMENT',
  'REMINDER',
  'AI_RECOMMENDATION',
  'DECISION',
  'REPORT',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationRecord = {
  id: ID;
  userId: ID | null;
  projectId: ID;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  summary: string | null;
  href: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotificationInput = {
  userId?: ID | null;
  projectId: ID;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  summary?: string | null;
  href?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  project_id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  summary: string | null;
  href: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

function toRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    category: row.category,
    priority: row.priority,
    title: row.title,
    summary: row.summary,
    href: row.href,
    payload: row.payload ?? {},
    readAt: row.read_at,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NotificationRepository {
  findByProjectId(projectId: ID): Promise<NotificationRecord[]>;
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  markRead(id: ID): Promise<NotificationRecord>;
  deleteById(id: ID): Promise<void>;
  countUnread(projectId: ID): Promise<number>;
}

export class SupabaseNotificationRepository implements NotificationRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async findByProjectId(projectId: ID): Promise<NotificationRecord[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('occurred_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as NotificationRow[]).map(toRecord);
  }

  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        user_id: input.userId ?? null,
        project_id: input.projectId,
        category: input.category,
        priority: input.priority,
        title: input.title,
        summary: input.summary ?? null,
        href: input.href ?? null,
        payload: input.payload ?? {},
        occurred_at: input.occurredAt ?? new Date().toISOString(),
      })
      .select('*')
      .single();

    assertNoError(error);
    return toRecord(assertRow(data as NotificationRow, 'NotificationRecord'));
  }

  async markRead(id: ID): Promise<NotificationRecord> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toRecord(assertRow(data as NotificationRow, 'NotificationRecord'));
  }

  async deleteById(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async countUnread(projectId: ID): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('read_at', null);

    assertNoError(error);
    return count ?? 0;
  }
}
