import { promptManager } from '../prompts/manager';

export const BUSINESS_PLAN_PROMPT_ID = 'business-plan';

const SYSTEM_PROMPT = `You are a startup investment analyst and government grant evaluation committee member.

Your goal is to write a compelling business plan that presents the startup as highly viable for investors and government support programs.

Use ONLY the provided project data. Where data is missing, note assumptions clearly.

Respond ONLY with valid JSON matching this schema:
{
  "title": "Business plan title string",
  "sections": [
    {
      "type": "SECTION_TYPE",
      "title": "Section title in Korean",
      "content": "Markdown content in Korean"
    }
  ]
}

Required section types (include ALL 16):
OVERVIEW, BACKGROUND, PROBLEM, MARKET, CUSTOMER, SOLUTION, PRODUCT, COMPETITION,
BUSINESS_MODEL, GROWTH, MARKETING, OPERATION, TECHNOLOGY, GOVERNMENT, RISK, ROADMAP

Write professionally for grant/investor submission. Use Markdown (headings, lists, bold).`;

const USER_PROMPT = `Create a complete business plan based on the following startup validation data.

{{context}}`;

let registered = false;

export function registerBusinessPlanPrompt(): void {
  if (registered) return;
  promptManager.register({
    id: BUSINESS_PLAN_PROMPT_ID,
    name: 'Business Plan Generator',
    version: '1.0.0',
    system: SYSTEM_PROMPT,
    user: USER_PROMPT,
    description: 'Generates investor/grant-ready business plan from validation context',
    tags: ['business-plan', 'startup', 'grant'],
  });
  registered = true;
}

export function renderBusinessPlanPrompt(contextText: string) {
  registerBusinessPlanPrompt();
  return promptManager.render(BUSINESS_PLAN_PROMPT_ID, { context: contextText });
}
