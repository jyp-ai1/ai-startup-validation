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

export const WATCH_TYPES = ['MARKET', 'COMPETITOR', 'GOVERNMENT'] as const;
export type WatchType = (typeof WATCH_TYPES)[number];

export type TimelineBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export type WatchNotification = {
  id: string;
  projectId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleKey: string;
  summaryKey: string;
  href: string | null;
  read: boolean;
  occurredAt: string;
};

export type WatchListItem = {
  id: string;
  watchType: WatchType;
  label: string;
  projectId: string;
};

export type NotificationSettings = {
  projectId: string;
  marketEnabled: boolean;
  competitorEnabled: boolean;
  governmentEnabled: boolean;
  reminderEnabled: boolean;
  aiRecommendationEnabled: boolean;
};

export type WatchAiSummary = {
  headlineKey: string;
  bullets: { id: string; labelKey: string; count?: number }[];
  actionKey: string;
  actionHref: string;
};

export type WatchCenterViewModel = {
  projectId: string;
  notifications: WatchNotification[];
  unreadCount: number;
  watchlist: WatchListItem[];
  settings: NotificationSettings;
  aiSummary: WatchAiSummary;
  defaultWatchSuggestions: WatchListItem[];
};

export type WatchProviderId = 'mock' | 'rss' | 'browser_agent' | 'mcp' | 'llm';
