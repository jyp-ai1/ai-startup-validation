import type { StrategyPipelineResult } from '@repo/agents';

import type { ExplainableJudgment } from './founder-explainable-judgment';
import type { BusinessProgressDimension } from './founder-intelligence-engine';
import type { GeneratedTodayAction } from './founder-intelligence-engine';

export type MeetingVerdictKey = 'GO' | 'GO_CONDITIONAL' | 'WAIT' | 'PIVOT' | 'NO_GO';

export type AiPmMeetingBrief = {
  narrativeLines: string[];
  verdictKey: MeetingVerdictKey;
  strengthSummary: string;
  gapSummary: string;
  scorePercent: number;
};

export type DecisionOptionId = 'pricing' | 'interview' | 'recommended';

export type DecisionOption = {
  id: DecisionOptionId;
  actionId?: string;
  isRecommended: boolean;
};

export type AiPmDecisionBox = {
  primaryGap: DecisionOptionId;
  options: DecisionOption[];
  recommendedActionTitle: string;
};

export type RecommendationFactorKey =
  | 'marketViability'
  | 'differentiation'
  | 'executionDifficulty'
  | 'marketRisk';

export type RecommendationFactor = {
  key: RecommendationFactorKey;
  level: 'high' | 'medium' | 'low';
  stars: number;
};

export type AiPmRecommendationBrief = {
  overallStars: number;
  factors: RecommendationFactor[];
};

function starsFromPercent(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

function levelFromPercent(percent: number): 'high' | 'medium' | 'low' {
  if (percent >= 65) return 'high';
  if (percent >= 40) return 'medium';
  return 'low';
}

function resolveVerdictKey(
  pipeline: StrategyPipelineResult | null,
  scorePercent: number,
  hasGaps: boolean,
): MeetingVerdictKey {
  const raw = pipeline?.decision.verdict ?? 'HOLD';
  if (raw === 'NO_GO') return 'NO_GO';
  if (raw === 'PIVOT') return 'PIVOT';
  if (raw === 'GO' && hasGaps) return 'GO_CONDITIONAL';
  if (raw === 'GO') return 'GO';
  if (scorePercent >= 60 && hasGaps) return 'GO_CONDITIONAL';
  return 'WAIT';
}

function resolvePrimaryGap(
  businessProgress: BusinessProgressDimension[],
): DecisionOptionId {
  const byKey = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;
  const pricing = byKey.pricing ?? 30;
  const customer = byKey.customer ?? 30;
  return pricing <= customer ? 'pricing' : 'interview';
}

function pickActionForGap(
  gap: DecisionOptionId,
  actions: GeneratedTodayAction[],
): GeneratedTodayAction | undefined {
  const haystack = (action: GeneratedTodayAction) =>
    `${action.id} ${action.title}`.toLowerCase();

  if (gap === 'pricing') {
    return (
      actions.find((action) => haystack(action).includes('pric') || haystack(action).includes('가격')) ??
      actions[0]
    );
  }

  return (
    actions.find(
      (action) =>
        haystack(action).includes('interview') ||
        haystack(action).includes('voc') ||
        haystack(action).includes('고객'),
    ) ?? actions[0]
  );
}

export function buildAiPmMeetingBrief(
  pipeline: StrategyPipelineResult | null,
  judgment: ExplainableJudgment,
  businessProgress: BusinessProgressDimension[],
): AiPmMeetingBrief {
  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const marketPercent = judgment.validationCoverage.find((item) => item.key === 'market')?.percent ?? progress.market ?? 0;
  const customerPercent =
    judgment.validationCoverage.find((item) => item.key === 'customerProblem')?.percent ??
    progress.customer ??
    0;
  const pricingPercent =
    judgment.validationCoverage.find((item) => item.key === 'pricing')?.percent ?? progress.pricing ?? 0;

  const strengthSummary =
    marketPercent >= 55
      ? '시장성은 충분합니다.'
      : '시장 신호는 확인됐지만 추가 검증이 필요합니다.';

  const gapParts: string[] = [];
  if (pricingPercent < 50) gapParts.push('가격 전략');
  if (customerPercent < 50) gapParts.push('고객 인터뷰 데이터');
  const gapSummary =
    gapParts.length > 0
      ? `${gapParts.join('과 ')}가 부족합니다.`
      : (pipeline?.decision.intelligence?.gap ?? '실행 데이터를 더 쌓으면 판단이 더 정확해집니다.');

  const hasGaps = judgment.gaps.length > 0 || gapParts.length > 0;
  const verdictKey = resolveVerdictKey(pipeline, judgment.scorePercent, hasGaps);

  return {
    narrativeLines: [
      '대표님,\n오늘 조사 결과를 말씀드리겠습니다.',
      strengthSummary,
      `다만\n${gapSummary}`,
    ],
    verdictKey,
    strengthSummary,
    gapSummary,
    scorePercent: judgment.scorePercent,
  };
}

export function buildAiPmDecisionBox(
  pipeline: StrategyPipelineResult | null,
  businessProgress: BusinessProgressDimension[],
  primaryAction?: GeneratedTodayAction,
): AiPmDecisionBox {
  const actions = pipeline?.founderOs?.todayActions ?? [];
  const primaryGap = resolvePrimaryGap(businessProgress);

  const pricingAction = pickActionForGap('pricing', actions);
  const interviewAction = pickActionForGap('interview', actions);
  const recommended = primaryAction ?? actions[0];

  return {
    primaryGap,
    recommendedActionTitle: recommended?.title ?? 'AI PM 추천 업무',
    options: [
      {
        id: 'pricing',
        actionId: pricingAction?.id,
        isRecommended: recommended?.id === pricingAction?.id,
      },
      {
        id: 'interview',
        actionId: interviewAction?.id,
        isRecommended: recommended?.id === interviewAction?.id,
      },
      {
        id: 'recommended',
        actionId: recommended?.id,
        isRecommended: true,
      },
    ],
  };
}

export function buildAiPmRecommendationBrief(
  pipeline: StrategyPipelineResult | null,
  judgment: ExplainableJudgment,
  businessProgress: BusinessProgressDimension[],
): AiPmRecommendationBrief {
  const progress = Object.fromEntries(businessProgress.map((item) => [item.key, item.percent])) as Record<
    string,
    number
  >;

  const market =
    judgment.validationCoverage.find((item) => item.key === 'market')?.percent ?? progress.market ?? 55;
  const differentiation =
    judgment.validationCoverage.find((item) => item.key === 'competitiveness')?.percent ?? progress.market ?? 50;
  const mvp = judgment.validationCoverage.find((item) => item.key === 'mvp')?.percent ?? 20;
  const pricing = judgment.validationCoverage.find((item) => item.key === 'pricing')?.percent ?? progress.pricing ?? 40;

  const executionDifficulty = Math.round((100 - mvp + pricing) / 2);
  const marketRisk = Math.max(20, 100 - market);

  const factors: RecommendationFactor[] = [
    { key: 'marketViability', level: levelFromPercent(market), stars: starsFromPercent(market) },
    {
      key: 'differentiation',
      level: levelFromPercent(differentiation),
      stars: starsFromPercent(differentiation),
    },
    {
      key: 'executionDifficulty',
      level: levelFromPercent(100 - executionDifficulty),
      stars: starsFromPercent(100 - executionDifficulty),
    },
    {
      key: 'marketRisk',
      level: levelFromPercent(100 - marketRisk),
      stars: starsFromPercent(100 - marketRisk),
    },
  ];

  const avg = factors.reduce((sum, factor) => sum + factor.stars, 0) / factors.length;
  const researchBoost = pipeline?.research.providerId === 'openrouter' ? 0.3 : 0;
  const overallStars = Math.max(1, Math.min(5, Math.round(avg + researchBoost)));

  return { overallStars, factors };
}

export function buildMeetingCloseNarrative(
  meeting: AiPmMeetingBrief,
  decisionBox: AiPmDecisionBox,
): string[] {
  const verdictLine =
    meeting.verdictKey === 'GO' || meeting.verdictKey === 'GO_CONDITIONAL' ? 'GO' : meeting.verdictKey;

  return [
    '대표님',
    `오늘 판단은\n\n${verdictLine}${meeting.verdictKey === 'GO_CONDITIONAL' ? ' (조건부)' : ''} 입니다.`,
    `이유는\n\n${meeting.strengthSummary.replace(/\.$/, '')}기 때문입니다.`,
    meeting.gapSummary.includes('부족')
      ? `하지만\n\n${meeting.gapSummary.replace(/\.$/, '')}\n\n실패 확률이 커집니다.`
      : `다만\n\n${meeting.gapSummary}`,
    `그래서\n\n오늘은 이것 하나만 같이 해보겠습니다.\n\n${decisionBox.recommendedActionTitle}`,
  ];
}
