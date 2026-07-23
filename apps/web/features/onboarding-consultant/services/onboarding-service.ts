import type { OnboardingAnswers, OnboardingContext, OnboardingResearchPlanItem } from '../types';

export function buildOnboardingSummary(answers: OnboardingAnswers): string {
  return [
    `검증 목표: ${answers.validation}`,
    `주요 고객: ${answers.targetCustomer}`,
    `경쟁사: ${answers.competitors || '미정'}`,
    `우려: ${answers.concern}`,
    `최종 목표: ${answers.finalGoal}`,
  ].join('\n');
}

export function buildResearchPlanItems(answers: OnboardingAnswers): OnboardingResearchPlanItem[] {
  const items: OnboardingResearchPlanItem[] = [
    {
      id: 'market',
      titleKey: 'plans.market.title',
      categoryKey: 'plans.market.category',
      researchType: 'MARKET_SIZE',
      priority: 'HIGH',
      rank: 1,
    },
    {
      id: 'competitor',
      titleKey: 'plans.competitor.title',
      categoryKey: 'plans.competitor.category',
      researchType: 'COMPETITOR',
      priority: answers.concern === 'COMPETITION' ? 'HIGH' : 'MEDIUM',
      rank: 2,
    },
    {
      id: 'voc',
      titleKey: 'plans.voc.title',
      categoryKey: 'plans.voc.category',
      researchType: 'CUSTOMER',
      priority: 'HIGH',
      rank: 3,
    },
    {
      id: 'government',
      titleKey: 'plans.government.title',
      categoryKey: 'plans.government.category',
      researchType: 'REGULATION',
      priority:
        answers.concern === 'GOVERNMENT' || answers.finalGoal === 'GOVERNMENT_GRANT'
          ? 'HIGH'
          : 'LOW',
      rank: 4,
    },
    {
      id: 'technology',
      titleKey: 'plans.technology.title',
      categoryKey: 'plans.technology.category',
      researchType: 'TECHNOLOGY',
      priority: answers.concern === 'TECHNOLOGY' || answers.finalGoal === 'AI_ADOPTION' ? 'HIGH' : 'MEDIUM',
      rank: 5,
    },
    {
      id: 'business',
      titleKey: 'plans.investment.title',
      categoryKey: 'plans.investment.category',
      researchType: 'BUSINESS_MODEL',
      priority:
        answers.concern === 'REVENUE' || answers.concern === 'INVESTMENT' || answers.finalGoal === 'FUNDRAISING'
          ? 'HIGH'
          : 'MEDIUM',
      rank: 6,
    },
  ];

  return items.sort((a, b) => {
    const priorityScore = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const diff = priorityScore[a.priority] - priorityScore[b.priority];
    return diff !== 0 ? diff : a.rank - b.rank;
  });
}

const RESEARCH_PLAN_TITLES: Record<string, { title: string; description: string }> = {
  market: { title: 'Market sizing analysis', description: 'TAM/SAM/SOM and demand signals' },
  competitor: { title: 'Competitive landscape', description: 'Direct and indirect competitor mapping' },
  voc: { title: 'Customer VOC research', description: 'Target customer pain points and intent' },
  government: { title: 'Government grant scan', description: 'Eligible programs and deadlines' },
  technology: { title: 'Technology feasibility', description: 'Build vs buy and technical risks' },
  business: { title: 'Business model & investment', description: 'Unit economics and fundraising readiness' },
};

export function getResearchPlanCopy(itemId: string): { title: string; description: string } {
  return RESEARCH_PLAN_TITLES[itemId] ?? { title: 'Research plan', description: 'Validation research' };
}

export function isOnboardingComplete(context: OnboardingContext | null | undefined): boolean {
  return context?.status === 'completed';
}

export function parseOnboardingContext(raw: unknown): OnboardingContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<OnboardingContext>;
  if (!value.answers || !value.summary || !value.completedAt) return null;
  return {
    status: value.status === 'completed' ? 'completed' : 'in_progress',
    answers: value.answers as OnboardingAnswers,
    summary: value.summary,
    completedAt: value.completedAt,
  };
}
