import type { ResearchProvider, ResearchProviderId } from '../services/research-agent-types';
import { MockResearchProvider } from './mock-provider';

const stub = new MockResearchProvider();

const providers: Record<ResearchProviderId, ResearchProvider> = {
  mock: new MockResearchProvider(),
  openai: stub,
  claude: stub,
  gemini: stub,
  perplexity: stub,
  mcp_search: stub,
  browser_agent: stub,
};

export function getResearchProvider(id: ResearchProviderId = 'mock'): ResearchProvider {
  return providers[id] ?? providers.mock;
}
