const STORAGE_KEY = 'll_agent_learning_v1';

export type StoredLearningContext = {
  projectId: string;
  signals: Array<{ signal: string; weight: number; recommendation?: string }>;
  lastSuccessScore?: number;
  updatedAt: string;
};

export function loadLearningContext(projectId: string): StoredLearningContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, StoredLearningContext>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function saveLearningContext(snapshot: StoredLearningContext): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, StoredLearningContext>) : {};
    all[snapshot.projectId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export function getPreviousSuccessScore(projectId: string): number | undefined {
  return loadLearningContext(projectId)?.lastSuccessScore;
}

export function syncLearningFromPipeline(
  projectId: string,
  learning: Array<{ signal: string; weight: number; recommendation?: string }>,
  successScore: number,
): void {
  saveLearningContext({
    projectId,
    signals: learning,
    lastSuccessScore: successScore,
    updatedAt: new Date().toISOString(),
  });
}
