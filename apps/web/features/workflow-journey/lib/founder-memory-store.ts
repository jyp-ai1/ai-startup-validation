const STORAGE_KEY = 'll_founder_memory_v1';

export type StoredFounderMemory = {
  projectId: string;
  weekKey: string;
  dayKey: string;
  focusKey: string;
  gapKey: string;
  stageIndex: number;
  confidence: number;
  successScore: number;
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

export type MemoryGeneratedAction = {
  recall: FounderMemoryRecall;
  actionTitleKey: string;
  questionKeys: string[];
  etaMinutes: number;
  pipelineAction?: {
    actionTitle: string;
    questions: string[];
    etaMinutes: number;
  };
};

export type DailyScoreSnapshot = {
  successScore: number;
  delta: number;
  isNewDay: boolean;
};

const FOCUS_BY_STAGE = ['marketValidation', 'competitorAnalysis', 'pricingValidation', 'executionScale'] as const;
const GAP_BY_STAGE = ['marketGap', 'competitorGap', 'vocGap', 'goReady'] as const;

function dayKeyFromDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function computeSuccessScore(confidence: number, stageIndex: number): number {
  const stageBoost = [0, 4, 8, 12][stageIndex] ?? 0;
  return Math.min(99, Math.max(12, confidence + stageBoost));
}

export function syncDailyScoreSnapshot(
  projectId: string,
  stageIndex: number,
  confidence: number,
): DailyScoreSnapshot {
  const currentDay = dayKeyFromDate();
  const previous = loadFounderMemory(projectId);
  const successScore = computeSuccessScore(confidence, stageIndex);
  const isNewDay = Boolean(previous && previous.dayKey !== currentDay);
  const delta =
    isNewDay && previous ? Math.max(0, successScore - (previous.successScore ?? successScore - 3)) : 0;

  return { successScore, delta: delta || (isNewDay ? 0 : 3), isNewDay };
}

const MEMORY_ACTION_BY_GAP: Record<
  string,
  { actionTitleKey: string; questionKeys: string[]; etaMinutes: number }
> = {
  marketGap: {
    actionTitleKey: 'marketSizingInterview',
    questionKeys: ['q1', 'q2', 'q3', 'q4', 'q5'],
    etaMinutes: 15,
  },
  competitorGap: {
    actionTitleKey: 'competitorMatrix',
    questionKeys: ['c1', 'c2', 'c3', 'c4', 'c5'],
    etaMinutes: 20,
  },
  vocGap: {
    actionTitleKey: 'pricingInterview',
    questionKeys: ['v1', 'v2', 'v3', 'v4', 'v5'],
    etaMinutes: 15,
  },
  goReady: {
    actionTitleKey: 'executionKickoff',
    questionKeys: ['e1', 'e2', 'e3'],
    etaMinutes: 12,
  },
};

export function buildMemoryGeneratedAction(
  recall: FounderMemoryRecall,
  gapKey: string,
): MemoryGeneratedAction {
  const template = MEMORY_ACTION_BY_GAP[gapKey] ?? MEMORY_ACTION_BY_GAP.vocGap!;
  return {
    recall,
    ...template,
  };
}

export function syncFounderMemoryOnVisit(
  projectId: string,
  stageIndex: number,
  confidence: number,
): FounderMemoryRecall {
  const currentWeek = weekKeyFromDate();
  const currentDay = dayKeyFromDate();
  const previous = loadFounderMemory(projectId);
  const thisWeekFocusKey = FOCUS_BY_STAGE[stageIndex] ?? FOCUS_BY_STAGE[2]!;
  const thisWeekGapKey = GAP_BY_STAGE[stageIndex] ?? GAP_BY_STAGE[2]!;
  const successScore = computeSuccessScore(confidence, stageIndex);

  const recall: FounderMemoryRecall = {
    isReturning: Boolean(previous && previous.weekKey !== currentWeek),
    lastWeekFocusKey: previous?.focusKey ?? FOCUS_BY_STAGE[Math.max(0, stageIndex - 1)]!,
    lastWeekGapKey: previous?.gapKey ?? GAP_BY_STAGE[Math.max(0, stageIndex - 1)]!,
    thisWeekFocusKey,
  };

  saveFounderMemory({
    projectId,
    weekKey: currentWeek,
    dayKey: currentDay,
    focusKey: thisWeekFocusKey,
    gapKey: thisWeekGapKey,
    stageIndex,
    confidence,
    successScore,
    updatedAt: new Date().toISOString(),
  });

  return recall;
}
