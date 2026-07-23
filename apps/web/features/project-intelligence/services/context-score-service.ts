import type { ProjectMemoryEntry } from '@repo/db';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';

import type { ContextScoreViewModel } from '../types';

type ContextScoreInput = {
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  strategy: StrategyWorkspaceViewModel | null;
  memories: ProjectMemoryEntry[];
  hasExecutiveReport: boolean;
};

function projectCompleteness(input: ContextScoreInput): number {
  const { project } = input.stats;
  let filled = 0;
  const fields = [
    project.summary,
    project.targetCustomer,
    project.industry,
    project.businessModel,
    project.problem,
    project.solution,
  ];
  for (const field of fields) {
    if (field && field.trim().length > 0) filled += 1;
  }
  return Math.round((filled / fields.length) * 100);
}

function memoryScore(memories: ProjectMemoryEntry[]): number {
  const uniqueTypes = new Set(memories.map((entry) => entry.memoryType));
  const typeCoverage = (uniqueTypes.size / 8) * 100;
  const volume = Math.min(40, memories.length * 4);
  return Math.min(100, Math.round(typeCoverage * 0.6 + volume));
}

function evidenceScore(stats: ProjectDashboardStats): number {
  const total = stats.evidence.total;
  const high = stats.evidence.byConfidence.HIGH;
  const base = Math.min(70, total * 12);
  const boost = Math.min(30, high * 10);
  return Math.min(100, base + boost);
}

function decisionReadyScore(input: ContextScoreInput): number {
  const { stats, executive, strategy, hasExecutiveReport } = input;
  if (hasExecutiveReport) return 100;
  if (executive?.verdict === 'GO') return 95;
  if (executive?.verdict === 'HOLD') return 75;

  const progress = strategy?.overallProgress ?? 0;
  const vocReady = stats.voc.total >= 10 ? 25 : stats.voc.total * 2.5;
  const evidenceReady = stats.evidence.total >= 3 ? 25 : stats.evidence.total * 8;
  const researchReady = stats.research.total >= 1 ? 20 : 0;
  return Math.min(100, Math.round(progress * 0.3 + vocReady + evidenceReady + researchReady));
}

export function buildContextScore(input: ContextScoreInput): ContextScoreViewModel {
  return {
    projectCompleteness: projectCompleteness(input),
    memory: memoryScore(input.memories),
    evidence: evidenceScore(input.stats),
    decisionReady: decisionReadyScore(input),
  };
}
