import { getServiceClient } from '../adapters/supabase/service';
import { assertNoError } from '../adapters/supabase/repositories/repository.utils';

const EVENTS_TABLE = 'analytics_events';
const SUMMARY_TABLE = 'analytics_daily_summary';

export type AnalyticsEventRecord = {
  id: string;
  projectId: string | null;
  userId: string | null;
  sessionId: string | null;
  eventName: string;
  eventData: Record<string, unknown>;
  createdAt: string;
};

export type InsertAnalyticsEventInput = {
  projectId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  eventName: string;
  eventData?: Record<string, unknown>;
  timestamp?: string;
};

export type JourneyReplayEntry = {
  id: string;
  eventName: string;
  eventData: Record<string, unknown>;
  createdAt: string;
  sessionId: string | null;
  userId: string | null;
  projectId: string | null;
};

type AnalyticsEventRow = {
  id: string;
  project_id: string | null;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

function toRecord(row: AnalyticsEventRow): AnalyticsEventRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    sessionId: row.session_id,
    eventName: row.event_name,
    eventData: row.event_data ?? {},
    createdAt: row.created_at,
  };
}

export class SupabaseAnalyticsEventRepository {
  async insert(input: InsertAnalyticsEventInput): Promise<AnalyticsEventRecord | null> {
    const client = getServiceClient();
    const row = {
      project_id: input.projectId ?? null,
      user_id: input.userId ?? null,
      session_id: input.sessionId ?? null,
      event_name: input.eventName,
      event_data: input.eventData ?? {},
      created_at: input.timestamp ?? new Date().toISOString(),
    };

    const { data, error } = await client.from(EVENTS_TABLE).insert(row).select('*').single();
    if (error) {
      assertNoError(error);
      return null;
    }
    return toRecord(data as AnalyticsEventRow);
  }

  async listRecent(limit = 5000): Promise<AnalyticsEventRecord[]> {
    const client = getServiceClient();
    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      assertNoError(error);
      return [];
    }
    return (data as AnalyticsEventRow[]).map(toRecord).reverse();
  }

  async listJourneySessions(limit = 50): Promise<
    { sessionId: string; userId: string | null; lastEventAt: string; eventCount: number }[]
  > {
    const client = getServiceClient();
    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('session_id, user_id, created_at')
      .not('session_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      assertNoError(error);
      return [];
    }

    const map = new Map<
      string,
      { sessionId: string; userId: string | null; lastEventAt: string; eventCount: number }
    >();

    for (const row of data as { session_id: string; user_id: string | null; created_at: string }[]) {
      const existing = map.get(row.session_id);
      if (!existing) {
        map.set(row.session_id, {
          sessionId: row.session_id,
          userId: row.user_id,
          lastEventAt: row.created_at,
          eventCount: 1,
        });
      } else {
        existing.eventCount += 1;
      }
    }

    return [...map.values()].slice(0, limit);
  }

  async listSessionJourney(sessionId: string): Promise<JourneyReplayEntry[]> {
    const client = getServiceClient();
    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      assertNoError(error);
      return [];
    }

    return (data as AnalyticsEventRow[]).map((row) => ({
      id: row.id,
      eventName: row.event_name,
      eventData: row.event_data ?? {},
      createdAt: row.created_at,
      sessionId: row.session_id,
      userId: row.user_id,
      projectId: row.project_id,
    }));
  }

  async upsertDailySummary(
    summaryDate: string,
    metricKey: string,
    metricValue: number,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const client = getServiceClient();
    const { error } = await client.from(SUMMARY_TABLE).upsert(
      {
        summary_date: summaryDate,
        metric_key: metricKey,
        metric_value: metricValue,
        metadata,
      },
      { onConflict: 'summary_date,metric_key' },
    );
    if (error) assertNoError(error);
  }
}

export const analyticsEventRepository = new SupabaseAnalyticsEventRepository();
