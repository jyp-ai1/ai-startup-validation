import type {
  AgentProjectContext,
  AgentProviderId,
  ResearchDomain,
  ResearchFinding,
  ResearchResult,
  ResearchSource,
} from '../../types';
import type { ResearchProviderPort } from '../../ports';

const DOMAIN_ORDER: ResearchDomain[] = [
  'market',
  'customer',
  'competitor',
  'trend',
  'pricing',
  'government',
  'investment',
];

function buildSources(context: AgentProjectContext): ResearchSource[] {
  return [
    {
      id: 'src-market-1',
      title: `${context.industry ?? 'Industry'} market report`,
      url: 'https://example.com/market',
      sourceType: 'REPORT',
    },
    {
      id: 'src-gov-1',
      title: 'Government startup support portal',
      sourceType: 'GOVERNMENT',
    },
    {
      id: 'src-news-1',
      title: 'Sector trend analysis',
      sourceType: 'NEWS',
    },
    {
      id: 'src-db-1',
      title: 'Competitive landscape database',
      sourceType: 'DATABASE',
    },
  ];
}

function findingForDomain(domain: ResearchDomain, context: AgentProjectContext): ResearchFinding {
  const base = context.projectTitle;
  const map: Record<ResearchDomain, ResearchFinding> = {
    market: {
      domain,
      title: 'Market size & growth',
      summary: `${base}: addressable market shows double-digit growth with early validation signals.`,
      confidence: 72,
      sourceIds: ['src-market-1'],
    },
    customer: {
      domain,
      title: 'Customer demand signals',
      summary: 'Primary ICP shows pain around speed and AI-assisted validation; VOC depth still limited.',
      confidence: 58,
      sourceIds: ['src-news-1'],
    },
    competitor: {
      domain,
      title: 'Competitive landscape',
      summary: '4 direct competitors identified; differentiation via AI PM operating loop is plausible.',
      confidence: 65,
      sourceIds: ['src-db-1'],
    },
    trend: {
      domain,
      title: 'Market trends',
      summary: 'AI-native startup tools and founder OS category accelerating; timing favorable.',
      confidence: 70,
      sourceIds: ['src-news-1', 'src-market-1'],
    },
    pricing: {
      domain,
      title: 'Pricing benchmarks',
      summary: 'Comparable SaaS $29–99/mo; willingness-to-pay interviews still needed.',
      confidence: 52,
      sourceIds: ['src-market-1'],
    },
    government: {
      domain,
      title: 'Government programs',
      summary: '2 relevant R&D and early-stage grants identified for AI/software ventures.',
      confidence: 68,
      sourceIds: ['src-gov-1'],
    },
    investment: {
      domain,
      title: 'Investment landscape',
      summary: 'Seed-stage interest in AI workflow tools; traction + VOC depth required for IR.',
      confidence: 60,
      sourceIds: ['src-market-1', 'src-news-1'],
    },
  };
  return map[domain];
}

export class MockResearchProvider implements ResearchProviderPort {
  readonly id: AgentProviderId = 'mock';

  async research(context: AgentProjectContext): Promise<ResearchResult> {
    const sources = buildSources(context);
    const findings = DOMAIN_ORDER.map((d) => findingForDomain(d, context));
    const avg = findings.reduce((s, f) => s + f.confidence, 0) / findings.length;

    return {
      findings,
      sources,
      overallConfidence: Math.round(avg),
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockResearchProvider = new MockResearchProvider();
