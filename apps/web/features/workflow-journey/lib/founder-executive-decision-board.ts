import type { StrategyPipelineResult } from '@repo/agents';

import { loadProjectRegistration } from '../components/project-registration-panel';
import type { CompetitiveIntelligenceBrief } from './founder-competitive-intelligence';
import type { ExplainableJudgment } from './founder-explainable-judgment';
import type { BusinessProgressDimension } from './founder-intelligence-engine';
import type { GeneratedTodayAction } from './founder-intelligence-engine';
import type { FounderBehaviorProfile } from './founder-behavior-store';

export type ExecutiveVerdict = 'GO' | 'HOLD' | 'NO_GO';

export type ExecutiveDecisionBoardData = {
  projectName: string;
  summary: {
    verdict: ExecutiveVerdict;
    scorePercent: number;
    stars: number;
    headline: string;
    caveat: string;
    todayAction: {
      id: string;
      title: string;
      impact: number;
      minutes: number;
    } | null;
  };
  why: Array<{
    key: string;
    stars: number;
    percent: number;
    summary: string;
    status: 'strong' | 'gap';
  }>;
  hypothesis: {
    statement: string;
    confidence: number;
    reasons: string[];
    falsifyItems: Array<{ key: string; checked: boolean }>;
  };
  competitorMatrix: {
    competitorNames: string[];
    rows: Array<{
      featureKey: string;
      us: string;
      them: string[];
    }>;
  };
  position: {
    ourLabel: string;
    points: Array<{ name: string; automation: number; isUs?: boolean }>;
  };
  strategy: Array<{
    key: 'pricing' | 'customer' | 'bm' | 'gtm';
    headline: string;
    detail: string;
  }>;
  execution: Array<{ id: string; title: string; impact: number }>;
  decisionTree: Array<{
    id: string;
    labelKey: string;
    status: 'verdict' | 'branch' | 'ok' | 'gap' | 'action';
    detail?: string;
  }>;
};

type BuildExecutiveDecisionBoardInput = {
  projectName: string;
  scorePercent: number;
  businessProgress: BusinessProgressDimension[];
  explainableJudgment: ExplainableJudgment;
  competitiveIntelligence: CompetitiveIntelligenceBrief;
  pipeline: StrategyPipelineResult | null;
  behavior: FounderBehaviorProfile | null;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function starsFromPercent(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

function starsDisplay(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

function resolveVerdict(
  pipeline: StrategyPipelineResult | null,
  scorePercent: number,
): ExecutiveVerdict {
  const raw = pipeline?.decision.verdict ?? (scorePercent >= 70 ? 'GO' : 'HOLD');
  if (raw === 'GO' || raw === 'HOLD' || raw === 'NO_GO') return raw;
  return scorePercent >= 70 ? 'GO' : 'HOLD';
}

function buildHypothesisStatement(
  projectName: string,
  competitiveIntelligence: CompetitiveIntelligenceBrief,
): string {
  const reg = loadProjectRegistration();
  const customer = reg?.targetMarket ?? '중소기업·1인 창업';
  const price = competitiveIntelligence.pricing.recommended;
  return `${customer} 대상으로 ${projectName}을(를) ${price}에 판매하면 성공 가능성이 가장 높습니다.`;
}

function buildDecisionTree(
  verdict: ExecutiveVerdict,
  why: ExecutiveDecisionBoardData['why'],
  todayAction: ExecutiveDecisionBoardData['summary']['todayAction'],
): ExecutiveDecisionBoardData['decisionTree'] {
  const market = why.find((w) => w.key === 'market');
  const pricing = why.find((w) => w.key === 'pricing');
  const competitor = why.find((w) => w.key === 'competitor');

  const nodes: ExecutiveDecisionBoardData['decisionTree'] = [
    { id: 'verdict', labelKey: verdict, status: 'verdict' },
    { id: 'why', labelKey: 'whyBranch', status: 'branch' },
  ];

  if (market) {
    nodes.push({
      id: 'market',
      labelKey: 'market',
      status: market.status === 'strong' ? 'ok' : 'gap',
      detail: market.summary,
    });
  }
  if (competitor) {
    nodes.push({
      id: 'competitor',
      labelKey: 'competitor',
      status: competitor.status === 'strong' ? 'ok' : 'gap',
      detail: competitor.summary,
    });
  }
  if (pricing) {
    nodes.push({
      id: 'pricing',
      labelKey: 'pricing',
      status: pricing.status === 'strong' ? 'ok' : 'gap',
      detail: pricing.summary,
    });
  }

  nodes.push({ id: 'therefore', labelKey: 'therefore', status: 'branch' });
  nodes.push({
    id: 'action',
    labelKey: todayAction?.title ?? 'validateNext',
    status: 'action',
    detail: todayAction ? `+${todayAction.impact}%` : undefined,
  });

  return nodes;
}

export function buildExecutiveDecisionBoardData(
  input: BuildExecutiveDecisionBoardInput,
): ExecutiveDecisionBoardData {
  const {
    projectName,
    scorePercent,
    explainableJudgment,
    competitiveIntelligence,
    pipeline,
    todayActions,
    resolveTitle,
  } = input;

  const verdict = resolveVerdict(pipeline, scorePercent);
  const stars = starsFromPercent(scorePercent);

  const whyKeys = ['market', 'competitor', 'pricing', 'mvp'] as const;
  const mvpPercent = clampPercent(
    ((explainableJudgment.validationCoverage.find((v) => v.key === 'mvp')?.percent ?? 0) +
      (explainableJudgment.validationCoverage.find((v) => v.key === 'customerProblem')?.percent ?? 0)) /
      2,
  );

  const why = whyKeys.map((key) => {
    if (key === 'mvp') {
      const starsCount = starsFromPercent(mvpPercent);
      return {
        key,
        stars: starsCount,
        percent: mvpPercent,
        summary:
          mvpPercent >= 55
            ? 'MVP·실행 준비 신호가 확인되었습니다.'
            : 'MVP와 실행 검증이 아직 부족합니다.',
        status: (mvpPercent >= 55 ? 'strong' : 'gap') as 'strong' | 'gap',
      };
    }
    const dimKey = key === 'competitor' ? 'competitor' : key;
    const dim = explainableJudgment.dimensions.find((d) => d.key === dimKey);
    return {
      key,
      stars: dim?.stars ?? starsFromPercent(40),
      percent: dim?.percent ?? 40,
      summary: dim?.summary ?? '',
      status: dim?.status ?? ('gap' as const),
    };
  });

  const primaryAction = todayActions[0];
  const todayAction = primaryAction
    ? {
        id: primaryAction.id,
        title: resolveTitle(primaryAction),
        impact: primaryAction.goImpact ?? 5,
        minutes: primaryAction.etaMinutes ?? 15,
      }
    : null;

  const weakest = why
    .filter((w) => w.status === 'gap')
    .sort((a, b) => a.percent - b.percent)[0];

  const headline =
    verdict === 'GO'
      ? '이 사업은 진행 가능합니다.'
      : verdict === 'HOLD'
        ? '조건부로 진행 가능합니다.'
        : '재검토가 필요합니다.';

  const caveat = weakest
    ? `${weakest.key === 'pricing' ? '가격 검증' : weakest.key === 'mvp' ? 'MVP 검증' : '핵심 검증'}만 완료하면 GO 확률이 크게 상승합니다.`
    : '현재 근거가 충분합니다. 실행 단계로 넘어갈 수 있습니다.';

  const competitorNames = competitiveIntelligence.competitors.slice(0, 2).map((c) => c.name);

  const competitorMatrix = {
    competitorNames,
    rows: [
      {
        featureKey: 'aiPm',
        us: starsDisplay(5),
        them: competitorNames.map(() => '없음'),
      },
      {
        featureKey: 'marketResearch',
        us: '자동',
        them: competitorNames.map(() => '수동'),
      },
      {
        featureKey: 'strategyRec',
        us: '자동',
        them: competitorNames.map(() => '없음'),
      },
      {
        featureKey: 'businessOps',
        us: '자동',
        them: competitorNames.map(() => '없음'),
      },
    ],
  };

  const hypothesis = {
    statement: buildHypothesisStatement(projectName, competitiveIntelligence),
    confidence: clampPercent(
      Math.round((scorePercent + explainableJudgment.dataCoveragePercent) / 2),
    ),
    reasons: [
      competitiveIntelligence.winStrategy.weCompeteOn,
      competitiveIntelligence.marketGap.gapLabel,
      competitiveIntelligence.strategy.headline,
    ].filter(Boolean),
    falsifyItems: [
      { key: 'price', checked: (why.find((w) => w.key === 'pricing')?.percent ?? 0) >= 55 },
      {
        key: 'purchaseIntent',
        checked:
          (explainableJudgment.dimensions.find((d) => d.key === 'customer')?.percent ?? 0) >= 55,
      },
      { key: 'retention', checked: mvpPercent >= 55 },
    ],
  };

  const strategy = [
    {
      key: 'pricing' as const,
      headline: competitiveIntelligence.pricing.recommended,
      detail: competitiveIntelligence.pricing.reason,
    },
    {
      key: 'customer' as const,
      headline: competitiveIntelligence.winStrategy.weCompeteOn,
      detail: competitiveIntelligence.marketGap.recommendation,
    },
    {
      key: 'bm' as const,
      headline: competitiveIntelligence.strategy.headline,
      detail: competitiveIntelligence.strategy.example,
    },
    {
      key: 'gtm' as const,
      headline: competitiveIntelligence.winStrategy.competitorCompetesOn,
      detail: competitiveIntelligence.strategy.body,
    },
  ];

  const execution = todayActions.slice(0, 3).map((action) => ({
    id: action.id,
    title: resolveTitle(action),
    impact: action.goImpact ?? 5,
  }));

  const summary = {
    verdict,
    scorePercent,
    stars,
    headline,
    caveat,
    todayAction,
  };

  return {
    projectName,
    summary,
    why,
    hypothesis,
    competitorMatrix,
    position: {
      ourLabel: competitiveIntelligence.ourIdeaLabel,
      points: competitiveIntelligence.positionMap.points.map((p) => ({
        name: p.name,
        automation: p.automation,
        isUs: p.isUs,
      })),
    },
    strategy,
    execution,
    decisionTree: buildDecisionTree(verdict, why, todayAction),
  };
}

export { starsDisplay };
