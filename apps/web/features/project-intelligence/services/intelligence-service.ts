import 'server-only';

import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { OnboardingContext } from '@/features/onboarding-consultant/types';
import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';
import type { ProjectMemoryEntry } from '@repo/db';
import type { StartupProject } from '@repo/types/validation';

import type { IntelligenceMemorySections, IntelligenceViewModel, ProactiveMessage } from '../types';
import { buildContextScore } from './context-score-service';
import { buildMockProviderContext } from './context-builder-service';
import { buildDailyBrief } from './daily-brief-service';
import { getMemory, saveMemory } from './memory-service';
import { buildProjectIntelligence } from './project-intelligence-service';
import { buildExecutiveTimeline } from './timeline-service';

type IntelligenceBuildInput = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  strategy: StrategyWorkspaceViewModel | null;
  onboardingContext?: OnboardingContext | null;
  hasExecutiveReport: boolean;
  orchestratorPlan: ExecutionPlan | null;
};

function buildMemorySections(memories: ProjectMemoryEntry[]): IntelligenceMemorySections {
  return {
    conversations: memories.filter((entry) => entry.memoryType === 'CONVERSATION').slice(0, 3),
    research: memories.filter((entry) =>
      ['RESEARCH', 'MARKET'].includes(entry.memoryType),
    ).slice(0, 3),
    decisions: memories.filter((entry) => entry.memoryType === 'DECISION').slice(0, 3),
    reports: memories.filter((entry) => entry.memoryType === 'REPORT').slice(0, 3),
    activities: memories
      .filter((entry) =>
        ['EVIDENCE', 'COMPETITOR', 'GOVERNMENT'].includes(entry.memoryType),
      )
      .slice(0, 5),
  };
}

function buildProactiveMessage(
  input: IntelligenceBuildInput,
  memories: ProjectMemoryEntry[],
): ProactiveMessage {
  const projectId = input.project.id;
  const { stats } = input;

  const lastMarket = memories.find((entry) => entry.memoryType === 'MARKET');
  if (lastMarket?.summary?.toLowerCase().includes('tam') || stats.research.total >= 1) {
    return {
      messageKey: 'proactive.tam',
      actionKey: 'proactive.action.tam',
      actionHref: `/projects/${projectId}/market-intelligence`,
    };
  }

  if (stats.voc.total < 5) {
    return {
      messageKey: 'proactive.voc',
      messageParams: { count: stats.voc.total },
      actionKey: 'proactive.action.voc',
      actionHref: `/projects/${projectId}/voc/new`,
    };
  }

  if (stats.competitors.total < 2) {
    return {
      messageKey: 'proactive.competitor',
      actionKey: 'proactive.action.competitor',
      actionHref: `/projects/${projectId}/competitors`,
    };
  }

  if (stats.evidence.total < 3) {
    return {
      messageKey: 'proactive.evidence',
      actionKey: 'proactive.action.evidence',
      actionHref: `/projects/${projectId}/evidence/new`,
    };
  }

  if (input.executive?.decision && !input.hasExecutiveReport) {
    return {
      messageKey: 'proactive.report',
      actionKey: 'proactive.action.report',
      actionHref: `/projects/${projectId}/executive-report`,
    };
  }

  return {
    messageKey: 'proactive.continue',
    actionKey: 'proactive.action.continue',
    actionHref: `/projects/${projectId}/agent`,
  };
}

async function seedMemoriesFromProject(input: IntelligenceBuildInput): Promise<void> {
  const { project, stats, executive, onboardingContext, hasExecutiveReport, orchestratorPlan } =
    input;

  if (onboardingContext?.completedAt) {
    await saveMemory({
      projectId: project.id,
      memoryType: 'CONVERSATION',
      title: 'Onboarding interview completed',
      summary: onboardingContext.summary,
      occurredAt: onboardingContext.completedAt,
      sourceId: 'seed-onboarding',
    });
  }

  for (const activity of stats.recentActivity.slice(0, 8)) {
    const typeMap: Record<string, ProjectMemoryEntry['memoryType']> = {
      RESEARCH: 'RESEARCH',
      EVIDENCE: 'EVIDENCE',
      VOC: 'CONVERSATION',
      COMPETITOR: 'COMPETITOR',
      VALIDATION: 'DECISION',
      REPORT: 'REPORT',
    };
    await saveMemory({
      projectId: project.id,
      memoryType: typeMap[activity.type] ?? 'RESEARCH',
      title: activity.label,
      summary: activity.label,
      occurredAt: activity.occurredAt,
      sourceId: `seed-activity-${activity.id}`,
    });
  }

  if (orchestratorPlan?.status === 'COMPLETED') {
    await saveMemory({
      projectId: project.id,
      memoryType: 'RESEARCH',
      title: 'AI orchestrator research completed',
      summary: 'Multi-agent research pipeline finished.',
      occurredAt: orchestratorPlan.completedAt ?? orchestratorPlan.startedAt,
      sourceId: 'seed-orchestrator',
    });
  }

  if (executive?.decision) {
    await saveMemory({
      projectId: project.id,
      memoryType: 'DECISION',
      title: `Decision: ${executive.verdict}`,
      summary: `Verdict ${executive.verdict} with score ${executive.decision.scores.decisionScore}`,
      occurredAt: executive.decision.generatedAt,
      sourceId: 'seed-decision',
    });
  }

  if (hasExecutiveReport) {
    await saveMemory({
      projectId: project.id,
      memoryType: 'REPORT',
      title: 'Executive report generated',
      summary: 'Strategy report is ready for export.',
      occurredAt: project.updatedAt,
      sourceId: 'seed-report',
    });
  }

  if (stats.grants.total > 0) {
    await saveMemory({
      projectId: project.id,
      memoryType: 'GOVERNMENT',
      title: 'Government grant programs reviewed',
      summary: `${stats.grants.total} grant programs mapped.`,
      occurredAt: project.updatedAt,
      sourceId: 'seed-grants',
    });
  }

  if (stats.competitors.total > 0) {
    await saveMemory({
      projectId: project.id,
      memoryType: 'COMPETITOR',
      title: 'Competitor landscape updated',
      summary: `${stats.competitors.total} competitors registered.`,
      occurredAt: project.updatedAt,
      sourceId: 'seed-competitors',
    });
  }
}

/** Load, seed, and assemble the full intelligence view model for a project. */
export async function buildIntelligenceViewModel(
  input: IntelligenceBuildInput,
): Promise<IntelligenceViewModel> {
  await seedMemoriesFromProject(input);
  const memories = await getMemory(input.project.id);

  const intelligence = buildProjectIntelligence(input);
  const contextScore = buildContextScore({
    stats: input.stats,
    executive: input.executive,
    strategy: input.strategy,
    memories,
    hasExecutiveReport: input.hasExecutiveReport,
  });
  const dailyBrief = buildDailyBrief({
    projectId: input.project.id,
    stats: input.stats,
    executive: input.executive,
    strategy: input.strategy,
    memories,
    hasExecutiveReport: input.hasExecutiveReport,
  });
  const timeline = buildExecutiveTimeline(input.project.id, memories);
  const proactiveMessage = buildProactiveMessage(input, memories);
  const memorySections = buildMemorySections(memories);
  const promptContext = buildMockProviderContext({
    project: input.project,
    intelligence,
    memories,
    stats: input.stats,
    executive: input.executive,
    onboardingContext: input.onboardingContext,
  });

  return {
    intelligence,
    memories,
    contextScore,
    dailyBrief,
    timeline,
    proactiveMessage,
    memorySections,
    promptContext,
  };
}
