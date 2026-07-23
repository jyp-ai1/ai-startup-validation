import type { AppLocale } from '@repo/i18n/config';
import type { ProjectType, StartupProjectStatus } from '@repo/types/validation';

/** Intelligence modules — auto-selected by market-selector. */
export type MarketModuleId =
  | 'TAM'
  | 'SAM'
  | 'SOM'
  | 'CAGR'
  | 'MARKET_GROWTH'
  | 'MARKET_MATURITY'
  | 'TECH_TREND'
  | 'INVESTMENT_TREND'
  | 'GOVERNMENT_POLICY'
  | 'REGULATION'
  | 'ENTRY_BARRIER'
  | 'CUSTOMER_DEMAND'
  | 'TOP_COMPETITORS'
  | 'TOP_INVESTORS'
  | 'EMERGING_TECH';

export type MarketProviderId =
  | 'mock'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'mcp_search'
  | 'browser_agent';

export type MarketMaturity = 'EMERGING' | 'GROWTH' | 'MATURE' | 'DECLINING';
export type CompetitionIntensity = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type TrendDirection = 'RISING' | 'STABLE' | 'DECLINING';
export type BarrierLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type DemandLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export type MarketPlayer = {
  id: string;
  nameKey: string;
  roleKey: string;
};

export type MarketOpportunity = {
  id: string;
  labelKey: string;
  textKey: string;
};

export type MarketThreat = {
  id: string;
  labelKey: string;
  textKey: string;
};

export type MarketSource = {
  id: string;
  labelKey: string;
  sourceKey: string;
};

export type MarketDecisionDriver = {
  id: string;
  labelKey: string;
  impact: number;
  direction: 'positive' | 'negative';
};

/** Full market intelligence result — feeds Decision and Framework engines. */
export type MarketResult = {
  marketSize: number;
  tam: number;
  sam: number;
  som: number;
  growthRate: number;
  marketMaturity: MarketMaturity;
  competitionIntensity: CompetitionIntensity;
  technologyTrend: TrendDirection;
  investmentTrend: TrendDirection;
  regulation: TrendDirection;
  entryBarrier: BarrierLevel;
  customerDemand: DemandLevel;
  topPlayers: MarketPlayer[];
  topInvestors: MarketPlayer[];
  emergingTechnologyKey: string;
  opportunities: MarketOpportunity[];
  threats: MarketThreat[];
  sources: MarketSource[];
  confidence: number;
  /** Composite market attractiveness score 0–100. */
  marketScore: number;
  /** Signed impact on Decision Score (−15 to +15 typical). */
  aggregateImpact: number;
  decisionDrivers: MarketDecisionDriver[];
  analyzedAt: string;
};

export type MarketAnalysisInput = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  industry: string | null;
  country: string | null;
  targetMarket: string | null;
  stage: StartupProjectStatus;
  locale: AppLocale;
  research: { total: number; completed: number; progressPercent: number };
  evidence: {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  voc: { total: number };
  competitors: { total: number };
  grants: { total: number; avgFitScore: number | null };
};

export type MarketAnalysisResult = {
  result: MarketResult;
  selectedModules: MarketModuleId[];
  executionDurationMs: number;
  providerId: MarketProviderId;
};

export interface MarketProvider {
  readonly id: MarketProviderId;
  analyze(input: MarketAnalysisInput): Promise<MarketAnalysisResult>;
}
