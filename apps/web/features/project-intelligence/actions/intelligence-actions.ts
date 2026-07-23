'use server';

import 'server-only';

import { buildIntelligenceViewModel } from '../services/intelligence-service';
import { buildSummary, getMemory } from '../services/memory-service';
import { buildMockProviderContext } from '../services/context-builder-service';
import { buildProjectIntelligence } from '../services/project-intelligence-service';
import type { IntelligenceViewModel } from '../types';

export type IntelligenceActionInput = Parameters<typeof buildIntelligenceViewModel>[0];

export async function loadProjectIntelligence(
  input: IntelligenceActionInput,
): Promise<IntelligenceViewModel> {
  return buildIntelligenceViewModel(input);
}

export async function restoreProjectMemory(projectId: string) {
  const memories = await getMemory(projectId);
  const summary = await buildSummary(projectId);
  return { memories, summary, count: memories.length };
}

export async function buildProjectPromptContext(input: IntelligenceActionInput) {
  const viewModel = await buildIntelligenceViewModel(input);
  return viewModel.promptContext;
}

export async function getProjectIntelligenceSummary(input: IntelligenceActionInput) {
  const intelligence = buildProjectIntelligence(input);
  const context = buildMockProviderContext({
    project: input.project,
    intelligence,
    memories: await getMemory(input.project.id),
    stats: input.stats,
    executive: input.executive,
    onboardingContext: input.onboardingContext,
  });
  return { intelligence, context };
}
