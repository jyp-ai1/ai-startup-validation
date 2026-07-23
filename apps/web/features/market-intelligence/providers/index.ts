import type { MarketProvider, MarketProviderId } from '../services/market-types';
import { MockMarketProvider } from './mock-provider';

const providers: Record<MarketProviderId, MarketProvider> = {
  mock: new MockMarketProvider(),
  openai: new MockMarketProvider(),
  anthropic: new MockMarketProvider(),
  gemini: new MockMarketProvider(),
  mcp_search: new MockMarketProvider(),
  browser_agent: new MockMarketProvider(),
};

export function getMarketProviderImpl(id: MarketProviderId): MarketProvider {
  return providers[id] ?? providers.mock;
}
