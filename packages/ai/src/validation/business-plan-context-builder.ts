import type { BusinessPlanContext } from '@repo/types/validation';

import { buildValidationContextText } from './context-builder';

/** Serialize business plan context including validation report for LLM. */
export function buildBusinessPlanContextText(context: BusinessPlanContext): string {
  const base = buildValidationContextText(context);
  const parts = [base];

  if (context.validationReport) {
    const report = context.validationReport;
    parts.push(`# AI Validation Report: ${report.title}`);
    if (report.summary) {
      parts.push(`Summary: ${report.summary}`);
    }
    for (const section of report.sections) {
      if (section.content.trim()) {
        parts.push(
          `## ${section.title} (${section.sectionType})\n${section.content.slice(0, 1500)}`,
        );
      }
    }
  }

  return parts.join('\n\n');
}
