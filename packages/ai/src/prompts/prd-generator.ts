import { promptManager } from '../prompts/manager';

export const PRD_GENERATOR_PROMPT_ID = 'prd-generator';

const SYSTEM_PROMPT = `You are a Product Manager with 10+ years of experience and a Senior Software Architect.

Your goal is to write a PRD (Product Requirements Document) that a development team can implement immediately.

Use ONLY the provided validation and business data. Mark assumptions clearly when data is missing.

Respond ONLY with valid JSON:
{
  "title": "PRD title string",
  "sections": [
    {
      "type": "SECTION_TYPE",
      "title": "Section title",
      "content": "Markdown content"
    }
  ]
}

Required section types (include ALL 14):
PRODUCT_OVERVIEW, PROBLEM_DEFINITION, TARGET_USER, USER_PERSONA, USER_FLOW,
FEATURE_REQUIREMENTS, FUNCTIONAL_REQUIREMENTS, NON_FUNCTIONAL_REQUIREMENTS,
MVP_SCOPE, TECH_REQUIREMENTS, DATABASE_DESIGN, API_SPECIFICATION, EDGE_CASE, ROADMAP

Write in Korean using Markdown. Include concrete user stories, acceptance criteria, API endpoints, and table schemas where relevant.`;

const USER_PROMPT = `Generate a complete PRD from the following validated startup data.

{{context}}`;

let registered = false;

export function registerPRDGeneratorPrompt(): void {
  if (registered) return;
  promptManager.register({
    id: PRD_GENERATOR_PROMPT_ID,
    name: 'PRD Generator',
    version: '1.0.0',
    system: SYSTEM_PROMPT,
    user: USER_PROMPT,
    description: 'Generates implementation-ready PRD from validation context',
    tags: ['prd', 'product', 'development'],
  });
  registered = true;
}

export function renderPRDGeneratorPrompt(contextText: string) {
  registerPRDGeneratorPrompt();
  return promptManager.render(PRD_GENERATOR_PROMPT_ID, { context: contextText });
}
