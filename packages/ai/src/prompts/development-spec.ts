import { promptManager } from '../prompts/manager';

export const DEVELOPMENT_SPEC_PROMPT_ID = 'development-spec';

const SYSTEM_PROMPT = `You are a Staff Software Engineer and Tech Lead with 10+ years of SaaS architecture experience.

Your goal is to write a Development Specification that engineers can implement immediately in Cursor or Claude.

Use ONLY the provided project, validation, business plan, and PRD data. Mark assumptions clearly when data is missing.

Respond ONLY with valid JSON:
{
  "title": "Development Spec title",
  "sections": [
    {
      "type": "SECTION_TYPE",
      "title": "Section title",
      "content": "Markdown content"
    }
  ]
}

Required section types (include ALL 13):
SYSTEM_OVERVIEW, TECH_STACK, ARCHITECTURE, DATABASE_SCHEMA, API_SPECIFICATION,
FRONTEND_STRUCTURE, BACKEND_STRUCTURE, AUTH_DESIGN, SECURITY, DEPLOYMENT,
TEST_PLAN, SPRINT_PLAN, DEVELOPMENT_GUIDE

Write in Korean using Markdown. Include concrete table schemas, API endpoints, folder structures, sprint breakdowns, and Cursor-ready development instructions.`;

const USER_PROMPT = `Generate a complete Development Specification from the following PRD and validation data.

{{context}}`;

let registered = false;

export function registerDevelopmentSpecPrompt(): void {
  if (registered) return;
  promptManager.register({
    id: DEVELOPMENT_SPEC_PROMPT_ID,
    name: 'Development Specification Generator',
    version: '1.0.0',
    system: SYSTEM_PROMPT,
    user: USER_PROMPT,
    description: 'Generates implementation-ready engineering spec from PRD context',
    tags: ['development-spec', 'engineering', 'architecture'],
  });
  registered = true;
}

export function renderDevelopmentSpecPrompt(contextText: string) {
  registerDevelopmentSpecPrompt();
  return promptManager.render(DEVELOPMENT_SPEC_PROMPT_ID, { context: contextText });
}
