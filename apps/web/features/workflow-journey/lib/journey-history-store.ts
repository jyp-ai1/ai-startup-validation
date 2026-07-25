import { DECISION_TIMELINE } from '@/features/project-intelligence/constants/timeline-mock';

export type JourneyHistoryCategory =
  | 'decision'
  | 'coach'
  | 'evidence'
  | 'workflow'
  | 'activity';

export type JourneyHistoryEntry = {
  id: string;
  category: JourneyHistoryCategory;
  title: string;
  summary?: string | null;
  value?: string | null;
  occurredAt: string;
  deletedAt?: string | null;
};

const STORAGE_PREFIX = 'll_journey_history_v1';

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}:${projectId}`;
}

function readRaw(projectId: string): JourneyHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JourneyHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(projectId: string, entries: JourneyHistoryEntry[]): void {
  localStorage.setItem(storageKey(projectId), JSON.stringify(entries));
}

function seedFromTimeline(): JourneyHistoryEntry[] {
  const categoryMap: Record<(typeof DECISION_TIMELINE)[number]['type'], JourneyHistoryCategory> = {
    decision: 'decision',
    confidence: 'activity',
    activity: 'evidence',
    milestone: 'workflow',
  };

  return DECISION_TIMELINE.map((entry) => ({
    id: entry.id,
    category: categoryMap[entry.type],
    title: entry.labelKey,
    summary: entry.detailKey ?? null,
    value: entry.value ?? null,
    occurredAt: entry.at,
    deletedAt: null,
  }));
}

export function getJourneyHistory(projectId: string, includeDeleted = false): JourneyHistoryEntry[] {
  let entries = readRaw(projectId);
  if (entries.length === 0) {
    entries = seedFromTimeline();
    writeRaw(projectId, entries);
  }

  return entries
    .filter((entry) => includeDeleted || !entry.deletedAt)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function appendJourneyHistory(
  projectId: string,
  entry: Omit<JourneyHistoryEntry, 'id' | 'occurredAt' | 'deletedAt'> & {
    id?: string;
    occurredAt?: string;
  },
): JourneyHistoryEntry {
  const all = readRaw(projectId);
  const created: JourneyHistoryEntry = {
    id: entry.id ?? `jh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: entry.category,
    title: entry.title,
    summary: entry.summary ?? null,
    value: entry.value ?? null,
    occurredAt: entry.occurredAt ?? new Date().toISOString(),
    deletedAt: null,
  };

  writeRaw(projectId, [created, ...all]);
  return created;
}

export function softDeleteJourneyHistory(projectId: string, entryId: string): boolean {
  const all = readRaw(projectId);
  const index = all.findIndex((entry) => entry.id === entryId);
  if (index === -1) return false;
  all[index] = { ...all[index]!, deletedAt: new Date().toISOString() };
  writeRaw(projectId, all);
  return true;
}

export function restoreJourneyHistory(projectId: string, entryId: string): boolean {
  const all = readRaw(projectId);
  const index = all.findIndex((entry) => entry.id === entryId);
  if (index === -1) return false;
  all[index] = { ...all[index]!, deletedAt: null };
  writeRaw(projectId, all);
  return true;
}

export function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export type JourneyHistoryBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export function bucketJourneyHistory(iso: string, now = new Date()): JourneyHistoryBucket {
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const target = startOfDay(new Date(iso));
  if (target.getTime() === today.getTime()) return 'today';
  if (target.getTime() === yesterday.getTime()) return 'yesterday';
  if (target >= weekStart) return 'thisWeek';
  return 'earlier';
}

export function groupJourneyHistoryByBucket(
  entries: JourneyHistoryEntry[],
): Record<JourneyHistoryBucket, JourneyHistoryEntry[]> {
  return entries.reduce(
    (acc, entry) => {
      const bucket = bucketJourneyHistory(entry.occurredAt);
      acc[bucket].push(entry);
      return acc;
    },
    {
      today: [] as JourneyHistoryEntry[],
      yesterday: [] as JourneyHistoryEntry[],
      thisWeek: [] as JourneyHistoryEntry[],
      earlier: [] as JourneyHistoryEntry[],
    },
  );
}
