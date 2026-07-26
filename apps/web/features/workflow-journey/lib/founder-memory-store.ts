const STORAGE_KEY = 'll_founder_memory_v1';

export type StoredFounderMemory = {
  projectId: string;
  weekKey: string;
  focusKey: string;
  gapKey: string;
  stageIndex: number;
  confidence: number;
  updatedAt: string;
};

function weekKeyFromDate(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function loadFounderMemory(projectId: string): StoredFounderMemory | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, StoredFounderMemory>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function saveFounderMemory(snapshot: StoredFounderMemory): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, StoredFounderMemory>) : {};
    all[snapshot.projectId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export type FounderMemoryRecall = {
  isReturning: boolean;
  lastWeekFocusKey: string;
  lastWeekGapKey: string;
  thisWeekFocusKey: string;
};

const FOCUS_BY_STAGE = ['marketValidation', 'competitorAnalysis', 'pricingValidation', 'executionScale'] as const;
const GAP_BY_STAGE = ['marketGap', 'competitorGap', 'vocGap', 'goReady'] as const;

export function syncFounderMemoryOnVisit(
  projectId: string,
  stageIndex: number,
  confidence: number,
): FounderMemoryRecall {
  const currentWeek = weekKeyFromDate();
  const previous = loadFounderMemory(projectId);
  const thisWeekFocusKey = FOCUS_BY_STAGE[stageIndex] ?? FOCUS_BY_STAGE[2]!;
  const thisWeekGapKey = GAP_BY_STAGE[stageIndex] ?? GAP_BY_STAGE[2]!;

  const recall: FounderMemoryRecall = {
    isReturning: Boolean(previous && previous.weekKey !== currentWeek),
    lastWeekFocusKey: previous?.focusKey ?? FOCUS_BY_STAGE[Math.max(0, stageIndex - 1)]!,
    lastWeekGapKey: previous?.gapKey ?? GAP_BY_STAGE[Math.max(0, stageIndex - 1)]!,
    thisWeekFocusKey,
  };

  saveFounderMemory({
    projectId,
    weekKey: currentWeek,
    focusKey: thisWeekFocusKey,
    gapKey: thisWeekGapKey,
    stageIndex,
    confidence,
    updatedAt: new Date().toISOString(),
  });

  return recall;
}
