'use server';

import 'server-only';

import {
  addWatchItem,
  buildWatchCenterViewModel,
  deleteNotification,
  getWatchCenterUnreadCount,
  markNotificationRead,
  removeWatchItem,
  updateNotificationSettings,
  type WatchCenterInput,
} from '../services/watch-center-service';
import type { NotificationSettings, WatchCenterViewModel, WatchType } from '../types';

export async function loadWatchCenter(input: WatchCenterInput): Promise<WatchCenterViewModel> {
  return buildWatchCenterViewModel(input);
}

export async function loadWatchCenterBadge(input: WatchCenterInput): Promise<number> {
  return getWatchCenterUnreadCount(input);
}

export async function readWatchNotification(projectId: string, notificationId: string): Promise<void> {
  await markNotificationRead(projectId, notificationId);
}

export async function dismissWatchNotification(projectId: string, notificationId: string): Promise<void> {
  await deleteNotification(projectId, notificationId);
}

export async function addToWatchlist(input: {
  projectId: string;
  userId?: string | null;
  watchType: WatchType;
  label: string;
}) {
  return addWatchItem(input);
}

export async function removeFromWatchlist(projectId: string, watchId: string): Promise<void> {
  await removeWatchItem(projectId, watchId);
}

export async function saveNotificationSettings(
  projectId: string,
  userId: string | null | undefined,
  patch: Partial<Omit<NotificationSettings, 'projectId'>>,
): Promise<NotificationSettings> {
  return updateNotificationSettings(projectId, userId, patch);
}
