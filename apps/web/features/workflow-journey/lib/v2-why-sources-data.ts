import type { InvestigationTopic } from './v2-next-action-engine';

export type WhySourceItem = {
  id: string;
  labelKey: string;
  trustKey: string;
  topic: InvestigationTopic;
};

/** Sources shown after judgment — trust labels, not internal "Evidence". */
export const WHY_SOURCE_ITEMS: WhySourceItem[] = [
  {
    id: 'google-trends',
    labelKey: 'googleTrends',
    trustKey: 'googleTrendsTrust',
    topic: 'market',
  },
  {
    id: 'news',
    labelKey: 'news',
    trustKey: 'newsTrust',
    topic: 'market',
  },
  {
    id: 'product-hunt',
    labelKey: 'productHunt',
    trustKey: 'productHuntTrust',
    topic: 'competition',
  },
  {
    id: 'crunchbase',
    labelKey: 'crunchbase',
    trustKey: 'crunchbaseTrust',
    topic: 'market',
  },
  {
    id: 'competitors',
    labelKey: 'competitors',
    trustKey: 'competitorsTrust',
    topic: 'competition',
  },
];

export const NOTEBOOK_DEFAULT_FINDINGS = [
  'competitorsUp',
  'searchVolumeUp',
  'customerChanged',
] as const;

export const NOTEBOOK_DEFAULT_AI_MEMO =
  '시장 수요는 확인됐지만, 가격 전략과 고객 검증이 아직 약합니다. 오늘은 가격만 집중 검토하는 것을 추천합니다.';
