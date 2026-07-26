import type { FounderBehaviorProfile } from './founder-behavior-store';
import type { LivingStuckAlert } from './founder-living-project';
import type {
  BusinessProgressDimension,
  FounderDailyReview,
  GeneratedTodayAction,
} from './founder-intelligence-engine';
import type { WeeklyCeoReview } from './founder-personalization-engine';

export type HealthStatus = 'green' | 'yellow' | 'red';

export type CeoDashboardDimension = {
  key: 'market' | 'customer' | 'product' | 'pricing' | 'investment';
  status: HealthStatus;
  percent: number;
};

export type CeoDashboardBrief = {
  dimensions: CeoDashboardDimension[];
  weeklyProgress: number;
  topRiskKey: string;
  topRiskParams?: Record<string, string | number>;
};

export type CompanyMemoryEntry = {
  id: string;
  month: number;
  messageKey: string;
};

export type CompanyMemoryBrief = {
  entries: CompanyMemoryEntry[];
  recallMessageKey: string;
};

export type DecisionCenterBrief = {
  flowSteps: string[];
  verdict: 'GO' | 'HOLD' | 'NO';
  confidence: number;
  meetingNotes: string[];
};

export type SimulatorScenario = {
  id: string;
  labelKey: string;
  price: number;
  customers: number;
  revenue: number;
  riskKey: string;
};

export type BusinessSimulatorBrief = {
  basePrice: number;
  scenarios: SimulatorScenario[];
};

export type BoardMemberOpinion = {
  roleKey: string;
  opinionKey: string;
  vote: 'go' | 'hold' | 'no';
};

export type AiBoardBrief = {
  opinions: BoardMemberOpinion[];
  goVotes: number;
  holdVotes: number;
  verdict: 'GO' | 'HOLD';
};

export type CustomerIntelligenceBrief = {
  sourceCounts: { voc: number; reviews: number; interviews: number; search: number; sns: number };
  weeklyInsightKey: string;
};

export type GrowthRecommendation = {
  id: string;
  channelKey: string;
  count: number;
  unitKey: string;
};

export type GrowthEngineBrief = {
  recommendations: GrowthRecommendation[];
};

export type FundraisingOsBrief = {
  readinessKeys: string[];
  investorCheckKey: string;
  readinessPercent: number;
};

export type CompanyOsHorizon = {
  key: 'today' | 'week' | 'month' | 'quarter' | 'year';
  percent: number;
};

export type CompanyOsBrief = {
  horizons: CompanyOsHorizon[];
  quarterGoalPercent: number;
};

export type AutonomousCompanyBrief = {
  completedSteps: string[];
  pendingApprovalTitle: string;
  pendingActionId?: string;
};

export type PredictiveInsight = {
  id: string;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type PredictiveCompanyBrief = {
  insights: PredictiveInsight[];
};

export type FounderTwinBrief = {
  decisionsLearned: number;
  goProbability: number;
  recommendationKey: string;
  recommendationParams?: Record<string, string | number>;
};

export type AiOperatingSystemBrief = {
  ceoDashboard: CeoDashboardBrief;
  companyMemory: CompanyMemoryBrief;
  decisionCenter: DecisionCenterBrief;
  businessSimulator: BusinessSimulatorBrief;
  aiBoard: AiBoardBrief;
  customerIntelligence: CustomerIntelligenceBrief;
  growthEngine: GrowthEngineBrief;
  fundraisingOs: FundraisingOsBrief;
  companyOs: CompanyOsBrief;
  autonomousCompany: AutonomousCompanyBrief;
  predictiveCompany: PredictiveCompanyBrief;
  founderTwin: FounderTwinBrief;
};

function healthFromPercent(percent: number): HealthStatus {
  if (percent >= 58) return 'green';
  if (percent >= 32) return 'yellow';
  return 'red';
}

function progressPercent(progress: BusinessProgressDimension[], key: string): number {
  return progress.find((item) => item.key === key)?.percent ?? 0;
}

function resolveTopRisk(
  progress: BusinessProgressDimension[],
  stuck: LivingStuckAlert,
): { key: string; params?: Record<string, string | number> } {
  if (stuck.show && stuck.areaMessageKey === 'pricingStuck') {
    return { key: 'pricingValidation' };
  }
  const weakest = [...progress].sort((a, b) => a.percent - b.percent)[0];
  const map: Record<string, string> = {
    market: 'marketValidation',
    customer: 'customerValidation',
    pricing: 'pricingValidation',
    investment: 'investmentPrep',
  };
  return { key: map[weakest?.key ?? 'pricing'] ?? 'pricingValidation' };
}

export function buildCeoDashboardBrief(input: {
  progress: BusinessProgressDimension[];
  weeklyReview: WeeklyCeoReview;
  stuck: LivingStuckAlert;
}): CeoDashboardBrief {
  const market = progressPercent(input.progress, 'market');
  const customer = progressPercent(input.progress, 'customer');
  const pricing = progressPercent(input.progress, 'pricing');
  const investment = progressPercent(input.progress, 'investment');
  const product = Math.round((market + customer) / 2);

  const risk = resolveTopRisk(input.progress, input.stuck);

  return {
    dimensions: [
      { key: 'market', status: healthFromPercent(market), percent: market },
      { key: 'customer', status: healthFromPercent(customer), percent: customer },
      { key: 'product', status: healthFromPercent(product), percent: product },
      { key: 'pricing', status: healthFromPercent(pricing), percent: pricing },
      { key: 'investment', status: healthFromPercent(investment), percent: investment },
    ],
    weeklyProgress: Math.max(0, input.weeklyReview.scoreDelta),
    topRiskKey: risk.key,
    topRiskParams: risk.params,
  };
}

export function buildCompanyMemoryBrief(
  behavior: FounderBehaviorProfile | null,
): CompanyMemoryBrief {
  const now = new Date();
  const month = now.getMonth() + 1;
  const entries: CompanyMemoryEntry[] = [
    { id: 'm-idea', month: Math.max(1, month - 3), messageKey: 'ideaStart' },
    { id: 'm-interview', month: Math.max(1, month - 2), messageKey: 'firstInterview' },
    { id: 'm-mvp', month: Math.max(1, month - 1), messageKey: 'mvp' },
    { id: 'm-customer', month, messageKey: 'firstCustomer' },
  ];

  const recallMessageKey =
    behavior?.deferredGapKeys.some((gap) => gap.includes('pricing'))
      ? 'samePricingConcern'
      : 'sameMarketConcern';

  return { entries, recallMessageKey };
}

export function buildDecisionCenterBrief(input: {
  scorePercent: number;
  todayActions: GeneratedTodayAction[];
}): DecisionCenterBrief {
  const confidence = Math.min(95, Math.max(55, input.scorePercent + 8));
  const verdict: DecisionCenterBrief['verdict'] =
    confidence >= 75 ? 'GO' : confidence >= 55 ? 'HOLD' : 'NO';

  return {
    flowSteps: ['research', 'marketing', 'finance', 'strategy', 'ceo'],
    verdict,
    confidence,
    meetingNotes: ['marketSignal', 'customerGap', 'pricingNext'],
  };
}

export function buildBusinessSimulatorBrief(
  progress: BusinessProgressDimension[],
): BusinessSimulatorBrief {
  const basePrice = progressPercent(progress, 'pricing') >= 30 ? 19900 : 14900;
  return {
    basePrice,
    scenarios: [
      {
        id: 'a',
        labelKey: 'scenarioA',
        price: basePrice,
        customers: 120,
        revenue: basePrice * 120,
        riskKey: 'lowRisk',
      },
      {
        id: 'b',
        labelKey: 'scenarioB',
        price: basePrice + 5000,
        customers: 80,
        revenue: (basePrice + 5000) * 80,
        riskKey: 'mediumRisk',
      },
      {
        id: 'c',
        labelKey: 'scenarioC',
        price: basePrice - 3000,
        customers: 180,
        revenue: (basePrice - 3000) * 180,
        riskKey: 'highVolumeRisk',
      },
    ],
  };
}

export function buildAiBoardBrief(scorePercent: number): AiBoardBrief {
  const goVotes = scorePercent >= 70 ? 5 : scorePercent >= 55 ? 4 : 3;
  const holdVotes = 7 - goVotes;
  return {
    opinions: [
      { roleKey: 'ceo', opinionKey: 'ceoGo', vote: 'go' },
      { roleKey: 'cto', opinionKey: 'ctoHold', vote: 'hold' },
      { roleKey: 'cmo', opinionKey: 'cmoGo', vote: 'go' },
      { roleKey: 'cfo', opinionKey: 'cfoHold', vote: 'hold' },
      { roleKey: 'coo', opinionKey: 'cooGo', vote: 'go' },
      { roleKey: 'investor', opinionKey: 'investorGo', vote: 'go' },
      { roleKey: 'customer', opinionKey: 'customerGo', vote: 'go' },
    ],
    goVotes,
    holdVotes,
    verdict: goVotes >= 4 ? 'GO' : 'HOLD',
  };
}

export function buildCustomerIntelligenceBrief(
  behavior: FounderBehaviorProfile | null,
): CustomerIntelligenceBrief {
  const interviews =
    behavior?.actionHistory.filter(
      (entry) =>
        entry.kind.includes('interview') ||
        entry.kind.includes('voc') ||
        entry.kind.includes('customer'),
    ).length ?? 0;

  return {
    sourceCounts: {
      voc: Math.max(2, interviews),
      reviews: 4 + (interviews > 0 ? 2 : 0),
      interviews,
      search: 6,
      sns: 3,
    },
    weeklyInsightKey: interviews >= 2 ? 'speedOverPrice' : 'priceSensitivity',
  };
}

export function buildGrowthEngineBrief(): GrowthEngineBrief {
  return {
    recommendations: [
      { id: 'blog', channelKey: 'blog', count: 3, unitKey: 'posts' },
      { id: 'sns', channelKey: 'sns', count: 5, unitKey: 'posts' },
      { id: 'email', channelKey: 'email', count: 1, unitKey: 'campaigns' },
    ],
  };
}

export function buildFundraisingOsBrief(progress: BusinessProgressDimension[]): FundraisingOsBrief {
  const avg = Math.round(
    progress.reduce((sum, item) => sum + item.percent, 0) / Math.max(progress.length, 1),
  );
  return {
    readinessKeys: ['irDeck', 'financials', 'marketStory', 'competitorMap'],
    investorCheckKey: avg >= 60 ? 'investorReadySoon' : 'investorNeedsProof',
    readinessPercent: Math.min(88, avg + 12),
  };
}

export function buildCompanyOsBrief(input: {
  progress: BusinessProgressDimension[];
  dailyReview: FounderDailyReview;
  scorePercent: number;
}): CompanyOsBrief {
  const avg = Math.round(
    input.progress.reduce((sum, item) => sum + item.percent, 0) /
      Math.max(input.progress.length, 1),
  );
  return {
    horizons: [
      { key: 'today', percent: Math.min(100, avg * 0.4 + input.dailyReview.scoreDelta * 3) },
      { key: 'week', percent: Math.min(100, avg * 0.55 + 8) },
      { key: 'month', percent: Math.min(100, avg * 0.7 + 5) },
      { key: 'quarter', percent: Math.min(100, avg * 0.85) },
      { key: 'year', percent: Math.min(100, input.scorePercent) },
    ],
    quarterGoalPercent: Math.min(100, Math.round(avg * 0.74 + 10)),
  };
}

export function buildAutonomousCompanyBrief(input: {
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): AutonomousCompanyBrief {
  const primary = input.todayActions[0];
  return {
    completedSteps: ['research', 'analysis', 'plan', 'executionPrep'],
    pendingApprovalTitle: primary ? input.resolveTitle(primary) : '가격 인터뷰 3명',
    pendingActionId: primary?.id,
  };
}

export function buildPredictiveCompanyBrief(
  progress: BusinessProgressDimension[],
): PredictiveCompanyBrief {
  const pricing = progressPercent(progress, 'pricing');
  return {
    insights: [
      { id: 'competition', messageKey: 'competitionIntensifies', params: { months: 3 } },
      { id: 'grant', messageKey: 'grantProbability', params: { percent: 74 } },
      {
        id: 'pricing',
        messageKey: pricing < 40 ? 'priceIncreaseRecommend' : 'priceHoldRecommend',
      },
    ],
  };
}

export function buildFounderTwinBrief(input: {
  behavior: FounderBehaviorProfile | null;
  scorePercent: number;
}): FounderTwinBrief {
  const completed = input.behavior?.completedActionIds.length ?? 0;
  const decisionsLearned = Math.max(12, completed * 7 + (input.behavior?.visitCount ?? 1) * 3);
  const goProbability = Math.min(92, Math.max(48, input.scorePercent - 5 + completed));

  return {
    decisionsLearned,
    goProbability,
    recommendationKey: goProbability >= 70 ? 'likelyGo' : 'likelyHold',
    recommendationParams: { percent: goProbability },
  };
}

export function buildAiOperatingSystemBrief(input: {
  behavior: FounderBehaviorProfile | null;
  progress: BusinessProgressDimension[];
  weeklyReview: WeeklyCeoReview;
  dailyReview: FounderDailyReview;
  scorePercent: number;
  stuck: LivingStuckAlert;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): AiOperatingSystemBrief {
  return {
    ceoDashboard: buildCeoDashboardBrief({
      progress: input.progress,
      weeklyReview: input.weeklyReview,
      stuck: input.stuck,
    }),
    companyMemory: buildCompanyMemoryBrief(input.behavior),
    decisionCenter: buildDecisionCenterBrief({
      scorePercent: input.scorePercent,
      todayActions: input.todayActions,
    }),
    businessSimulator: buildBusinessSimulatorBrief(input.progress),
    aiBoard: buildAiBoardBrief(input.scorePercent),
    customerIntelligence: buildCustomerIntelligenceBrief(input.behavior),
    growthEngine: buildGrowthEngineBrief(),
    fundraisingOs: buildFundraisingOsBrief(input.progress),
    companyOs: buildCompanyOsBrief({
      progress: input.progress,
      dailyReview: input.dailyReview,
      scorePercent: input.scorePercent,
    }),
    autonomousCompany: buildAutonomousCompanyBrief({
      todayActions: input.todayActions,
      resolveTitle: input.resolveTitle,
    }),
    predictiveCompany: buildPredictiveCompanyBrief(input.progress),
    founderTwin: buildFounderTwinBrief({
      behavior: input.behavior,
      scorePercent: input.scorePercent,
    }),
  };
}
