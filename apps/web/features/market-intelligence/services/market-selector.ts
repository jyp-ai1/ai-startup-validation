import type { MarketAnalysisInput, MarketModuleId } from './market-types';

const STARTUP: MarketModuleId[] = [
  'TAM',
  'SAM',
  'SOM',
  'CAGR',
  'CUSTOMER_DEMAND',
  'TOP_COMPETITORS',
  'TECH_TREND',
  'INVESTMENT_TREND',
];

const EXPANSION: MarketModuleId[] = [
  'TAM',
  'SAM',
  'MARKET_GROWTH',
  'MARKET_MATURITY',
  'REGULATION',
  'ENTRY_BARRIER',
  'TOP_COMPETITORS',
  'GOVERNMENT_POLICY',
];

const AI: MarketModuleId[] = [
  'TAM',
  'TECH_TREND',
  'EMERGING_TECH',
  'INVESTMENT_TREND',
  'TOP_INVESTORS',
  'TOP_COMPETITORS',
  'MARKET_GROWTH',
];

const BUSINESS: MarketModuleId[] = [
  'TAM',
  'SAM',
  'SOM',
  'CAGR',
  'MARKET_MATURITY',
  'TOP_COMPETITORS',
  'REGULATION',
  'CUSTOMER_DEMAND',
];

const DEFAULT: MarketModuleId[] = [
  'TAM',
  'SAM',
  'SOM',
  'CAGR',
  'MARKET_GROWTH',
  'TOP_COMPETITORS',
  'REGULATION',
  'CUSTOMER_DEMAND',
];

/**
 * Auto-select intelligence modules by project type, industry, and market context.
 * Not a standalone menu — invoked as Decision analysis input.
 */
export function selectMarketModules(input: MarketAnalysisInput): MarketModuleId[] {
  let base: MarketModuleId[];

  switch (input.projectType) {
    case 'STARTUP':
      base = [...STARTUP];
      break;
    case 'MARKET_EXPANSION':
      base = [...EXPANSION];
      break;
    case 'AI_INITIATIVE':
      base = [...AI];
      break;
    case 'BUSINESS_STRATEGY':
    case 'NEW_BUSINESS':
    case 'DIGITAL_TRANSFORMATION':
      base = [...BUSINESS];
      break;
    default:
      base = [...DEFAULT];
  }

  const industry = input.industry?.toLowerCase() ?? '';

  if (industry.includes('ai') || industry.includes('tech')) {
    if (!base.includes('EMERGING_TECH')) base.push('EMERGING_TECH');
    if (!base.includes('INVESTMENT_TREND')) base.push('INVESTMENT_TREND');
  }

  if (input.grants.total >= 1 && !base.includes('GOVERNMENT_POLICY')) {
    base.push('GOVERNMENT_POLICY');
  }

  if (input.competitors.total >= 3 && !base.includes('TOP_COMPETITORS')) {
    base.push('TOP_COMPETITORS');
  }

  if (input.stage === 'DRAFT' || input.stage === 'RESEARCHING') {
    if (!base.includes('CUSTOMER_DEMAND')) base.unshift('CUSTOMER_DEMAND');
  }

  return [...new Set(base)].slice(0, 10);
}
