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

export const DEMO_MONITORING_ITEMS: DemoMonitoringItemId[] = [
  'competitorPricing',
  'funding',
  'productHuntRank',
  'googleTrends',
  'searchVolume',
  'reddit',
  'news',
];
