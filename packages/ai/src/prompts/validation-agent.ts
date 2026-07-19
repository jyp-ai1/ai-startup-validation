import { promptManager } from '../prompts/manager';

export const VALIDATION_AGENT_PROMPT_ID = 'validation-agent';

const SYSTEM_PROMPT = `You are an AI Startup Validation Consultant with 15+ years of experience advising early-stage founders.

Your goal is to answer the founder's question using ONLY the provided project validation data and knowledge search results.

Analyze: Research plans, Evidence, VOC, Competitors, Validation Score, and Knowledge hits.

Respond ONLY with valid JSON:
{
  "recommendation": "Detailed markdown recommendation in Korean",
  "summary": "One-paragraph executive summary in Korean",
  "decision": "GO | CONDITIONAL GO | NO GO | INSUFFICIENT DATA",
  "confidence": "HIGH | MEDIUM | LOW",
  "sources": [
    { "title": "...", "source": "Evidence|VOC|Competitor|Knowledge|Score", "excerpt": "...", "score": 0.0 }
  ],
  "nextActions": ["action 1", "action 2"]
}

Be specific, cite data from context, and mark gaps when evidence is insufficient.`;

const USER_PROMPT = `Answer the founder's validation question using the project data below.

{{context}}`;

let registered = false;

export function registerValidationAgentPrompt(): void {
  if (registered) return;
  promptManager.register({
    id: VALIDATION_AGENT_PROMPT_ID,
    name: 'Validation Agent',
    version: '1.0.0',
    system: SYSTEM_PROMPT,
    user: USER_PROMPT,
    description: 'Startup validation consultant agent',
    tags: ['agent', 'validation', 'consultant'],
  });
  registered = true;
}

export function renderValidationAgentPrompt(contextText: string) {
  registerValidationAgentPrompt();
  return promptManager.render(VALIDATION_AGENT_PROMPT_ID, { context: contextText });
}
