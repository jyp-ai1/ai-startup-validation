import type {
  GeneratedEvidenceItem,
  ResearchProvider,
  ResearchRequest,
  ResearchResultPayload,
  ResearchSource,
  ResearchTaskType,
} from '../services/research-agent-types';

function buildSources(request: ResearchRequest): ResearchSource[] {
  return [
    {
      id: 'src-web-1',
      titleKey: 'sources.industryReport',
      url: 'https://example.com/market-report',
      sourceType: 'WEB',
    },
    {
      id: 'src-gov-1',
      titleKey: 'sources.governmentPortal',
      sourceType: 'GOVERNMENT',
    },
    {
      id: 'src-news-1',
      titleKey: 'sources.newsAnalysis',
      sourceType: 'NEWS',
    },
  ];
}

function buildEvidence(
  tasks: ResearchTaskType[],
  request: ResearchRequest,
): GeneratedEvidenceItem[] {
  const items: GeneratedEvidenceItem[] = [];
  let idx = 0;

  if (tasks.includes('MARKET')) {
    items.push({
      id: `ev-${idx++}`,
      titleKey: 'evidence.marketSize.title',
      summaryKey: 'evidence.marketSize.summary',
      confidence: 'HIGH',
      sourceId: 'src-web-1',
      category: 'MARKET',
    });
  }
  if (tasks.includes('COMPETITOR')) {
    items.push({
      id: `ev-${idx++}`,
      titleKey: 'evidence.competitor.title',
      summaryKey: 'evidence.competitor.summary',
      confidence: 'MEDIUM',
      sourceId: 'src-web-1',
      category: 'COMPETITOR',
    });
  }
  if (tasks.includes('GOVERNMENT')) {
    items.push({
      id: `ev-${idx++}`,
      titleKey: 'evidence.government.title',
      summaryKey: 'evidence.government.summary',
      confidence: 'HIGH',
      sourceId: 'src-gov-1',
      category: 'GOVERNMENT',
    });
  }
  if (tasks.includes('VOC')) {
    items.push({
      id: `ev-${idx++}`,
      titleKey: 'evidence.voc.title',
      summaryKey: 'evidence.voc.summary',
      confidence: 'MEDIUM',
      sourceId: 'src-news-1',
      category: 'VOC',
    });
  }
  if (tasks.includes('TECHNOLOGY')) {
    items.push({
      id: `ev-${idx++}`,
      titleKey: 'evidence.technology.title',
      summaryKey: 'evidence.technology.summary',
      confidence: 'HIGH',
      sourceId: 'src-web-1',
      category: 'TECHNOLOGY',
    });
  }

  return items;
}

export class MockResearchProvider implements ResearchProvider {
  readonly id = 'mock' as const;

  async execute(
    request: ResearchRequest,
    tasks: ResearchTaskType[],
  ): Promise<ResearchResultPayload> {
    const evidence = buildEvidence(tasks, request);
    const sources = buildSources(request);

    return {
      summaryKey: 'result.summary',
      summaryParams: {
        project: request.projectTitle,
        tasks: tasks.length,
        industry: request.industry ?? 'general',
      },
      evidence,
      market: { insightKey: 'result.marketInsight', score: 72 },
      competitor: { insightKey: 'result.competitorInsight', count: 4 },
      government: { insightKey: 'result.governmentInsight', programs: 2 },
      sources,
      confidence: Math.min(95, 55 + evidence.length * 8 + tasks.length * 3),
    };
  }
}

export const mockResearchProvider = new MockResearchProvider();
