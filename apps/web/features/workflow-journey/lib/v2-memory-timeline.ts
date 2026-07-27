import type { DecisionMemoryEntry } from './v2-decision-memory-store';
import { formatDecisionDate } from './v2-decision-memory-store';

export type MemoryTimelineEvent = {
  id: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  type: 'input' | 'review' | 'decision';
  memoryId?: string;
  isoDate: string;
};

export function buildMemoryTimeline(
  entries: DecisionMemoryEntry[],
  lastReviewAt: Date | null,
  locale: string,
): MemoryTimelineEvent[] {
  const events: MemoryTimelineEvent[] = [];

  if (lastReviewAt) {
    events.push({
      id: 'review-latest',
      dateLabel: formatDecisionDate(lastReviewAt.toISOString(), locale),
      title: 'review',
      subtitle: 'evidenceGenerated',
      type: 'review',
      isoDate: lastReviewAt.toISOString(),
    });
  }

  for (const entry of entries) {
    events.push({
      id: entry.id,
      dateLabel: formatDecisionDate(entry.decidedAt, locale),
      title: 'decision',
      subtitle: entry.decision,
      type: 'decision',
      memoryId: entry.id,
      isoDate: entry.decidedAt,
    });
  }

  return events.sort(
    (a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime(),
  );
}
