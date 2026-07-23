import 'server-only';

import { isSupabaseConfigured } from '@repo/db';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive/services/executive-types';
import {
  getNotificationRepository,
  getNotificationSettingsRepository,
  getUserWatchlistRepository,
} from '@/lib/db/platform';

import { getWatchProvider } from '../providers/mock-watch-provider';
import {
  defaultSettings,
  getNotificationsFromStore,
  getSettingsFromStore,
  getWatchlistFromStore,
  saveNotificationsToStore,
  saveSettingsToStore,
  saveWatchlistToStore,
} from '../repositories/watch-store';
import type {
  NotificationSettings,
  WatchCenterViewModel,
  WatchListItem,
  WatchNotification,
  WatchType,
} from '../types';
import {
  buildAiRecommendations,
  buildAiSummary,
  buildDecisionNotifications,
  buildDefaultWatchSuggestions,
  buildSmartReminders,
  mergeNotifications,
  signalsToNotifications,
} from './notification-builder-service';

export type WatchCenterInput = {
  projectId: string;
  userId?: string | null;
  stats: ProjectDashboardStats;
  executive?: ExecutiveWorkspaceViewModel | null;
  hasExecutiveReport?: boolean;
};

function createId(): string {
  return globalThis.crypto.randomUUID();
}

async function loadSettings(projectId: string, userId?: string | null): Promise<NotificationSettings> {
  if (isSupabaseConfigured()) {
    try {
      const repo = getNotificationSettingsRepository();
      const row = await repo.findByProjectId(projectId);
      if (row) {
        const settings: NotificationSettings = {
          projectId,
          marketEnabled: row.marketEnabled,
          competitorEnabled: row.competitorEnabled,
          governmentEnabled: row.governmentEnabled,
          reminderEnabled: row.reminderEnabled,
          aiRecommendationEnabled: row.aiRecommendationEnabled,
        };
        await saveSettingsToStore(settings);
        return settings;
      }
    } catch {
      /* migration 019 may not be applied */
    }
  }

  return (await getSettingsFromStore(projectId)) ?? defaultSettings(projectId);
}

async function loadWatchlist(projectId: string): Promise<WatchListItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const repo = getUserWatchlistRepository();
      const rows = await repo.findByProjectId(projectId);
      if (rows.length > 0) {
        const items = rows.map((row) => ({
          id: row.id,
          watchType: row.watchType,
          label: row.label,
          projectId: row.projectId,
        }));
        await saveWatchlistToStore(projectId, items);
        return items;
      }
    } catch {
      /* fallback */
    }
  }

  return getWatchlistFromStore(projectId);
}

async function loadPersistedNotifications(projectId: string): Promise<WatchNotification[]> {
  if (isSupabaseConfigured()) {
    try {
      const repo = getNotificationRepository();
      const rows = await repo.findByProjectId(projectId);
      if (rows.length > 0) {
        const items = rows.map((row) => ({
          id: row.id,
          projectId: row.projectId,
          category: row.category,
          priority: row.priority,
          titleKey: row.title,
          summaryKey: row.summary ?? row.title,
          href: row.href,
          read: Boolean(row.readAt),
          occurredAt: row.occurredAt,
        }));
        await saveNotificationsToStore(projectId, items);
        return items;
      }
    } catch {
      /* fallback */
    }
  }

  return getNotificationsFromStore(projectId);
}

async function buildGeneratedNotifications(input: WatchCenterInput, settings: NotificationSettings) {
  const provider = getWatchProvider();
  const watchlist = await loadWatchlist(input.projectId);
  const signals = await provider.fetchSignals(watchlist, input.projectId);

  const builderInput = {
    projectId: input.projectId,
    stats: input.stats,
    executive: input.executive,
    hasExecutiveReport: input.hasExecutiveReport,
    settings,
  };

  return mergeNotifications(
    signalsToNotifications(input.projectId, signals, settings),
    buildSmartReminders(builderInput),
    buildAiRecommendations(builderInput),
    buildDecisionNotifications(builderInput),
  );
}

export async function buildWatchCenterViewModel(input: WatchCenterInput): Promise<WatchCenterViewModel> {
  const settings = await loadSettings(input.projectId, input.userId);
  const watchlist = await loadWatchlist(input.projectId);
  const persisted = await loadPersistedNotifications(input.projectId);
  const generated = await buildGeneratedNotifications(input, settings);

  const readState = new Map(persisted.map((item) => [item.id, item.read]));
  const notifications = mergeNotifications(
    generated.map((item) => ({ ...item, read: readState.get(item.id) ?? item.read })),
    persisted,
  );

  await saveNotificationsToStore(input.projectId, notifications);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return {
    projectId: input.projectId,
    notifications,
    unreadCount,
    watchlist,
    settings,
    aiSummary: buildAiSummary(input.projectId, notifications),
    defaultWatchSuggestions: buildDefaultWatchSuggestions(input.projectId).filter(
      (item) => !watchlist.some((w) => w.label === item.label && w.watchType === item.watchType),
    ),
  };
}

export async function markNotificationRead(projectId: string, notificationId: string): Promise<void> {
  const items = await loadPersistedNotifications(projectId);
  const next = items.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );
  if (!items.some((item) => item.id === notificationId)) {
    next.unshift({
      id: notificationId,
      projectId,
      category: 'REMINDER',
      priority: 'INFO',
      titleKey: 'watch.inbox.read',
      summaryKey: 'watch.inbox.read',
      href: null,
      read: true,
      occurredAt: new Date().toISOString(),
    });
  }
  await saveNotificationsToStore(projectId, next);

  if (isSupabaseConfigured()) {
    try {
      await getNotificationRepository().markRead(notificationId);
    } catch {
      /* in-memory only */
    }
  }
}

export async function deleteNotification(projectId: string, notificationId: string): Promise<void> {
  const items = (await loadPersistedNotifications(projectId)).filter((item) => item.id !== notificationId);
  await saveNotificationsToStore(projectId, items);

  if (isSupabaseConfigured()) {
    try {
      await getNotificationRepository().deleteById(notificationId);
    } catch {
      /* in-memory only */
    }
  }
}

export async function addWatchItem(input: {
  projectId: string;
  userId?: string | null;
  watchType: WatchType;
  label: string;
}): Promise<WatchListItem> {
  const list = await loadWatchlist(input.projectId);
  const existing = list.find((item) => item.label === input.label && item.watchType === input.watchType);
  if (existing) return existing;

  let item: WatchListItem = {
    id: createId(),
    watchType: input.watchType,
    label: input.label,
    projectId: input.projectId,
  };

  if (isSupabaseConfigured()) {
    try {
      const row = await getUserWatchlistRepository().create({
        projectId: input.projectId,
        userId: input.userId ?? null,
        watchType: input.watchType,
        label: input.label,
      });
      item = {
        id: row.id,
        watchType: row.watchType,
        label: row.label,
        projectId: row.projectId,
      };
    } catch {
      /* in-memory only */
    }
  }

  await saveWatchlistToStore(input.projectId, [item, ...list]);
  return item;
}

export async function removeWatchItem(projectId: string, watchId: string): Promise<void> {
  const list = (await loadWatchlist(projectId)).filter((item) => item.id !== watchId);
  await saveWatchlistToStore(projectId, list);

  if (isSupabaseConfigured()) {
    try {
      await getUserWatchlistRepository().deleteById(watchId);
    } catch {
      /* in-memory only */
    }
  }
}

export async function updateNotificationSettings(
  projectId: string,
  userId: string | null | undefined,
  patch: Partial<Omit<NotificationSettings, 'projectId'>>,
): Promise<NotificationSettings> {
  const current = await loadSettings(projectId, userId);
  const next: NotificationSettings = { ...current, ...patch, projectId };
  await saveSettingsToStore(next);

  if (isSupabaseConfigured()) {
    try {
      const row = await getNotificationSettingsRepository().upsert({
        projectId,
        userId: userId ?? null,
        marketEnabled: next.marketEnabled,
        competitorEnabled: next.competitorEnabled,
        governmentEnabled: next.governmentEnabled,
        reminderEnabled: next.reminderEnabled,
        aiRecommendationEnabled: next.aiRecommendationEnabled,
      });
      next.marketEnabled = row.marketEnabled;
      next.competitorEnabled = row.competitorEnabled;
      next.governmentEnabled = row.governmentEnabled;
      next.reminderEnabled = row.reminderEnabled;
      next.aiRecommendationEnabled = row.aiRecommendationEnabled;
    } catch {
      /* in-memory only */
    }
  }

  return next;
}

export async function getWatchCenterUnreadCount(input: WatchCenterInput): Promise<number> {
  const viewModel = await buildWatchCenterViewModel(input);
  return viewModel.unreadCount;
}
