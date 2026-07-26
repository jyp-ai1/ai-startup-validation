import type { StrategyPipelineResult } from '@repo/agents';

import { loadFounderInformation } from './founder-information-store';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';
import { computeDataCoveragePercent } from './founder-research-trust';
import type { BusinessProgressDimension } from './founder-intelligence-engine';
import type { SuccessScoreFactor } from './founder-personalization-engine';

export type JudgmentDimensionKey =
  | 'market'
  | 'customer'
  | 'pricing'
  | 'competitor'
  | 'government';

export type ValidationCoverageKey =
  | 'market'
  | 'customerProblem'
  | 'pricing'
  | 'competitiveness'
  | 'mvp';

export type ValidationCoverageDimension = {
  key: ValidationCoverageKey;
  percent: number;
  stars: number;
};

export type ExplainableJudgmentDimension = {
  key: JudgmentDimensionKey;
  percent: number;
  stars: number;
  summary: string;
  status: 'strong' | 'gap';
};

export type ExplainableJudgment = {
  verdict: string;
  scorePercent: number;
  scoreBasisNote: string;
  dataCoveragePercent: number;
  validationCoverage: ValidationCoverageDimension[];
  strengths: SuccessScoreFactor[];
  gaps: SuccessScoreFactor[];
  dimensions: ExplainableJudgmentDimension[];
  providerId?: string;
};

const STRONG_THRESHOLD = 55;
const GAP_THRESHOLD = 45;

function confidenceToStars(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

function findingPercent(
  pipeline: StrategyPipelineResult | null,
  domain: string,
  fallback: number,
): number {
  const finding = pipeline?.research.findings.find((item) => item.domain === domain);
  return finding?.confidence ?? fallback;
}

function findingSummary(pipeline: StrategyPipelineResult | null, domain: string, fallback: string): string {
  const finding = pipeline?.research.findings.find((item) => item.domain === domain);
  if (finding?.summary) return finding.summary;
  return fallback;
}

function isMvpFilled(): boolean {
  const info = loadFounderInformation();
  const micro = loadFounderMicroAnswers();
  if (info.mvp?.trim()) return true;
  return Boolean(micro.hasMvp);
}

function buildValidationCoverage(
  pipeline: StrategyPipelineResult | null,
  businessProgress: BusinessProgressDimension[],
): ValidationCoverageDimension[] {
  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const marketPercent = Math.round(
    Math.max(
      findingPercent(pipeline, 'market', progress.market ?? 0),
      findingPercent(pipeline, 'trend', progress.market ?? 0),
    ),
  );
  const customerPercent = findingPercent(pipeline, 'customer', progress.customer ?? 0);
  const pricingPercent = findingPercent(pipeline, 'pricing', progress.pricing ?? 0);
  const competitorPercent = findingPercent(pipeline, 'competitor', progress.market ?? 0);
  const mvpPercent = isMvpFilled() ? Math.max(55, progress.customer ?? 40) : 18;

  return [
    { key: 'market', percent: marketPercent, stars: confidenceToStars(marketPercent) },
    { key: 'customerProblem', percent: customerPercent, stars: confidenceToStars(customerPercent) },
    { key: 'pricing', percent: pricingPercent, stars: confidenceToStars(pricingPercent) },
    { key: 'competitiveness', percent: competitorPercent, stars: confidenceToStars(competitorPercent) },
    { key: 'mvp', percent: mvpPercent, stars: confidenceToStars(mvpPercent) },
  ];
}

export function buildExplainableJudgment(
  pipeline: StrategyPipelineResult | null,
  scorePercent: number,
  businessProgress: BusinessProgressDimension[],
  factors: SuccessScoreFactor[],
): ExplainableJudgment {
  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const marketPercent = Math.round(
    Math.max(
      findingPercent(pipeline, 'market', progress.market ?? 0),
      findingPercent(pipeline, 'trend', progress.market ?? 0),
    ),
  );
  const customerPercent = findingPercent(pipeline, 'customer', progress.customer ?? 0);
  const pricingPercent = findingPercent(pipeline, 'pricing', progress.pricing ?? 0);
  const competitorPercent = findingPercent(pipeline, 'competitor', progress.market ?? 0);
  const governmentPercent = findingPercent(pipeline, 'government', progress.investment ?? 0);

  const dimensions: ExplainableJudgmentDimension[] = [
    {
      key: 'market',
      percent: marketPercent,
      stars: confidenceToStars(marketPercent),
      summary: findingSummary(
        pipeline,
        'market',
        '시장 규모와 성장 신호를 아직 더 확인해야 합니다.',
      ),
      status: marketPercent >= STRONG_THRESHOLD ? 'strong' : 'gap',
    },
    {
      key: 'customer',
      percent: customerPercent,
      stars: confidenceToStars(customerPercent),
      summary: findingSummary(
        pipeline,
        'customer',
        '고객 인터뷰와 VOC 깊이가 아직 부족합니다.',
      ),
      status: customerPercent >= STRONG_THRESHOLD ? 'strong' : 'gap',
    },
    {
      key: 'pricing',
      percent: pricingPercent,
      stars: confidenceToStars(pricingPercent),
      summary: findingSummary(
        pipeline,
        'pricing',
        '가격 가설과 지불 의향 검증이 필요합니다.',
      ),
      status: pricingPercent >= STRONG_THRESHOLD ? 'strong' : 'gap',
    },
    {
      key: 'competitor',
      percent: competitorPercent,
      stars: confidenceToStars(competitorPercent),
      summary: findingSummary(
        pipeline,
        'competitor',
        '경쟁사 대비 차별화 근거를 더 쌓아야 합니다.',
      ),
      status: competitorPercent >= STRONG_THRESHOLD ? 'strong' : 'gap',
    },
    {
      key: 'government',
      percent: governmentPercent,
      stars: confidenceToStars(governmentPercent),
      summary: findingSummary(
        pipeline,
        'government',
        '정부지원·비희석 런웨이 기회를 더 확인할 수 있습니다.',
      ),
      status: governmentPercent >= GAP_THRESHOLD ? 'strong' : 'gap',
    },
  ];

  const verdict = pipeline?.decision.verdict ?? 'HOLD';
  const strengths = factors.filter((factor) => factor.status === 'strong');
  const gaps = factors.filter((factor) => factor.status === 'gap');
  const validationCoverage = buildValidationCoverage(pipeline, businessProgress);
  const dataCoveragePercent = computeDataCoveragePercent(pipeline);

  return {
    verdict,
    scorePercent,
    scoreBasisNote: 'currentInfoBasis',
    dataCoveragePercent,
    validationCoverage,
    strengths,
    gaps,
    dimensions,
    providerId: pipeline?.research.providerId,
  };
}
