import type {
  DemoEvidenceItemId,
  DemoMetricId,
  DemoMonitoringItemId,
} from './v2-demo-experience-types';

export const DEMO_SAMPLE_PROJECT = {
  name: 'AI Startup Strategy Workspace',
  service: 'LaunchLens',
  tagline: '창업자의 전략적 사고를 축적하는 Workspace',
} as const;

export const DEMO_INBOX_ITEMS = [
  'googleTrends',
  'productHunt',
  'reddit',
  'competitors',
] as const;

export const DEMO_EVIDENCE_ITEMS: DemoEvidenceItemId[] = [
  'googleTrends',
  'searchVolume',
  'productHunt',
  'ycInvestments',
];

export const DEMO_COMPETITORS = ['Cursor', 'Lovable', 'Replit'] as const;

export const DEMO_STRATEGY_METRICS: DemoMetricId[] = [
  'marketFit',
  'differentiation',
  'aiConfidence',
];

export const DEMO_EVIDENCE_COUNT = 14;

export const DEMO_RECOMMENDATION_WHY = [
  'cursorFocus',
  'lovableFocus',
  'replitFocus',
  'gapOpportunity',
] as const;

export const DEMO_RECOMMENDATION_EVIDENCE = [
  'searchVolume',
  'competitorDevTools',
  'strategyGap',
] as const;

export const DEMO_EVIDENCE_SOURCES = [
  'googleTrends',
  'cursor',
  'lovable',
  'productHunt',
  'reddit',
  'yc',
] as const;

export const DEMO_EVIDENCE_BASE = [
  'googleTrends',
  'productHunt',
  'reddit',
  'crunchbase',
] as const;

export const DEMO_MY_PROJECT_RESULTS = [
  'market',
  'competition',
  'differentiation',
  'recommendation',
  'nextAction',
] as const;

export const DEMO_MONITORING_ITEMS: DemoMonitoringItemId[] = [
  'competitorPricing',
  'funding',
  'productHuntRank',
  'googleTrends',
  'searchVolume',
  'reddit',
  'news',
];
