import type {
  MarketAnalysisInput,
  MarketAnalysisResult,
  MarketProviderId,
} from './market-types';
import { getMarketProvider } from './market-provider';
import { selectMarketModules } from './market-selector';

export class MarketEngine {
  private readonly providerId: MarketProviderId;

  constructor(providerId: MarketProviderId = 'mock') {
    this.providerId = providerId;
  }

  async analyze(input: MarketAnalysisInput): Promise<MarketAnalysisResult> {
    const start = Date.now();
    const selectedModules = selectMarketModules(input);
    const provider = getMarketProvider(this.providerId);
    const analysis = await provider.analyze(input);

    return {
      ...analysis,
      selectedModules,
      executionDurationMs: Date.now() - start,
      providerId: this.providerId,
    };
  }
}

export const marketEngine = new MarketEngine('mock');

export type {
  MarketAnalysisInput,
  MarketAnalysisResult,
  MarketResult,
  MarketModuleId,
} from './market-types';
