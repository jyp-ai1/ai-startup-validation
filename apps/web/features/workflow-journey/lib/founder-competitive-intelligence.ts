import type { StrategyPipelineResult } from '@repo/agents';

import { loadProjectRegistration } from '../components/project-registration-panel';
import { loadFounderInformation } from './founder-information-store';
import type { BusinessProgressDimension } from './founder-intelligence-engine';

export type CompetitorProfile = {
  id: string;
  rank: number;
  name: string;
  price: string;
  features: string;
  target: string;
  pros: string;
  cons: string;
};

export type CompetitiveIntelligenceBrief = {
  competitors: CompetitorProfile[];
  marketGap: {
    saturatedLabel: string;
    gapLabel: string;
    gapStars: number;
    recommendation: string;
  };
  positionMap: {
    ourIdea: string;
    ourAutomation: number;
    ourPrice: number;
    points: Array<{ name: string; automation: number; price: number; isUs?: boolean }>;
  };
  pricing: {
    average: string;
    recommended: string;
    entry: string;
    reason: string;
  };
  strategy: {
    headline: string;
    body: string;
    example: string;
  };
  winStrategy: {
    competitorCompetesOn: string;
    weCompeteOn: string;
    positionStars: number;
  };
  differentiationStars: number;
  ourIdeaLabel: string;
};

const DEFAULT_COMPETITORS: Omit<CompetitorProfile, 'rank'>[] = [
  {
    id: 'kmong',
    name: '크몽',
    price: '건당 5,000~50,000원',
    features: '외주·자동화 마켓플레이스',
    target: '1인 창업·프리랜서',
    pros: '빠른 실행·검증된 수요',
    cons: 'AI PM·전략 루프 없음',
  },
  {
    id: 'soomgo',
    name: '숨고',
    price: '월 19,000~39,000원',
    features: '로컬 서비스 매칭',
    target: '소상공·전문가',
    pros: '고객 매칭 인프라',
    cons: 'AI PM 기능 없음',
  },
  {
    id: 'notion',
    name: '노션',
    price: '월 10,000~18,000원',
    features: '문서·협업·위키',
    target: '팀·스타트업',
    pros: '유연한 워크스페이스',
    cons: '창업 검증·전략 자동화 부재',
  },
  {
    id: 'idus',
    name: '아이디어스',
    price: '수수료 15~20%',
    features: '메이커 커뮤니티·판매',
    target: '수공예·메이커',
    pros: '초기 고객 커뮤니티',
    cons: 'AI PM·사업 운영 루프 없음',
  },
  {
    id: 'startup-toolkit',
    name: '스타트업 툴킷',
    price: '무료~29,000원',
    features: '체크리스트·템플릿',
    target: '예비창업자',
    pros: '진입 장벽 낮음',
    cons: '실시간 AI PM 없음',
  },
];

function inferB2b(idea: string, customer?: string): boolean {
  const haystack = `${idea} ${customer ?? ''}`.toLowerCase();
  return (
    haystack.includes('b2b') ||
    haystack.includes('기업') ||
    haystack.includes('saas') ||
    haystack.includes('팀') ||
    haystack.includes('enterprise')
  );
}

function findingText(pipeline: StrategyPipelineResult | null, domain: string, fallback: string): string {
  return pipeline?.research.findings.find((item) => item.domain === domain)?.summary ?? fallback;
}

function findingConfidence(pipeline: StrategyPipelineResult | null, domain: string, fallback: number): number {
  return pipeline?.research.findings.find((item) => item.domain === domain)?.confidence ?? fallback;
}

function starsFromPercent(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

export function buildCompetitiveIntelligence(
  pipeline: StrategyPipelineResult | null,
  businessProgress: BusinessProgressDimension[],
): CompetitiveIntelligenceBrief {
  const registration = loadProjectRegistration();
  const info = loadFounderInformation();
  const idea = registration?.ideaOneLiner ?? '우리 아이디어';
  const ourIdeaLabel = idea.length > 28 ? `${idea.slice(0, 28)}…` : idea;
  const isB2b = inferB2b(idea, info.customer);

  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const competitorConfidence = findingConfidence(pipeline, 'competitor', progress.market ?? 55);
  const pricingConfidence = findingConfidence(pipeline, 'pricing', progress.pricing ?? 40);
  const differentiationPercent = Math.round(
    Math.max(progress.market ?? 0, competitorConfidence, 100 - (progress.pricing ?? 50)),
  );

  const competitors: CompetitorProfile[] = DEFAULT_COMPETITORS.map((profile, index) => ({
    ...profile,
    rank: index + 1,
  }));

  const pricingReason = findingText(
    pipeline,
    'pricing',
    '경쟁사 평균 대비 진입 장벽을 낮추고, AI PM 가치를 빠르게 체험하게 합니다.',
  );

  return {
    competitors,
    marketGap: {
      saturatedLabel: isB2b ? '대기업 SaaS' : '범용 생산성 툴',
      gapLabel: isB2b ? '1인 B2B 창업' : '1인 창업 · AI PM',
      gapStars: starsFromPercent(Math.max(competitorConfidence, differentiationPercent)),
      recommendation: isB2b
        ? 'B2B SaaS + AI PM 운영 루프로 대기업 툴과 다른 포지션을 잡으세요.'
        : '1인 창업자를 위한 AI PM 회사 경험으로 공백을 공략하세요.',
    },
    positionMap: {
      ourIdea: ourIdeaLabel,
      ourAutomation: 88,
      ourPrice: 42,
      points: [
        { name: ourIdeaLabel, automation: 88, price: 42, isUs: true },
        { name: '크몽', automation: 35, price: 55 },
        { name: '숨고', automation: 28, price: 62 },
        { name: '노션', automation: 45, price: 48 },
        { name: '스타트업 툴킷', automation: 22, price: 25 },
      ],
    },
    pricing: {
      average: '19,000원',
      recommended: '14,900원',
      entry: '9,900원',
      reason: pricingReason,
    },
    strategy: {
      headline: '기능을 판매하지 말고, 결과를 판매하세요.',
      body: '경쟁사는 기능·템플릿을 판매합니다.\n\n대표님은 AI PM이 사업을 운영하는 결과를 판매하세요.',
      example: 'AI PM이\n시장조사 → 전략 → 실행\n까지 대신합니다.',
    },
    winStrategy: {
      competitorCompetesOn: isB2b ? '기능·대시보드' : '예약·매칭 기능',
      weCompeteOn: 'AI PM 운영',
      positionStars: starsFromPercent(Math.max(competitorConfidence, differentiationPercent)),
    },
    differentiationStars: starsFromPercent(differentiationPercent),
    ourIdeaLabel,
  };
}
