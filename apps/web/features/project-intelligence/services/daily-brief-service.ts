import type { ProjectMemoryEntry } from '@repo/db';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';

import type { DailyBriefTask, DailyBriefViewModel } from '../types';

type DailyBriefInput = {
  projectId: string;
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  strategy: StrategyWorkspaceViewModel | null;
  memories: ProjectMemoryEntry[];
  hasExecutiveReport: boolean;
};

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'brief.greeting.morning';
  if (hour < 18) return 'brief.greeting.afternoon';
  return 'brief.greeting.evening';
}

function buildTasks(input: DailyBriefInput): DailyBriefTask[] {
  const { projectId, stats, executive, hasExecutiveReport } = input;
  const tasks: DailyBriefTask[] = [];

  if (stats.research.progressPercent < 100) {
    tasks.push({
      id: 'research',
      labelKey: 'brief.tasks.research',
      whyKey: 'why.research',
      href: `/projects/${projectId}/agent`,
      stars: 5,
      estimatedMinutes: 15,
      scoreImpact: 8,
    });
  }

  if (stats.voc.total < 10) {
    tasks.push({
      id: 'voc',
      labelKey: 'brief.tasks.voc',
      whyKey: 'why.voc',
      href: `/projects/${projectId}/voc/new`,
      stars: 4,
      estimatedMinutes: 10,
      scoreImpact: 6,
    });
  }

  if (stats.evidence.total < 3) {
    tasks.push({
      id: 'evidence',
      labelKey: 'brief.tasks.evidence',
      whyKey: 'why.evidence',
      href: `/projects/${projectId}/evidence/new`,
      stars: 4,
      estimatedMinutes: 8,
      scoreImpact: 5,
    });
  }

  if (!executive?.decision && stats.research.total >= 1) {
    tasks.push({
      id: 'decision',
      labelKey: 'brief.tasks.decision',
      whyKey: 'why.decision',
      href: `/projects/${projectId}/decision`,
      stars: 5,
      estimatedMinutes: 12,
      scoreImpact: 10,
    });
  }

  if (executive?.decision && !hasExecutiveReport) {
    tasks.push({
      id: 'report',
      labelKey: 'brief.tasks.report',
      whyKey: 'why.report',
      href: `/projects/${projectId}/executive-report`,
      stars: 3,
      estimatedMinutes: 5,
      scoreImpact: 4,
    });
  }

  return tasks.slice(0, 3);
}

function pickSummaryKey(input: DailyBriefInput): {
  key: string;
  params?: Record<string, string | number>;
} {
  const { stats, executive, memories } = input;

  if (memories.some((entry) => entry.memoryType === 'COMPETITOR')) {
    return { key: 'brief.summary.competitorDone' };
  }
  if (memories.some((entry) => entry.memoryType === 'GOVERNMENT')) {
    return { key: 'brief.summary.grantUpdate' };
  }
  if (memories.some((entry) => entry.memoryType === 'MARKET')) {
    return { key: 'brief.summary.marketUpdate' };
  }
  if (executive?.decision) {
    return { key: 'brief.summary.decisionReady' };
  }
  if (stats.voc.total < 5) {
    return { key: 'brief.summary.vocGap', params: { count: stats.voc.total } };
  }
  return { key: 'brief.summary.default' };
}

function buildHighlights(memories: ProjectMemoryEntry[]): DailyBriefViewModel['highlights'] {
  const highlights: DailyBriefViewModel['highlights'] = [];

  for (const entry of memories.slice(0, 4)) {
    highlights.push({
      id: entry.id,
      labelKey: `brief.highlights.${entry.memoryType.toLowerCase()}`,
    });
  }

  if (highlights.length === 0) {
    highlights.push({ id: 'start', labelKey: 'brief.highlights.start' });
  }

  return highlights.slice(0, 3);
}

export function buildDailyBrief(input: DailyBriefInput): DailyBriefViewModel {
  const summary = pickSummaryKey(input);

  return {
    greetingKey: greetingKey(),
    summaryKey: summary.key,
    summaryParams: summary.params,
    tasks: buildTasks(input),
    highlights: buildHighlights(input.memories),
  };
}
