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
      title: '경쟁사 조사',
      summary:
        '크몽: 서비스 자동화·외주 마켓플레이스. 숨고: AI PM 기능 없음. 노션: 문서·협업 중심, 창업 검증 부재. 아이디어스: 메이커 커뮤니티, AI PM 없음.',
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
      title: '가격 벤치마크',
      summary: '경쟁사 평균 19,000원. 진입가 9,900원, 추천 14,900원. 고객 인터뷰로 검증 필요.',
      confidence: 52,
      sourceIds: ['src-market-1'],
    },
    government: {
      domain,
      title: '정부지원',
      summary: '예비창업패키지 신청 가능. 초기창업패키지 일정 확인 필요.',
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
