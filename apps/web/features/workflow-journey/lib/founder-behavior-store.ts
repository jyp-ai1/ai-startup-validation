const BEHAVIOR_KEY = 'll_founder_behavior_v1';

export type ScoreSnapshot = {
  date: string;
  score: number;
};

export type FounderBehaviorProfile = {
  projectId: string;
  visitCount: number;
  firstVisitAt: string;
  lastVisitAt: string;
  currentGapKey: string;
  previousGapKey?: string;
  gapWeeksUnchanged: number;
  completedActionIds: string[];
  deferredGapKeys: string[];
  scoreSnapshots: ScoreSnapshot[];
  ideaSummary?: string;
  goalLabel?: string;
  targetCustomer?: string;
};

function monthLabel(date: Date): string {
  return `${date.getMonth() + 1}월`;
}

export function loadFounderBehavior(projectId: string): FounderBehaviorProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, FounderBehaviorProfile>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

function saveFounderBehavior(profile: FounderBehaviorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, FounderBehaviorProfile>) : {};
    all[profile.projectId] = profile;
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export function syncFounderBehaviorOnVisit(
  projectId: string,
  gapKey: string,
  successScore: number,
  context?: { ideaSummary?: string; goalLabel?: string; targetCustomer?: string },
): FounderBehaviorProfile {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const previous = loadFounderBehavior(projectId);

  const gapWeeksUnchanged =
    previous?.currentGapKey === gapKey ? (previous.gapWeeksUnchanged ?? 0) + 1 : 0;

  const deferredGapKeys = [...(previous?.deferredGapKeys ?? [])];
  if (gapWeeksUnchanged >= 1 && !deferredGapKeys.includes(gapKey)) {
    deferredGapKeys.push(gapKey);
  }

  const scoreSnapshots = [...(previous?.scoreSnapshots ?? [])];
  const lastSnapshot = scoreSnapshots[scoreSnapshots.length - 1];
  if (!lastSnapshot || lastSnapshot.date !== today) {
    scoreSnapshots.push({ date: today, score: successScore });
  } else {
    scoreSnapshots[scoreSnapshots.length - 1] = { date: today, score: successScore };
  }

  if (!previous && scoreSnapshots.length === 1) {
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    scoreSnapshots.unshift(
      { date: twoWeeksAgo.toISOString().slice(0, 10), score: Math.max(12, successScore - 16) },
      { date: oneWeekAgo.toISOString().slice(0, 10), score: Math.max(12, successScore - 8) },
    );
  }

  const profile: FounderBehaviorProfile = {
    projectId,
    visitCount: (previous?.visitCount ?? 0) + 1,
    firstVisitAt: previous?.firstVisitAt ?? now.toISOString(),
    lastVisitAt: now.toISOString(),
    currentGapKey: gapKey,
    previousGapKey: previous?.currentGapKey,
    gapWeeksUnchanged,
    completedActionIds: previous?.completedActionIds ?? [],
    deferredGapKeys,
    scoreSnapshots: scoreSnapshots.slice(-24),
    ideaSummary: context?.ideaSummary ?? previous?.ideaSummary,
    goalLabel: context?.goalLabel ?? previous?.goalLabel,
    targetCustomer: context?.targetCustomer ?? previous?.targetCustomer,
  };

  saveFounderBehavior(profile);
  return profile;
}

export function recordFounderActionStarted(projectId: string, actionId: string): void {
  const previous = loadFounderBehavior(projectId);
  if (!previous) return;
  const completedActionIds = previous.completedActionIds.includes(actionId)
    ? previous.completedActionIds
    : [...previous.completedActionIds, actionId];
  saveFounderBehavior({ ...previous, completedActionIds });
}

export function getFounderTimeline(profile: FounderBehaviorProfile | null): Array<{
  month: string;
  score: number;
  milestone?: string;
}> {
  if (!profile || profile.scoreSnapshots.length === 0) return [];

  const byMonth = new Map<string, number>();
  for (const snap of profile.scoreSnapshots) {
    const month = monthLabel(new Date(snap.date));
    byMonth.set(month, snap.score);
  }

  return Array.from(byMonth.entries()).map(([month, score], index, arr) => ({
    month,
    score,
    milestone:
      index === arr.length - 1 && score >= 70
        ? 'momentum'
        : index === 0
          ? 'start'
          : undefined,
  }));
}

export function hasRepeatedDeferral(profile: FounderBehaviorProfile | null, gapKey: string): boolean {
  if (!profile) return false;
  return profile.deferredGapKeys.includes(gapKey) || profile.gapWeeksUnchanged >= 1;
}
