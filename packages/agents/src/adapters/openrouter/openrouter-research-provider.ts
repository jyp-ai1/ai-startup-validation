import {
  chatService,
  getAIPlatform,
  isProviderConfigured,
  promptBuilder,
  resolveDefaultModel,
} from '@repo/ai';
import { Logger } from '@repo/core/logger';

import { mockResearchProvider } from '../mock/mock-research-provider';
import type { ResearchProviderPort } from '../../ports';
import type {
  AgentProjectContext,
  AgentProviderId,
  ResearchDomain,
  ResearchFinding,
  ResearchResult,
  ResearchSource,
} from '../../types';

const DOMAIN_ORDER: ResearchDomain[] = [
  'market',
  'customer',
  'competitor',
  'trend',
  'pricing',
  'government',
  'investment',
];

type ResearchAgentJson = {
  findings?: Array<{
    domain?: ResearchDomain;
    title?: string;
    summary?: string;
    confidence?: number;
    sourceIds?: string[];
  }>;
  sources?: Array<{
    id?: string;
    title?: string;
    url?: string;
    sourceType?: ResearchSource['sourceType'];
  }>;
  overallConfidence?: number;
};

function normalizeSources(parsed: ResearchAgentJson): ResearchSource[] {
  if (parsed.sources?.length) {
    return parsed.sources.map((source, index) => ({
      id: source.id ?? `src-or-${index + 1}`,
      title: source.title ?? 'Research source',
      url: source.url,
      sourceType: source.sourceType ?? 'WEB',
    }));
  }

  return [
    {
      id: 'src-or-1',
      title: 'OpenRouter market research',
      sourceType: 'REPORT',
    },
  ];
}

export class OpenRouterResearchProvider implements ResearchProviderPort {
  readonly id: AgentProviderId = 'openrouter';
  private readonly logger = new Logger({ namespace: 'OpenRouterResearchProvider' });

  async research(context: AgentProjectContext): Promise<ResearchResult> {
    if (!isProviderConfigured('openrouter')) {
      this.logger.warn('OpenRouter not configured — falling back to mock research');
      return mockResearchProvider.research(context);
    }

    getAIPlatform();

    const messages = promptBuilder.buildMessages(
      {
        projectTitle: context.projectTitle,
        projectSummary: context.ideaSummary,
        industry: context.industry,
        tasks: DOMAIN_ORDER.join(','),
        locale: context.locale ?? 'ko',
      },
      'research',
      'v2',
    );

    try {
      const response = await chatService.chat({
        model: resolveDefaultModel('openrouter'),
        messages,
        temperature: 0.3,
        maxTokens: 1400,
        responseFormat: { type: 'json_object' },
      });

      let parsed: ResearchAgentJson = {};
      try {
        parsed = JSON.parse(response.content) as ResearchAgentJson;
      } catch {
        parsed = { overallConfidence: 55 };
      }

      const sources = normalizeSources(parsed);
      const mockFallback = await mockResearchProvider.research(context);
      const mockByDomain = Object.fromEntries(
        mockFallback.findings.map((finding) => [finding.domain, finding]),
      ) as Record<ResearchDomain, ResearchFinding>;

      const findings: ResearchFinding[] = DOMAIN_ORDER.map((domain) => {
        const fromLlm = parsed.findings?.find((item) => item.domain === domain);
        if (fromLlm?.summary) {
          return {
            domain,
            title: fromLlm.title ?? mockByDomain[domain].title,
            summary: fromLlm.summary,
            confidence: Math.min(
              95,
              Math.max(20, fromLlm.confidence ?? mockByDomain[domain].confidence),
            ),
            sourceIds: fromLlm.sourceIds?.length
              ? fromLlm.sourceIds
              : [sources[0]?.id ?? mockByDomain[domain].sourceIds[0] ?? 'src-or-1'],
          };
        }
        return mockByDomain[domain];
      });

      const avg =
        findings.reduce((sum, finding) => sum + finding.confidence, 0) / findings.length;

      return {
        findings,
        sources: sources.length > 0 ? sources : mockFallback.sources,
        overallConfidence: Math.round(parsed.overallConfidence ?? avg),
        completedAt: new Date().toISOString(),
        providerId: this.id,
      };
    } catch (error) {
      this.logger.error('OpenRouter research failed — falling back to mock', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return mockResearchProvider.research(context);
    }
  }
}

export const openRouterResearchProvider = new OpenRouterResearchProvider();
