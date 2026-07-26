import type { JourneyHistoryEntry } from './journey-history-store';
import type { FounderEvidenceEntry } from './founder-evidence-store';

export type AiPmWorkLogEntry = {
  id: string;
  time: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  status: 'done' | 'running';
};

const BASE_ENTRIES: Array<{ labelKey: string; minutesAgo: number }> = [
  { labelKey: 'marketResearchDone', minutesAgo: 54 },
  { labelKey: 'competitorScan', minutesAgo: 52 },
  { labelKey: 'strategyDraft', minutesAgo: 48 },
  { labelKey: 'riskFound', minutesAgo: 45 },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function buildAiPmWorkLogEntries(
  evidence: FounderEvidenceEntry[],
  history: JourneyHistoryEntry[],
): AiPmWorkLogEntry[] {
  const now = Date.now();
  const entries: AiPmWorkLogEntry[] = BASE_ENTRIES.map((item, index) => ({
    id: `base_${index}`,
    time: formatTime(new Date(now - item.minutesAgo * 60_000)),
    labelKey: item.labelKey,
    status: 'done' as const,
  }));

  for (const entry of evidence.slice(-3)) {
    const created = new Date(entry.createdAt).getTime();
    entries.push({
      id: `ev_${entry.id}`,
      time: formatTime(new Date(created)),
      labelKey: 'evidenceLogged',
      status: 'done',
    });
  }

  for (const entry of history.filter((h) => h.category === 'activity').slice(-2)) {
    entries.push({
      id: `hist_${entry.id}`,
      time: formatTime(new Date(entry.occurredAt)),
      labelKey: 'founderActivity',
      labelParams: { summary: entry.summary ?? entry.title },
      status: 'done',
    });
  }

  entries.push({
    id: 'running',
    time: formatTime(new Date()),
    labelKey: 'monitoring',
    status: 'running',
  });

  return entries
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-6);
}
