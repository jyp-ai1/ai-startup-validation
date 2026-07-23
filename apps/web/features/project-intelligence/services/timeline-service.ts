import type { ProjectMemoryEntry } from '@repo/db';

import type { TimelineBucket, TimelineItem } from '../types';

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketFor(date: Date, now = new Date()): TimelineBucket {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) return 'today';
  if (target.getTime() === yesterday.getTime()) return 'yesterday';
  if (target >= weekStart) return 'thisWeek';
  return 'earlier';
}

function hrefFor(projectId: string, memoryType: ProjectMemoryEntry['memoryType']): string {
  switch (memoryType) {
    case 'RESEARCH':
    case 'MARKET':
      return `/projects/${projectId}/research`;
    case 'EVIDENCE':
      return `/projects/${projectId}/evidence`;
    case 'CONVERSATION':
      return `/projects/${projectId}/voc`;
    case 'COMPETITOR':
      return `/projects/${projectId}/competitors`;
    case 'GOVERNMENT':
      return `/projects/${projectId}/grants`;
    case 'DECISION':
      return `/projects/${projectId}/decision`;
    case 'REPORT':
      return `/projects/${projectId}/executive-report`;
    default:
      return `/projects/${projectId}`;
  }
}

export function buildExecutiveTimeline(
  projectId: string,
  memories: ProjectMemoryEntry[],
): TimelineItem[] {
  return memories
    .slice()
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .map((entry) => ({
      id: entry.id,
      bucket: bucketFor(new Date(entry.occurredAt)),
      memoryType: entry.memoryType,
      title: entry.title,
      summary: entry.summary,
      occurredAt: entry.occurredAt,
      href: hrefFor(projectId, entry.memoryType),
    }));
}

export function groupTimelineByBucket(items: TimelineItem[]): Record<TimelineBucket, TimelineItem[]> {
  return items.reduce(
    (acc, item) => {
      acc[item.bucket].push(item);
      return acc;
    },
    {
      today: [] as TimelineItem[],
      yesterday: [] as TimelineItem[],
      thisWeek: [] as TimelineItem[],
      earlier: [] as TimelineItem[],
    },
  );
}
