import type {
  EvidenceCollectQuery,
  EvidenceSourceProvider,
  RawEvidenceSignal,
} from '@repo/types/evidence-engine';
import type { EvidenceCategory } from '@repo/types/validation';

import type { EvidenceSource } from '../evidence-source';

type MockSignalTemplate = {
  title: string;
  signal: string;
  metric: string;
  category: EvidenceCategory;
  sourceUrl?: string;
};

const MOCK_TEMPLATES: Record<EvidenceSourceProvider, MockSignalTemplate> = {
  GOOGLE_TRENDS: {
    title: 'Search interest trend',
    signal: 'Category search volume rising over 12 months',
    metric: '+18% YoY',
    category: 'MARKET',
    sourceUrl: 'https://trends.google.com',
  },
  PRODUCT_HUNT: {
    title: 'Product Hunt launches',
    signal: 'Multiple AI validation tools launched recently',
    metric: '8 launches in 90 days',
    category: 'COMPETITOR',
    sourceUrl: 'https://producthunt.com',
  },
  CRUNCHBASE: {
    title: 'Seed funding activity',
    signal: 'Founder-tool category attracting early capital',
    metric: '4 seed rounds (2025–2026)',
    category: 'MARKET',
    sourceUrl: 'https://crunchbase.com',
  },
  GITHUB: {
    title: 'Open-source activity',
    signal: 'Related repos gaining stars and contributors',
    metric: '+240 stars / quarter',
    category: 'TECHNOLOGY',
    sourceUrl: 'https://github.com',
  },
  NEWS: {
    title: 'Industry news coverage',
    signal: 'Media coverage of founder decision tools increasing',
    metric: '14 articles / month',
    category: 'TREND',
  },
  REDDIT: {
    title: 'Founder community threads',
    signal: 'Founders discuss decision memory and evidence gaps',
    metric: '12 threads / month',
    category: 'CUSTOMER',
    sourceUrl: 'https://reddit.com/r/startups',
  },
  COMPETITOR: {
    title: 'Competitor positioning',
    signal: 'Most competitors offer report-only validation',
    metric: '5 direct · 3 indirect',
    category: 'COMPETITOR',
  },
  YOUTUBE: {
    title: 'Founder content volume',
    signal: 'YouTube creators reviewing startup validation tools',
    metric: '22 videos / quarter',
    category: 'TREND',
    sourceUrl: 'https://youtube.com',
  },
  SEARCH_VOLUME: {
    title: 'Keyword search volume',
    signal: 'Core keywords show sustained search demand',
    metric: '12K monthly searches',
    category: 'MARKET',
  },
};

/** Mock provider — returns realistic signals without external APIs. */
export function createMockEvidenceSource(
  provider: EvidenceSourceProvider,
): EvidenceSource {
  const template = MOCK_TEMPLATES[provider];
  return {
    provider,
    isAvailable: () => true,
    collect(query: EvidenceCollectQuery): Promise<RawEvidenceSignal[]> {
      const now = new Date().toISOString();
      return Promise.resolve([
        {
          provider,
          query: query.idea,
          title: `${template.title} — ${query.idea.slice(0, 40)}`,
          signal: template.signal,
          metric: template.metric,
          sourceUrl: template.sourceUrl,
          category: template.category,
          fetchedAt: now,
        },
      ]);
    },
  };
}

/** All Sprint 3.1 mock sources. */
export function createAllMockEvidenceSources(): EvidenceSource[] {
  return (
    Object.keys(MOCK_TEMPLATES) as EvidenceSourceProvider[]
  ).map(createMockEvidenceSource);
}
