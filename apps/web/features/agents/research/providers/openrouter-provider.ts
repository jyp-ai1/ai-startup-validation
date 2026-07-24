import { chatService, promptBuilder, resolveDefaultModel } from '@repo/ai';

import type {
  GeneratedEvidenceItem,
  ResearchProvider,
  ResearchRequest,
  ResearchResultPayload,
  ResearchSource,
  ResearchTaskType,
} from '../services/research-agent-types';

type ResearchAgentJson = {
  summary?: string;
  confidence?: number;
  sources?: Array<{
    id?: string;
    title?: string;
    url?: string;
    sourceType?: ResearchSource['sourceType'];
  }>;
  evidence?: Array<{
    title?: string;
    summary?: string;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    category?: ResearchTaskType;
    sourceId?: string;
  }>;
  market?: { score?: number; insight?: string };
  competitor?: { count?: number; insight?: string };
  government?: { programs?: number; insight?: string };
};

function fallbackEvidence(tasks: ResearchTaskType[]): GeneratedEvidenceItem[] {
  return tasks.map((category, index) => ({
    id: `ai-ev-${index}`,
    titleKey: 'evidence.marketSize.title',
    summaryKey: 'evidence.marketSize.summary',
    title: `${category} insight`,
    summary: `AI-generated ${category.toLowerCase()} signal for validation.`,
    confidence: 'MEDIUM' as const,
    sourceId: 'src-ai-1',
    category,
  }));
}

function buildSources(parsed: ResearchAgentJson): ResearchSource[] {
  if (parsed.sources?.length) {
    return parsed.sources.map((source, index) => ({
      id: source.id ?? `src-${index + 1}`,
      titleKey: 'sources.industryReport',
      title: source.title ?? 'Research source',
      url: source.url,
      sourceType: source.sourceType ?? 'WEB',
    }));
  }

  return [
    {
      id: 'src-ai-1',
      titleKey: 'sources.industryReport',
      title: 'OpenRouter Gemini research',
      sourceType: 'WEB',
    },
  ];
}

export class OpenRouterResearchProvider implements ResearchProvider {
  readonly id = 'gemini' as const;

  async execute(
    request: ResearchRequest,
    tasks: ResearchTaskType[],
  ): Promise<ResearchResultPayload> {
    const messages = promptBuilder.buildMessages(
      {
        projectTitle: request.projectTitle,
        industry: request.industry ?? undefined,
        tasks: tasks.join(','),
        locale: request.language,
      },
      'research',
      'v2',
    );

    const response = await chatService.chat({
      model: resolveDefaultModel('openrouter'),
      messages,
      temperature: 0.3,
      maxTokens: 900,
      responseFormat: { type: 'json_object' },
    });

    let parsed: ResearchAgentJson = {};
    try {
      parsed = JSON.parse(response.content) as ResearchAgentJson;
    } catch {
      parsed = { summary: response.content.slice(0, 500), confidence: 55 };
    }

    const sources = buildSources(parsed);

    const evidence: GeneratedEvidenceItem[] =
      parsed.evidence?.map((item, index) => ({
        id: `ai-ev-${index}`,
        titleKey: 'evidence.marketSize.title',
        summaryKey: 'evidence.marketSize.summary',
        title: item.title ?? `${item.category ?? 'MARKET'} evidence`,
        summary: item.summary ?? 'AI-generated evidence item.',
        confidence: item.confidence ?? 'MEDIUM',
        sourceId: item.sourceId ?? sources[0]?.id ?? 'src-ai-1',
        category: item.category ?? 'MARKET',
      })) ?? fallbackEvidence(tasks);

    return {
      summaryKey: 'result.summary',
      summaryText: parsed.summary ?? response.content.slice(0, 280),
      summaryParams: {
        project: request.projectTitle,
        tasks: tasks.length,
        industry: request.industry ?? 'general',
      },
      evidence,
      market: {
        insightKey: 'result.marketInsight',
        insightText: parsed.market?.insight,
        score: parsed.market?.score ?? 65,
      },
      competitor: {
        insightKey: 'result.competitorInsight',
        insightText: parsed.competitor?.insight,
        count: parsed.competitor?.count ?? 2,
      },
      government: {
        insightKey: 'result.governmentInsight',
        insightText: parsed.government?.insight,
        programs: parsed.government?.programs ?? 1,
      },
      sources,
      confidence: Math.min(95, parsed.confidence ?? 60),
    };
  }
}

export const openRouterResearchProvider = new OpenRouterResearchProvider();
