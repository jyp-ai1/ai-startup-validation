import type { DevelopmentSpecContext } from '@repo/types/validation';

import { buildPRDContextText } from './prd-context-builder';

/** Serialize Development Spec context including PRD for LLM. */
export function buildDevelopmentSpecContextText(context: DevelopmentSpecContext): string {
  const base = buildPRDContextText(context);
  const parts = [base];

  if (context.prd) {
    const prd = context.prd;
    parts.push(`# PRD: ${prd.title}`);
    if (prd.summary) {
      parts.push(`Summary: ${prd.summary}`);
    }
    for (const section of prd.sections) {
      if (section.content.trim()) {
        parts.push(
          `## ${section.title} (${section.sectionType})\n${section.content.slice(0, 1500)}`,
        );
      }
    }
  }

  return parts.join('\n\n');
}
