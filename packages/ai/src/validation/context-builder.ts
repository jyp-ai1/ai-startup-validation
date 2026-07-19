import type { ValidationReportContext } from '@repo/types/validation';

/** Serialize project validation data for LLM prompt injection. */
export function buildValidationContextText(context: ValidationReportContext): string {
  const sections: string[] = [];

  sections.push(`# Startup Project
Title: ${context.project.title}
Summary: ${context.project.summary}
Problem: ${context.project.problem ?? 'N/A'}
Solution: ${context.project.solution ?? 'N/A'}
Target Customer: ${context.project.targetCustomer ?? 'N/A'}
Industry: ${context.project.industry ?? 'N/A'}
Business Model: ${context.project.businessModel ?? 'N/A'}
Status: ${context.project.status}`);

  if (context.researchPlans.length > 0) {
    sections.push(
      `# Research Plans (${context.researchPlans.length})
${context.researchPlans
  .map(
    (plan, index) =>
      `${index + 1}. [${plan.researchType}] ${plan.title} (${plan.status}, ${plan.priority}) — ${plan.description ?? 'No description'}`,
  )
  .join('\n')}`,
    );
  }

  if (context.evidence.length > 0) {
    sections.push(
      `# Evidence (${context.evidence.length})
${context.evidence
  .map(
    (item, index) =>
      `${index + 1}. [${item.category}] ${item.title} (confidence: ${item.confidence}) — ${item.summary}`,
  )
  .join('\n')}`,
    );
  }

  if (context.competitors.length > 0) {
    sections.push(
      `# Competitors (${context.competitors.length})
${context.competitors
  .map(
    (item, index) =>
      `${index + 1}. ${item.name} (${item.category})
   Strengths: ${item.strengths ?? 'N/A'}
   Weaknesses: ${item.weaknesses ?? 'N/A'}
   Differentiation: ${item.differentiation ?? 'N/A'}
   Business Model: ${item.businessModel ?? 'N/A'}`,
  )
  .join('\n')}`,
    );
  }

  if (context.voc.length > 0) {
    sections.push(
      `# Voice of Customer (${context.voc.length})
${context.voc
  .map(
    (item, index) =>
      `${index + 1}. ${item.title}
   Pain Point: ${item.painPoint}
   Severity: ${item.severity ?? 'N/A'} | Frequency: ${item.frequency ?? 'N/A'} | WTP: ${item.willingnessToPay}`,
  )
  .join('\n')}`,
    );
  }

  if (context.grants.length > 0) {
    sections.push(
      `# Government Grants (${context.grants.length})
${context.grants
  .map(
    (item, index) =>
      `${index + 1}. ${item.name} (${item.organization}) — fit: ${item.fitScore ?? 'N/A'}, status: ${item.status}`,
  )
  .join('\n')}`,
    );
  }

  if (context.validationScore) {
    const score = context.validationScore;
    sections.push(`# Validation Score
Total: ${score.totalScore}/100 — Decision: ${score.decision}
Market: ${score.marketScore}/20 | Problem: ${score.problemScore}/20 | Competition: ${score.competitionScore}/15
Business Model: ${score.businessModelScore}/15 | Execution: ${score.executionScore}/15 | Founder Fit: ${score.founderFitScore}/15
Comment: ${score.comment ?? 'N/A'}`);
  }

  return sections.join('\n\n');
}
