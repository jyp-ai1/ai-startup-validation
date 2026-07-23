import type { ProjectMemoryEntry } from '@repo/db';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { OnboardingContext } from '@/features/onboarding-consultant/types';
import type { StartupProject } from '@repo/types/validation';

import type { ProjectIntelligence, PromptContext, PromptContextProvider } from '../types';

type ContextBuilderInput = {
  project: StartupProject;
  intelligence: ProjectIntelligence;
  memories: ProjectMemoryEntry[];
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  onboardingContext?: OnboardingContext | null;
  provider?: PromptContextProvider;
};

function serializeBlocks(blocks: PromptContext['blocks']): string {
  return blocks.map((block) => `## ${block.section}\n${block.content}`).join('\n\n');
}

export function buildPromptContext(input: ContextBuilderInput): PromptContext {
  const provider = input.provider ?? 'mock';
  const { intelligence, memories, stats, executive, onboardingContext } = input;

  const memoryLines = memories
    .slice(0, 20)
    .map((entry) => `- [${entry.memoryType}] ${entry.summary ?? entry.title}`);

  const decisionLine = executive?.decision
    ? `Decision: ${executive.verdict} (score ${executive.decision.scores.decisionScore})`
    : 'Decision: not generated';

  const blocks: PromptContext['blocks'] = [
    {
      section: 'Project Summary',
      content: intelligence.projectSummary,
    },
    {
      section: 'Business Context',
      content: [
        `Goal: ${intelligence.businessGoal ?? 'unknown'}`,
        `Target customer: ${intelligence.targetCustomer ?? 'unknown'}`,
        `Industry: ${intelligence.industry ?? 'unknown'}`,
        `Business model: ${intelligence.businessModel ?? 'unknown'}`,
        `Stage: ${intelligence.stage}`,
        `Risk signal: ${intelligence.risk ?? 'none'}`,
        `Opportunity: ${intelligence.opportunity ?? 'validation'}`,
      ].join('\n'),
    },
    {
      section: 'Validation Stats',
      content: [
        `Research progress: ${stats.research.progressPercent}%`,
        `VOC entries: ${stats.voc.total}`,
        `Evidence items: ${stats.evidence.total}`,
        `Competitors mapped: ${stats.competitors.total}`,
        `Grant programs: ${stats.grants.total}`,
        decisionLine,
      ].join('\n'),
    },
    {
      section: 'Onboarding Interview',
      content: onboardingContext?.summary ?? 'No onboarding interview completed.',
    },
    {
      section: 'Project Memory',
      content: memoryLines.length > 0 ? memoryLines.join('\n') : 'No memory entries yet.',
    },
  ];

  return {
    projectId: input.project.id,
    provider,
    blocks,
    serialized: serializeBlocks(blocks),
  };
}

/** Mock provider — returns structured context without external LLM call. */
export function buildMockProviderContext(input: ContextBuilderInput): PromptContext {
  return buildPromptContext({ ...input, provider: 'mock' });
}

/** OpenRouter-ready shape — same structure, different provider tag. */
export function buildOpenRouterContext(input: ContextBuilderInput): PromptContext {
  return buildPromptContext({ ...input, provider: 'openrouter' });
}

/** Claude-ready shape — same structure, different provider tag. */
export function buildClaudeContext(input: ContextBuilderInput): PromptContext {
  return buildPromptContext({ ...input, provider: 'claude' });
}
