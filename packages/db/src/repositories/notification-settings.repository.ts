import type { ID } from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import { assertNoError, assertRow, type SupabaseClient } from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'notification_settings';

export type NotificationSettingsRecord = {
  id: ID;
  userId: ID | null;
  projectId: ID;
  marketEnabled: boolean;
  competitorEnabled: boolean;
  governmentEnabled: boolean;
  reminderEnabled: boolean;
  aiRecommendationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertNotificationSettingsInput = {
  userId?: ID | null;
  projectId: ID;
  marketEnabled?: boolean;
  competitorEnabled?: boolean;
  governmentEnabled?: boolean;
  reminderEnabled?: boolean;
  aiRecommendationEnabled?: boolean;
};

type SettingsRow = {
  id: string;
  user_id: string | null;
  project_id: string;
  market_enabled: boolean;
  competitor_enabled: boolean;
  government_enabled: boolean;
  reminder_enabled: boolean;
  ai_recommendation_enabled: boolean;
  created_at: string;
  updated_at: string;
};

function toRecord(row: SettingsRow): NotificationSettingsRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    marketEnabled: row.market_enabled,
    competitorEnabled: row.competitor_enabled,
    governmentEnabled: row.government_enabled,
    reminderEnabled: row.reminder_enabled,
    aiRecommendationEnabled: row.ai_recommendation_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NotificationSettingsRepository {
  findByProjectId(projectId: ID): Promise<NotificationSettingsRecord | null>;
  upsert(input: UpsertNotificationSettingsInput): Promise<NotificationSettingsRecord>;
}

export class SupabaseNotificationSettingsRepository implements NotificationSettingsRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async findByProjectId(projectId: ID): Promise<NotificationSettingsRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    assertNoError(error);
    return data ? toRecord(data as SettingsRow) : null;
  }

  async upsert(input: UpsertNotificationSettingsInput): Promise<NotificationSettingsRecord> {
    const existing = await this.findByProjectId(input.projectId);
    const timestamp = new Date().toISOString();

    if (existing) {
      const patch: Record<string, unknown> = { updated_at: timestamp };
      if (input.marketEnabled !== undefined) patch.market_enabled = input.marketEnabled;
      if (input.competitorEnabled !== undefined) patch.competitor_enabled = input.competitorEnabled;
      if (input.governmentEnabled !== undefined) patch.government_enabled = input.governmentEnabled;
      if (input.reminderEnabled !== undefined) patch.reminder_enabled = input.reminderEnabled;
      if (input.aiRecommendationEnabled !== undefined) {
        patch.ai_recommendation_enabled = input.aiRecommendationEnabled;
      }

      const { data, error } = await this.client
        .from(TABLE)
        .update(patch)
        .eq('id', existing.id)
        .select('*')
        .single();

      assertNoError(error);
      return toRecord(assertRow(data as SettingsRow, 'NotificationSettingsRecord'));
    }

    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        user_id: input.userId ?? null,
        project_id: input.projectId,
        market_enabled: input.marketEnabled ?? true,
        competitor_enabled: input.competitorEnabled ?? true,
        government_enabled: input.governmentEnabled ?? true,
        reminder_enabled: input.reminderEnabled ?? true,
        ai_recommendation_enabled: input.aiRecommendationEnabled ?? true,
      })
      .select('*')
      .single();

    assertNoError(error);
    return toRecord(assertRow(data as SettingsRow, 'NotificationSettingsRecord'));
  }
}
