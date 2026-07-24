import type { ResearchProvider, ResearchProviderId } from '../services/research-agent-types';
import { MockResearchProvider } from './mock-provider';
import { OpenRouterResearchProvider } from './openrouter-provider';

const mock = new MockResearchProvider();
const openrouter = new OpenRouterResearchProvider();

const providers: Record<ResearchProviderId, ResearchProvider> = {
  mock,
  gemini: openrouter,
  openai: openrouter,
  claude: mock,
  perplexity: mock,
  mcp_search: mock,
  browser_agent: mock,
};

export function getResearchProvider(id: ResearchProviderId = 'mock'): ResearchProvider {
  return providers[id] ?? providers.mock;
}
