import type { NotificationSettings, WatchListItem, WatchNotification } from '../types';

const NOTIFICATION_KEY = '__launchlens_notification_store__';
const WATCHLIST_KEY = '__launchlens_watchlist_store__';
const SETTINGS_KEY = '__launchlens_notification_settings_store__';

type NotificationStore = Map<string, WatchNotification[]>;
type WatchlistStore = Map<string, WatchListItem[]>;
type SettingsStore = Map<string, NotificationSettings>;

function getNotificationStore(): NotificationStore {
  const g = globalThis as typeof globalThis & { [NOTIFICATION_KEY]?: NotificationStore };
  if (!g[NOTIFICATION_KEY]) g[NOTIFICATION_KEY] = new Map();
  return g[NOTIFICATION_KEY]!;
}

function getWatchlistStore(): WatchlistStore {
  const g = globalThis as typeof globalThis & { [WATCHLIST_KEY]?: WatchlistStore };
  if (!g[WATCHLIST_KEY]) g[WATCHLIST_KEY] = new Map();
  return g[WATCHLIST_KEY]!;
}

function getSettingsStore(): SettingsStore {
  const g = globalThis as typeof globalThis & { [SETTINGS_KEY]?: SettingsStore };
  if (!g[SETTINGS_KEY]) g[SETTINGS_KEY] = new Map();
  return g[SETTINGS_KEY]!;
}

export async function getNotificationsFromStore(projectId: string): Promise<WatchNotification[]> {
  const list = getNotificationStore().get(projectId);
  return list ? structuredClone(list) : [];
}

export async function saveNotificationsToStore(
  projectId: string,
  items: WatchNotification[],
): Promise<void> {
  getNotificationStore().set(projectId, structuredClone(items));
}

export async function getWatchlistFromStore(projectId: string): Promise<WatchListItem[]> {
  const list = getWatchlistStore().get(projectId);
  return list ? structuredClone(list) : [];
}

export async function saveWatchlistToStore(projectId: string, items: WatchListItem[]): Promise<void> {
  getWatchlistStore().set(projectId, structuredClone(items));
}

export async function getSettingsFromStore(projectId: string): Promise<NotificationSettings | null> {
  const settings = getSettingsStore().get(projectId);
  return settings ? structuredClone(settings) : null;
}

export async function saveSettingsToStore(settings: NotificationSettings): Promise<void> {
  getSettingsStore().set(settings.projectId, structuredClone(settings));
}

export function defaultSettings(projectId: string): NotificationSettings {
  return {
    projectId,
    marketEnabled: true,
    competitorEnabled: true,
    governmentEnabled: true,
    reminderEnabled: true,
    aiRecommendationEnabled: true,
  };
}
