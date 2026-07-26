import type { StrategyVerdict } from '@repo/agents';

import type { BusinessProgressDimension, GeneratedTodayAction } from './founder-intelligence-engine';
import type { FounderEvidenceEntry } from './founder-evidence-store';

const STATE_KEY = 'll_founder_operating_state_v1';

export type OperatingTimelineMilestone = {
  key: 'idea' | 'market' | 'customer' | 'pricing' | 'go' | 'mvp' | 'investment';
  status: 'done' | 'running' | 'upcoming';
};

export type ActionDebriefSnapshot = {
  actionTitle: string;
  actionKind: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  insight: string;
  evidenceSummary: string;
  verdictBefore: StrategyVerdict;
  verdictAfter: StrategyVerdict;
  nextActionTitle?: string;
  nextActionMinutes?: number;
  nextActionImpact?: number;
  completedAt: string;
};

export type FounderProjectOperatingState = {
  projectId: string;
  successScore: number;
  verdict: StrategyVerdict;
  decisionConfidence: number;
  businessProgress: BusinessProgressDimension[];
  todayActions: GeneratedTodayAction[];
  evidence: FounderEvidenceEntry[];
  timeline: OperatingTimelineMilestone[];
  lastDebrief?: ActionDebriefSnapshot;
  updatedAt: string;
};

export function loadProjectOperatingState(projectId: string): FounderProjectOperatingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, FounderProjectOperatingState>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function saveProjectOperatingState(state: FounderProjectOperatingState): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, FounderProjectOperatingState>) : {};
    all[state.projectId] = state;
    localStorage.setItem(STATE_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export function resolveOperatingTimeline(
  progress: BusinessProgressDimension[],
  verdict: StrategyVerdict,
): OperatingTimelineMilestone[] {
  const market = progress.find((d) => d.key === 'market')?.percent ?? 0;
  const customer = progress.find((d) => d.key === 'customer')?.percent ?? 0;
  const pricing = progress.find((d) => d.key === 'pricing')?.percent ?? 0;
  const investment = progress.find((d) => d.key === 'investment')?.percent ?? 0;

  const stages: Array<{ key: OperatingTimelineMilestone['key']; done: boolean }> = [
    { key: 'idea', done: true },
    { key: 'market', done: market >= 60 },
    { key: 'customer', done: customer >= 45 },
    { key: 'pricing', done: pricing >= 50 },
    { key: 'go', done: verdict === 'GO' || (customer >= 55 && pricing >= 45) },
    { key: 'mvp', done: customer >= 70 && pricing >= 55 },
    { key: 'investment', done: investment >= 35 },
  ];

  let runningAssigned = false;
  return stages.map(({ key, done }) => {
    if (done) return { key, status: 'done' as const };
    if (!runningAssigned) {
      runningAssigned = true;
      return { key, status: 'running' as const };
    }
    return { key, status: 'upcoming' as const };
  });
}
