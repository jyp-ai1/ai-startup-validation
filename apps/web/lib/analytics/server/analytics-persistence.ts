import {
  analyticsEventRepository,
  isSupabaseAdminConfigured,
} from '@repo/db';

import type { AnalyticsEventPayload } from '../types';

/** Persist funnel event to Supabase — non-blocking, fails silently if not configured. */
export async function persistAnalyticsEvent(payload: AnalyticsEventPayload): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  try {
    const params = payload.params ?? {};
    await analyticsEventRepository.insert({
      eventName: payload.name,
      eventData: params as Record<string, unknown>,
      projectId: typeof params.project_id === 'string' ? params.project_id : null,
      userId: typeof params.user_id === 'string' ? params.user_id : null,
      sessionId: typeof params.session_id === 'string' ? params.session_id : null,
      timestamp: payload.timestamp,
    });
  } catch {
    /* log in dev if insert fails — migration 022 should be applied */
  }
}

/** Hydrate in-memory store from DB on cold start. */
export async function loadPersistedAnalyticsEvents(): Promise<AnalyticsEventPayload[]> {
  if (!isSupabaseAdminConfigured()) return [];

  try {
    const rows = await analyticsEventRepository.listRecent(5000);
    return rows.map((row) => ({
      name: row.eventName,
      params: {
        ...row.eventData,
        project_id: row.projectId ?? undefined,
        user_id: row.userId ?? undefined,
        session_id: row.sessionId ?? undefined,
      },
      timestamp: row.createdAt,
    }));
  } catch {
    return [];
  }
}
