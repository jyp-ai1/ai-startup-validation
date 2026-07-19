import type { ValidationAgentContext } from '@repo/types/validation';

import { collectValidationContext } from '@/features/ai-report/services/context-collector';
import { searchProjectKnowledge } from '@/features/knowledge/services/knowledge-processor';

/** Collect validation data + knowledge search for agent. */
export async function collectValidationAgentContext(
  projectId: string,
  question: string,
): Promise<ValidationAgentContext | null> {
  const base = await collectValidationContext(projectId);
  if (!base) return null;

  const knowledgeResults = await searchProjectKnowledge(projectId, question, 5);

  return {
    ...base,
    knowledgeResults,
    userQuestion: question,
  };
}
