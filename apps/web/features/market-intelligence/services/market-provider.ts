import type { MarketProvider, MarketProviderId } from './market-types';
import { getMarketProviderImpl } from '../providers';

export function getMarketProvider(id: MarketProviderId = 'mock'): MarketProvider {
  return getMarketProviderImpl(id);
}
