import type { ValidationAgentContext } from '@repo/types/validation';

import { buildValidationContextText } from './context-builder';

/** Serialize agent context including knowledge hits for LLM. */
export function buildValidationAgentContextText(context: ValidationAgentContext): string {
  const base = buildValidationContextText(context);
  const parts = [base, `# User Question\n${context.userQuestion}`];

  if (context.knowledgeResults.length > 0) {
    parts.push(
      `# Knowledge Search Results (${context.knowledgeResults.length})`,
      ...context.knowledgeResults.map(
        (result, index) =>
          `${index + 1}. [${result.source}] ${result.title} (score: ${result.score})\n${result.content.slice(0, 800)}`,
      ),
    );
  }

  return parts.join('\n\n');
}
