/** Mock intelligence data — Epic 2 Sprint 1 (no LLM/API). */

export type EvidenceSource = {
  id: string;
  name: string;
  url?: string;
};

export type EvidenceItem = {
  id: string;
  titleKey: string;
  value: string;
  stars: number;
  confidence: number;
  sources: EvidenceSource[];
};

export type MissingDataItem = {
  id: string;
  labelKey: string;
  gain: number;
};

export type ConfidenceRule = {
  id: string;
  labelKey: string;
  gain: number;
};

export const MOCK_EVIDENCE: EvidenceItem[] = [
  {
    id: 'tam',
    titleKey: 'marketSize',
    value: '2.3조',
    stars: 5,
    confidence: 92,
    sources: [
      { id: 'kosis', name: 'KOSIS' },
      { id: 'statista', name: 'Statista' },
      { id: 'crunchbase', name: 'Crunchbase' },
    ],
  },
  {
    id: 'growth',
    titleKey: 'marketGrowth',
    value: '12.4% CAGR',
    stars: 4,
    confidence: 78,
    sources: [
      { id: 'statista', name: 'Statista' },
      { id: 'kosis', name: 'KOSIS' },
    ],
  },
];

export const MISSING_DATA: MissingDataItem[] = [
  { id: 'voc', labelKey: 'customerInterviews', gain: 15 },
  { id: 'pricing', labelKey: 'competitorPricing', gain: 8 },
  { id: 'cac', labelKey: 'cac', gain: 5 },
  { id: 'growth', labelKey: 'marketGrowthRate', gain: 10 },
];

export const CONFIDENCE_RULES: ConfidenceRule[] = [
  { id: 'market', labelKey: 'marketResearch', gain: 10 },
  { id: 'voc', labelKey: 'voc', gain: 15 },
  { id: 'competitor', labelKey: 'competitor', gain: 8 },
  { id: 'finance', labelKey: 'finance', gain: 5 },
];

export const HEALTH_DETAIL = {
  market: 92,
  technology: 71,
  execution: 54,
  customer: 86,
  finance: 77,
} as const;

export const DECISION_STABILITY = {
  label: 'Stable' as const,
  score: 72,
};

export const FUTURE_GAIN = {
  current: 62,
  target: 80,
  nextActionKey: 'voc',
  afterAction: 77,
};
