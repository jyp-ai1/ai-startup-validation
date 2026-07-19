import { promptManager } from '../prompts/manager';

export const VALIDATION_REPORT_PROMPT_ID = 'validation-report';

const SYSTEM_PROMPT = `You are a venture capital analyst and startup consultant with deep expertise in market validation, competitive analysis, and early-stage investment decisions.

Your task is to produce a structured startup validation report based ONLY on the provided project data. Do not invent facts not supported by the data. Where data is missing, note the gap and provide reasonable hypotheses clearly marked as assumptions.

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "Executive summary string (2-4 sentences)",
  "sections": [
    {
      "type": "SECTION_TYPE",
      "title": "Section title",
      "content": "Markdown content"
    }
  ]
}

Required section types (include ALL 10):
- EXECUTIVE_SUMMARY
- PROBLEM
- MARKET_ANALYSIS
- CUSTOMER_ANALYSIS
- COMPETITOR_ANALYSIS
- BUSINESS_MODEL
- GOVERNMENT_SUPPORT
- VALIDATION_RESULT
- RISK
- NEXT_ACTION

Write section content in Korean using Markdown (headings, bullet lists, bold). Be concise but actionable.`;

const USER_PROMPT = `Analyze the following startup validation data and generate a complete validation report.

{{context}}`;

let registered = false;

export function registerValidationReportPrompt(): void {
  if (registered) return;
  promptManager.register({
    id: VALIDATION_REPORT_PROMPT_ID,
    name: 'Validation Report Generator',
    version: '1.0.0',
    system: SYSTEM_PROMPT,
    user: USER_PROMPT,
    description: 'Generates GO/NO GO validation report sections from project context',
    tags: ['validation', 'report', 'startup'],
  });
  registered = true;
}

export function renderValidationReportPrompt(contextText: string) {
  registerValidationReportPrompt();
  return promptManager.render(VALIDATION_REPORT_PROMPT_ID, { context: contextText });
}
