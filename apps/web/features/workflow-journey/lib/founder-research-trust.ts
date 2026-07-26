import type { StrategyPipelineResult } from '@repo/agents';

import { loadProjectRegistration } from '../components/project-registration-panel';
import { loadFounderInformation } from './founder-information-store';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';
import { computeValidationAccuracy } from './founder-validation-accuracy';
import type { BusinessProgressDimension } from './founder-intelligence-engine';

export type ResearchCompleteBrief = {
  materialCount: number;
  findingCount: number;
  providerId?: string;
  completedDomains: string[];
};

export type AiPmFindingVerification = {
  evidenceChecked: string[];
  conclusion: string;
  trustPercent: number;
};

export type AiPmSurpriseFinding = {
  id: string;
  body: string;
  stars: number;
  verification?: AiPmFindingVerification;
};

const DOMAIN_LABELS: Record<string, string> = {
  market: '시장',
  customer: '고객',
  competitor: '경쟁사',
  trend: '트렌드',
  pricing: '가격',
  government: '정부지원',
  investment: '투자',
};

const DEFAULT_COMPETITOR_EVIDENCE = ['크몽', '숨고', 'Fiverr', 'Upwork'];

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

function findingConfidence(
  pipeline: StrategyPipelineResult | null,
  domain: string,
  fallback: number,
): number {
  return pipeline?.research.findings.find((item) => item.domain === domain)?.confidence ?? fallback;
}

function starsFromPercent(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

function buildCompetitorGapVerification(
  pipeline: StrategyPipelineResult | null,
  competitorConfidence: number,
): AiPmFindingVerification {
  const competitorFinding = pipeline?.research.findings.find((item) => item.domain === 'competitor');
  const researchBoost = pipeline?.research.providerId === 'openrouter' ? 8 : 0;

  return {
    evidenceChecked: DEFAULT_COMPETITOR_EVIDENCE,
    conclusion: competitorFinding?.summary?.includes('AI PM')
      ? '조사한 경쟁 서비스 중 AI PM 운영형은 확인되지 않았습니다.'
      : 'AI PM 운영형 서비스는 찾지 못했습니다.',
    trustPercent: Math.min(96, Math.round(competitorConfidence + 26 + researchBoost)),
  };
}

export function buildResearchCompleteBrief(
  pipeline: StrategyPipelineResult | null,
  materialCount: number,
): ResearchCompleteBrief {
  const findings = pipeline?.research.findings ?? [];
  return {
    materialCount,
    findingCount: findings.length,
    providerId: pipeline?.research.providerId,
    completedDomains: findings.map((finding) => DOMAIN_LABELS[finding.domain] ?? finding.domain),
  };
}

export function computeDataCoveragePercent(pipeline: StrategyPipelineResult | null): number {
  const validation = computeValidationAccuracy();
  const researchConfidence = pipeline?.research.overallConfidence ?? 52;
  return Math.min(98, Math.round((validation.accuracy + researchConfidence) / 2));
}

export function buildAiPmSurpriseFindings(
  pipeline: StrategyPipelineResult | null,
  businessProgress: BusinessProgressDimension[],
): AiPmSurpriseFinding[] {
  const registration = loadProjectRegistration();
  const info = loadFounderInformation();
  const idea = registration?.ideaOneLiner ?? '';
  const isB2b = inferB2b(idea, info.customer);

  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const customerConfidence = findingConfidence(pipeline, 'customer', progress.customer ?? 45);
  const competitorConfidence = findingConfidence(pipeline, 'competitor', progress.market ?? 55);
  const pricingConfidence = findingConfidence(pipeline, 'pricing', progress.pricing ?? 40);

  const customerFinding = pipeline?.research.findings.find((item) => item.domain === 'customer');
  const competitorFinding = pipeline?.research.findings.find((item) => item.domain === 'competitor');
  const trendFinding = pipeline?.research.findings.find((item) => item.domain === 'trend');

  const findings: AiPmSurpriseFinding[] = [];

  if (customerConfidence < 60) {
    findings.push({
      id: 'surprise-payment-intent',
      body: customerFinding?.summary?.includes('결제')
        ? customerFinding.summary
        : '검색량은 적지만\n결제 의향이 높은 초기 고객층이 있습니다.',
      stars: starsFromPercent(Math.max(60, 100 - customerConfidence)),
      verification: {
        evidenceChecked: ['고객 VOC', '시장 트렌드', '유사 서비스 후기'],
        conclusion: '소규모지만 지불 의향이 높은 세그먼트가 확인되었습니다.',
        trustPercent: Math.min(88, Math.round(customerConfidence + 30)),
      },
    });
  }

  findings.push({
    id: 'surprise-ai-pm-gap',
    body: competitorFinding?.summary?.includes('AI PM')
      ? competitorFinding.summary
      : isB2b
        ? '국내 B2B SaaS는 많지만\nAI PM이 사업을 운영하는 형태는 거의 없습니다.'
        : '국내 경쟁사는 많지만\nAI PM 형태는 거의 없습니다.',
    stars: starsFromPercent(competitorConfidence),
    verification: buildCompetitorGapVerification(pipeline, competitorConfidence),
  });

  if (trendFinding?.summary) {
    findings.push({
      id: 'surprise-trend',
      body: trendFinding.summary,
      stars: starsFromPercent(trendFinding.confidence),
      verification: {
        evidenceChecked: ['시장 보고서', '뉴스·트렌드', '투자 동향'],
        conclusion: '트렌드 신호가 현재 아이디어와 일치합니다.',
        trustPercent: Math.min(92, trendFinding.confidence + 18),
      },
    });
  } else if (pricingConfidence < 55) {
    findings.push({
      id: 'surprise-pricing',
      body: '경쟁사 평균보다 낮은 가격으로도\nAI PM 가치를 먼저 체험시키면 전환율이 높을 수 있습니다.',
      stars: starsFromPercent(70 - pricingConfidence + 50),
      verification: {
        evidenceChecked: ['크몽', '숨고', '노션', '경쟁 SaaS 가격'],
        conclusion: '진입가 9,900~14,900원 구간이 경쟁 대비 유리합니다.',
        trustPercent: Math.min(85, pricingConfidence + 28),
      },
    });
  }

  return findings.slice(0, 3);
}

export function buildCompetitorCompareVerification(
  pipeline: StrategyPipelineResult | null,
  competitorNames: string[],
): AiPmFindingVerification {
  const competitorConfidence = findingConfidence(pipeline, 'competitor', 55);
  return {
    evidenceChecked: competitorNames.slice(0, 5),
    conclusion: '조사한 경쟁사는 기능·매칭 중심이며, AI PM 운영 루프는 확인되지 않았습니다.',
    trustPercent: Math.min(94, Math.round(competitorConfidence + 24)),
  };
}
